import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { pageArgs, pageMeta } from '../../lib/pagination.js'
import { formatDate, parseDate, utcToday } from '../../lib/dates.js'

const { sql, empty } = Prisma

// How many billing periods fit in a month, to turn every plan into monthly recurring revenue.
const factorSql = sql`CASE p."billingPeriod"
  WHEN 'DAILY' THEN 30 WHEN 'WEEKLY' THEN 52.0 / 12 WHEN 'MONTHLY' THEN 1 WHEN 'YEARLY' THEN 1.0 / 12 END`

const num = (v) => Number(v ?? 0)
const round2 = (n) => Math.round(n * 100) / 100

// Default range is the current month to date.
export function resolveRange({ from, to }, today = utcToday()) {
  const end = to ? parseDate(to) : today
  const start = from ? parseDate(from) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
  return { from: start, to: end }
}

// Optional plan/customer filters, written against aliases s (Subscription) and i (Invoice).
function subFilters({ planId, customerId }) {
  return sql`${planId ? sql`AND s."planId" = ${planId}` : empty} ${customerId ? sql`AND s."customerId" = ${customerId}` : empty}`
}

export async function getSummary(query) {
  const today = utcToday()
  const { from, to } = resolveRange(query, today)
  const filters = subFilters(query)

  const [subs, revenue, invoiced, receivables, newSubs] = await Promise.all([
    // a subscription's recurring amount is the sum of its lines, falling back to the plan price
    prisma.$queryRaw`
      SELECT count(*)::int AS "activeSubscriptions",
             COALESCE(SUM(COALESCE(l.amount, p.price) * ${factorSql}), 0)::numeric(14,2) AS mrr
      FROM "Subscription" s
      JOIN "Plan" p ON p.id = s."planId"
      LEFT JOIN (
        SELECT "subscriptionId", SUM(quantity * "unitPrice") AS amount FROM "SubscriptionLine" GROUP BY "subscriptionId"
      ) l ON l."subscriptionId" = s.id
      WHERE s.status = 'ACTIVE' ${filters}`,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(pay.amount), 0)::numeric(14,2) AS amount, count(*)::int AS count
      FROM "Payment" pay
      JOIN "Invoice" i ON i.id = pay."invoiceId"
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE pay."paidAt" BETWEEN ${from}::date AND ${to}::date ${filters}`,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(i.total), 0)::numeric(14,2) AS amount, count(*)::int AS count,
             count(*) FILTER (WHERE i.status = 'PAID')::int AS paid
      FROM "Invoice" i
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE i.status IN ('CONFIRMED', 'PAID') AND i."issueDate" BETWEEN ${from}::date AND ${to}::date ${filters}`,
    // what is owed right now, independent of the date range
    prisma.$queryRaw`
      SELECT COALESCE(SUM(i.total - i."amountPaid"), 0)::numeric(14,2) AS outstanding,
             count(*)::int AS "outstandingCount",
             COALESCE(SUM(i.total - i."amountPaid") FILTER (WHERE i."dueDate" < ${today}::date), 0)::numeric(14,2) AS overdue,
             count(*) FILTER (WHERE i."dueDate" < ${today}::date)::int AS "overdueCount"
      FROM "Invoice" i
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE i.status = 'CONFIRMED' ${filters}`,
    prisma.$queryRaw`
      SELECT count(*)::int AS count FROM "Subscription" s
      WHERE s.status IN ('ACTIVE', 'PAUSED', 'CLOSED') AND s."startDate" BETWEEN ${from}::date AND ${to}::date ${filters}`,
  ])

  const mrr = num(subs[0].mrr)
  const revenueAmount = num(revenue[0].amount)
  const invoicedAmount = num(invoiced[0].amount)
  return {
    range: { from: formatDate(from), to: formatDate(to) },
    activeSubscriptions: subs[0].activeSubscriptions,
    newSubscriptions: newSubs[0].count,
    mrr,
    arr: round2(mrr * 12),
    revenue: revenueAmount,
    paymentsCount: revenue[0].count,
    invoiced: invoicedAmount,
    invoicesCount: invoiced[0].count,
    paidInvoices: invoiced[0].paid,
    collectionRate: invoicedAmount ? round2((revenueAmount / invoicedAmount) * 100) : null,
    outstanding: num(receivables[0].outstanding),
    outstandingCount: receivables[0].outstandingCount,
    overdue: num(receivables[0].overdue),
    overdueCount: receivables[0].overdueCount,
  }
}

export async function getCharts(query) {
  const today = utcToday()
  const { from, to } = resolveRange(query, today)
  const filters = subFilters(query)
  // monthly trend: the 12 months ending with the selected range
  const trendEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1))
  const trendStart = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 11, 1))

  const [monthly, byStatus, byMethod, aging, topOverdue] = await Promise.all([
    prisma.$queryRaw`
      WITH months AS (
        SELECT generate_series(${trendStart}::date, ${trendEnd}::date, interval '1 month')::date AS month
      ),
      collected AS (
        SELECT date_trunc('month', pay."paidAt")::date AS month, SUM(pay.amount) AS amount
        FROM "Payment" pay
        JOIN "Invoice" i ON i.id = pay."invoiceId"
        JOIN "Subscription" s ON s.id = i."subscriptionId"
        WHERE pay."paidAt" >= ${trendStart}::date AND pay."paidAt" < (${trendEnd}::date + interval '1 month') ${filters}
        GROUP BY 1
      ),
      billed AS (
        SELECT date_trunc('month', i."issueDate")::date AS month, SUM(i.total) AS amount
        FROM "Invoice" i
        JOIN "Subscription" s ON s.id = i."subscriptionId"
        WHERE i.status IN ('CONFIRMED', 'PAID')
          AND i."issueDate" >= ${trendStart}::date AND i."issueDate" < (${trendEnd}::date + interval '1 month') ${filters}
        GROUP BY 1
      )
      SELECT to_char(m.month, 'YYYY-MM') AS month,
             COALESCE(c.amount, 0)::numeric(14,2) AS collected,
             COALESCE(b.amount, 0)::numeric(14,2) AS invoiced
      FROM months m
      LEFT JOIN collected c ON c.month = m.month
      LEFT JOIN billed b ON b.month = m.month
      ORDER BY m.month`,
    prisma.$queryRaw`
      SELECT s.status::text AS status, count(*)::int AS count
      FROM "Subscription" s WHERE true ${filters}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT pay.method::text AS method, SUM(pay.amount)::numeric(14,2) AS amount, count(*)::int AS count
      FROM "Payment" pay
      JOIN "Invoice" i ON i.id = pay."invoiceId"
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE pay."paidAt" BETWEEN ${from}::date AND ${to}::date ${filters}
      GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw`
      SELECT CASE
               WHEN ${today}::date - i."dueDate" <= 30 THEN '1-30'
               WHEN ${today}::date - i."dueDate" <= 60 THEN '31-60'
               WHEN ${today}::date - i."dueDate" <= 90 THEN '61-90'
               ELSE '90+' END AS bucket,
             SUM(i.total - i."amountPaid")::numeric(14,2) AS amount, count(*)::int AS count
      FROM "Invoice" i
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE i.status = 'CONFIRMED' AND i."dueDate" < ${today}::date ${filters}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT c.id, c.name, SUM(i.total - i."amountPaid")::numeric(14,2) AS amount, count(*)::int AS invoices
      FROM "Invoice" i
      JOIN "Customer" c ON c.id = i."customerId"
      JOIN "Subscription" s ON s.id = i."subscriptionId"
      WHERE i.status = 'CONFIRMED' AND i."dueDate" < ${today}::date ${filters}
      GROUP BY c.id, c.name ORDER BY 3 DESC LIMIT 5`,
  ])

  const statuses = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED']
  const buckets = ['1-30', '31-60', '61-90', '90+']
  return {
    monthly: monthly.map((r) => ({ month: r.month, collected: num(r.collected), invoiced: num(r.invoiced) })),
    subscriptionsByStatus: statuses.map((status) => ({ status, count: byStatus.find((r) => r.status === status)?.count ?? 0 })),
    paymentsByMethod: byMethod.map((r) => ({ method: r.method, amount: num(r.amount), count: r.count })),
    aging: buckets.map((bucket) => {
      const row = aging.find((r) => r.bucket === bucket)
      return { bucket, amount: num(row?.amount), count: row?.count ?? 0 }
    }),
    topOverdueCustomers: topOverdue.map((r) => ({ id: r.id, name: r.name, amount: num(r.amount), invoices: r.invoices })),
  }
}

export async function getFilterOptions(search) {
  const [plans, customers] = await Promise.all([
    prisma.plan.findMany({ select: { id: true, name: true, billingPeriod: true }, orderBy: { name: 'asc' } }),
    prisma.customer.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 20,
    }),
  ])
  return { plans, customers }
}

export async function listAudit(query) {
  const where = {
    ...(query.action && { action: { startsWith: query.action } }),
    ...(query.entity && { entity: query.entity }),
    ...(query.entityId && { entityId: query.entityId }),
    ...(query.userId && { userId: query.userId }),
    ...((query.from || query.to) && {
      createdAt: {
        ...(query.from && { gte: parseDate(query.from) }),
        ...(query.to && { lt: new Date(parseDate(query.to).getTime() + 24 * 60 * 60 * 1000) }),
      },
    }),
  }
  const [rows, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { id: 'desc' },
      ...pageArgs(query),
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
  ])
  return { data: rows, meta: { ...pageMeta(query, total), actions: actions.map((a) => a.action) } }
}

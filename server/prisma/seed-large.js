// Large demo dataset for performance testing and the demo.
//
//   npm run db:seed:large            add 2,000 customers / 10,000 subscriptions with invoices + payments
//   npm run db:seed:large -- --reset remove a previous large seed first, then add it again
//
// Everything it creates uses @seed.example customer emails, so --reset only touches its own rows.
// Run `npx prisma db seed` first (it creates the plans, products and admin user this needs).
import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CUSTOMERS = 2000
const SUBSCRIPTIONS = 10000
const CHUNK = 2000
const DAY = 24 * 60 * 60 * 1000
const METHODS = ['BANK_TRANSFER', 'UPI', 'CARD', 'CASH', 'CHEQUE']

faker.seed(2026)
const rand = () => faker.number.float({ min: 0, max: 1, fractionDigits: 6 })
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const round2 = (n) => Math.round(n * 100) / 100
const addDays = (d, n) => new Date(d.getTime() + n * DAY)

function addPeriod(date, period, n = 1) {
  const d = new Date(date)
  if (period === 'DAILY') return addDays(d, n)
  if (period === 'WEEKLY') return addDays(d, 7 * n)
  if (period === 'MONTHLY') d.setUTCMonth(d.getUTCMonth() + n)
  if (period === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + n)
  return d
}

const now = new Date()
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

async function insertChunked(model, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma[model].createMany({ data: rows.slice(i, i + CHUNK) })
  }
}

async function reset() {
  const where = `c.email LIKE '%@seed.example'`
  console.log('Removing previous large seed...')
  await prisma.$executeRawUnsafe(`DELETE FROM "Payment" WHERE "invoiceId" IN (SELECT i.id FROM "Invoice" i JOIN "Customer" c ON c.id = i."customerId" WHERE ${where})`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Invoice" WHERE "customerId" IN (SELECT c.id FROM "Customer" c WHERE ${where})`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Subscription" WHERE "customerId" IN (SELECT c.id FROM "Customer" c WHERE ${where})`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Customer" c WHERE ${where}`)
  await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE action = 'seed.large'`)
}

async function maxId(table) {
  const rows = await prisma.$queryRawUnsafe(`SELECT COALESCE(MAX(id), 0)::int AS max FROM "${table}"`)
  return rows[0].max
}

async function resetSequence(table) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "${table}"), 1))`,
  )
}

// Numbers continue from the app's own counters so new records never collide.
async function loadCounters() {
  const counters = new Map((await prisma.counter.findMany()).map((c) => [c.key, c.value]))
  return {
    next(prefix, date) {
      const key = `${prefix}/${date.getUTCFullYear()}`
      const value = (counters.get(key) ?? 0) + 1
      counters.set(key, value)
      return `${key}/${String(value).padStart(5, '0')}`
    },
    async save() {
      for (const [key, value] of counters) {
        await prisma.counter.upsert({ where: { key }, create: { key, value }, update: { value } })
      }
    },
  }
}

function pickStatus() {
  const r = rand()
  if (r < 0.7) return 'ACTIVE'
  if (r < 0.82) return 'CLOSED'
  if (r < 0.86) return 'PAUSED'
  if (r < 0.89) return 'CONFIRMED'
  if (r < 0.93) return 'QUOTATION'
  return 'DRAFT'
}

function pickPlan(plans) {
  const r = rand()
  const name = r < 0.62 ? 'Monthly' : r < 0.9 ? 'Yearly' : 'Weekly'
  return plans.find((p) => p.name === name) ?? plans[0]
}

async function main() {
  if (process.argv.includes('--reset')) await reset()

  const existing = await prisma.customer.count({ where: { email: { endsWith: '@seed.example' } } })
  if (existing > 0) {
    console.log(`Large seed already present (${existing} customers). Re-run with --reset to rebuild it.`)
    return
  }

  const [plans, products, admin] = await Promise.all([
    prisma.plan.findMany(),
    prisma.product.findMany({ include: { taxes: true } }),
    prisma.user.findFirst({ where: { role: 'ADMIN' } }),
  ])
  if (!plans.length || !products.length || !admin) {
    throw new Error('Run `npx prisma db seed` first: plans, products and the admin user are missing')
  }

  const started = Date.now()
  const counters = await loadCounters()
  let customerId = await maxId('Customer')
  let subId = await maxId('Subscription')
  let lineId = await maxId('SubscriptionLine')
  let historyId = await maxId('SubscriptionStatusHistory')
  let invoiceId = await maxId('Invoice')
  let invoiceLineId = await maxId('InvoiceLine')
  let paymentId = await maxId('Payment')

  // ---- customers ----
  const customers = []
  for (let i = 0; i < CUSTOMERS; i++) {
    const name = faker.person.fullName()
    customers.push({
      id: ++customerId,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}.${i}@seed.example`,
      phone: faker.phone.number({ style: 'international' }),
      address: `${faker.company.name()}, ${faker.location.city()}`,
    })
  }
  await insertChunked('customer', customers)
  console.log(`  ${customers.length} customers`)

  // ---- subscriptions, lines, history, invoices, payments (built in memory, inserted in bulk) ----
  const subs = []
  const lines = []
  const history = []
  const invoices = []
  const invoiceLines = []
  const payments = []

  const path = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE']
  const taxRate = (product) => product.taxes.reduce((s, t) => s + (t.type === 'PERCENT' ? Number(t.rate) / 100 : 0), 0)

  for (let i = 0; i < SUBSCRIPTIONS; i++) {
    const plan = pickPlan(plans)
    const status = pickStatus()
    const customer = customers[Math.floor(rand() * customers.length)]
    const paymentTermDays = pick([7, 15, 30])

    // weekly plans are kept recent so one subscription doesn't produce a hundred invoices
    const maxPeriodsBack = plan.billingPeriod === 'WEEKLY' ? 20 : plan.billingPeriod === 'YEARLY' ? 2 : 24
    const periodsBack = ['DRAFT', 'QUOTATION', 'CONFIRMED'].includes(status) ? 0 : Math.floor(rand() * (maxPeriodsBack + 1))
    let startDate = addPeriod(today, plan.billingPeriod, -periodsBack)
    if (periodsBack === 0) startDate = addDays(today, Math.floor(rand() * 20) + 1)

    let billUntil = today
    let expiryDate = addPeriod(startDate, plan.billingPeriod, plan.billingPeriod === 'YEARLY' ? 3 : 24)
    if (status === 'CLOSED') {
      const endedAgo = Math.floor(rand() * Math.max(periodsBack, 1))
      expiryDate = addPeriod(today, plan.billingPeriod, -endedAgo)
      billUntil = expiryDate
    }
    if (status === 'PAUSED') billUntil = addPeriod(today, plan.billingPeriod, -Math.min(2, periodsBack))

    const lineCount = 1 + Math.floor(rand() * 3)
    const chosen = faker.helpers.arrayElements(products, Math.min(lineCount, products.length))
    const subLines = chosen.map((product) => ({ product, quantity: 1 + Math.floor(rand() * 12), unitPrice: Number(product.salesPrice) }))

    const subscriptionId = ++subId
    const number = counters.next('SUB', startDate)
    const statusPath = status === 'PAUSED' || status === 'CLOSED' ? [...path, status] : path.slice(0, path.indexOf(status) + 1)

    const periodStarts = []
    if (['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
      for (let p = startDate; p <= billUntil && p < expiryDate; p = addPeriod(p, plan.billingPeriod)) periodStarts.push(p)
    }

    subs.push({
      id: subscriptionId,
      number,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate,
      expiryDate,
      nextInvoiceDate: status === 'ACTIVE' && periodStarts.length ? addPeriod(periodStarts.at(-1), plan.billingPeriod) : null,
      quotationValidUntil: status === 'QUOTATION' ? addDays(today, 30) : null,
      paymentTermDays,
    })
    for (const l of subLines) {
      lines.push({ id: ++lineId, subscriptionId, productId: l.product.id, quantity: l.quantity, unitPrice: l.unitPrice })
    }
    statusPath.forEach((to, idx) => {
      history.push({ id: ++historyId, subscriptionId, fromStatus: idx ? statusPath[idx - 1] : null, toStatus: to, changedById: admin.id })
    })

    // per-period totals are the same every month for a subscription
    const computed = subLines.map((l) => {
      const base = round2(l.unitPrice * l.quantity)
      const tax = round2(base * taxRate(l.product))
      return { l, base, tax }
    })
    const subtotal = round2(computed.reduce((s, c) => s + c.base, 0))
    const taxTotal = round2(computed.reduce((s, c) => s + c.tax, 0))
    const total = round2(subtotal + taxTotal)

    for (const [idx, periodStart] of periodStarts.entries()) {
      const dueDate = addDays(periodStart, paymentTermDays)
      const isLatest = idx === periodStarts.length - 1
      const r = rand()
      let outcome
      if (isLatest && r < 0.12) outcome = 'DRAFT'
      else if (dueDate >= today) outcome = r < 0.3 ? 'PARTIAL' : r < 0.55 ? 'PAID' : 'OPEN'
      else outcome = r < 0.78 ? 'PAID' : r < 0.9 ? 'OPEN' : r < 0.98 ? 'PARTIAL' : 'CANCELLED'

      const amountPaid = outcome === 'PAID' ? total : outcome === 'PARTIAL' ? round2(total * (0.25 + rand() * 0.5)) : 0
      const invStatus = { PAID: 'PAID', OPEN: 'CONFIRMED', PARTIAL: 'CONFIRMED', DRAFT: 'DRAFT', CANCELLED: 'CANCELLED' }[outcome]
      const overdueUnpaid = invStatus === 'CONFIRMED' && dueDate < today
      const reminded = overdueUnpaid && rand() < 0.4

      const invId = ++invoiceId
      invoices.push({
        id: invId,
        number: counters.next('INV', periodStart),
        subscriptionId,
        customerId: customer.id,
        status: invStatus,
        periodStart,
        periodEnd: addDays(addPeriod(periodStart, plan.billingPeriod), -1),
        issueDate: periodStart,
        dueDate,
        subtotal,
        taxTotal,
        total,
        amountPaid,
        sentAt: invStatus === 'DRAFT' ? null : periodStart,
        reminderCount: reminded ? 1 + Math.floor(rand() * 2) : 0,
        lastReminderAt: reminded ? addDays(dueDate, 7) : null,
      })
      for (const c of computed) {
        invoiceLines.push({
          id: ++invoiceLineId,
          invoiceId: invId,
          productId: c.l.product.id,
          description: c.l.product.name,
          quantity: c.l.quantity,
          unitPrice: c.l.unitPrice,
          taxAmount: c.tax,
          discountAmount: 0,
          amount: round2(c.base + c.tax),
        })
      }

      if (amountPaid > 0) {
        const parts = outcome === 'PAID' && rand() < 0.2 ? [round2(total / 2), round2(total - round2(total / 2))] : [amountPaid]
        parts.forEach((amount, n) => {
          let paidAt = addDays(periodStart, Math.floor(rand() * (paymentTermDays + 5)) + n * 4)
          if (paidAt > today) paidAt = today
          payments.push({ id: ++paymentId, invoiceId: invId, method: pick(METHODS), amount, paidAt, note: n ? 'Second instalment' : null, recordedById: admin.id })
        })
      }
    }
  }

  console.log(`  generated ${subs.length} subscriptions, ${invoices.length} invoices, ${payments.length} payments in memory`)

  await insertChunked('subscription', subs)
  await insertChunked('subscriptionLine', lines)
  await insertChunked('subscriptionStatusHistory', history)
  console.log(`  inserted subscriptions (${lines.length} lines)`)
  await insertChunked('invoice', invoices)
  await insertChunked('invoiceLine', invoiceLines)
  await insertChunked('payment', payments)
  console.log(`  inserted invoices (${invoiceLines.length} lines) and payments`)

  await counters.save()
  for (const table of ['Customer', 'Subscription', 'SubscriptionLine', 'SubscriptionStatusHistory', 'Invoice', 'InvoiceLine', 'Payment']) {
    await resetSequence(table)
  }
  await prisma.auditLog.create({
    data: { userId: admin.id, action: 'seed.large', entity: 'Subscription', data: { subscriptions: subs.length, invoices: invoices.length, payments: payments.length } },
  })
  await prisma.$executeRawUnsafe('ANALYZE')

  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

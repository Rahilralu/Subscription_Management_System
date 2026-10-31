import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { nextNumber } from '../../lib/sequence.js'
import { sendMail } from '../../lib/mailer.js'
import { logAudit } from '../../lib/audit.js'
import { addDays, businessToday, toDateString } from '../../lib/dates.js'
import { escapeHtml, formatMoney } from '../../lib/format.js'
import { lineInclude, priceLines } from '../billing/invoice.pricing.js'
import { daysPaused, shiftForPause } from './pause.js'
import { planChangeProblem } from './plan-change.js'

const isCustomer = (user) => user.role === 'CUSTOMER'

const detailInclude = {
  customer: { select: { id: true, name: true, email: true } },
  plan: true,
  lines: { include: lineInclude, orderBy: { id: 'asc' } },
  history: { include: { changedBy: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
  invoices: {
    select: { id: true, number: true, status: true, periodStart: true, periodEnd: true, dueDate: true, total: true, amountPaid: true },
    orderBy: { periodStart: 'desc' },
  },
}

export function recordStatusChange(db, subscriptionId, fromStatus, toStatus, changedById, note) {
  return db.subscriptionStatusHistory.create({
    data: { subscriptionId, fromStatus, toStatus, changedById, note },
  })
}

async function findOrThrow(id, db = prisma) {
  const subscription = await db.subscription.findUnique({
    where: { id },
    include: { plan: true, customer: true, lines: { include: lineInclude, orderBy: { id: 'asc' } } },
  })
  if (!subscription) throw new HttpError(404, 'Subscription not found')
  return subscription
}

// turns the requested lines into rows with the price copied from the catalog at this moment
export async function buildLines(lines, plan) {
  const [products, variants] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: lines.map((line) => line.productId) }, active: true } }),
    prisma.productVariant.findMany({ where: { id: { in: lines.flatMap((line) => (line.variantId ? [line.variantId] : [])) } } }),
  ])

  return lines.map((line) => {
    const product = products.find((p) => p.id === line.productId)
    if (!product) throw new HttpError(400, `Product ${line.productId} was not found or is inactive`)

    const variant = line.variantId ? variants.find((v) => v.id === line.variantId) : null
    if (line.variantId && variant?.productId !== product.id) {
      throw new HttpError(400, `That option does not belong to ${product.name}`)
    }
    if (line.quantity < plan.minQuantity) {
      throw new HttpError(400, `${product.name}: the ${plan.name} plan needs a quantity of at least ${plan.minQuantity}`)
    }

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: line.quantity,
      unitPrice: product.salesPrice.plus(variant?.extraPrice ?? 0),
    }
  })
}

export async function findActivePlan(planId) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan?.active) throw new HttpError(400, 'Plan not found or inactive')
  return plan
}

const planEnd = (plan, startDate) => (plan.endDate && plan.endDate >= startDate ? plan.endDate : null)

export async function createSubscription(input, user, note) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } })
  if (!customer) throw new HttpError(400, 'Customer not found')

  const plan = await findActivePlan(input.planId)
  const lines = await buildLines(input.lines, plan)
  const startDate = input.startDate ?? businessToday()
  const expiryDate = input.expiryDate === undefined ? planEnd(plan, startDate) : input.expiryDate
  if (expiryDate && expiryDate < startDate) throw new HttpError(400, 'Expiry date cannot be before the start date')

  const created = await prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, 'SUB')
    return tx.subscription.create({
      data: {
        number,
        customerId: customer.id,
        planId: plan.id,
        startDate,
        expiryDate,
        quotationValidUntil: input.quotationValidUntil,
        paymentTermDays: input.paymentTermDays,
        notes: input.notes ?? null,
        lines: { create: lines },
        history: { create: { toStatus: 'DRAFT', changedById: user.sub, note } },
      },
    })
  })
  return getSubscription(created.id, user)
}

export async function createFromTemplate({ templateId, customerId, startDate }, user) {
  const template = await prisma.quotationTemplate.findUnique({ where: { id: templateId }, include: { lines: true } })
  if (!template) throw new HttpError(404, 'Template not found')
  if (template.lines.length === 0) throw new HttpError(400, 'This template has no products')

  return createSubscription(
    {
      customerId,
      planId: template.planId,
      startDate,
      notes: template.notes,
      quotationValidUntil: addDays(businessToday(), template.validityDays),
      lines: template.lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
    },
    user,
    `Created from template "${template.name}"`,
  )
}

export async function updateSubscription(id, input, user) {
  const subscription = await findOrThrow(id)
  if (!['DRAFT', 'QUOTATION'].includes(subscription.status)) {
    throw new HttpError(409, 'Only a draft or quotation can be edited')
  }

  const plan = input.planId && input.planId !== subscription.planId ? await findActivePlan(input.planId) : subscription.plan
  const lines = input.lines ? await buildLines(input.lines, plan) : undefined

  const startDate = input.startDate ?? subscription.startDate
  const expiryDate = input.expiryDate === undefined ? subscription.expiryDate : input.expiryDate
  if (expiryDate && expiryDate < startDate) throw new HttpError(400, 'Expiry date cannot be before the start date')

  await prisma.subscription.update({
    where: { id },
    data: {
      planId: plan.id,
      startDate: input.startDate,
      expiryDate: input.expiryDate,
      paymentTermDays: input.paymentTermDays,
      notes: input.notes,
      lines: lines && { deleteMany: {}, create: lines },
    },
  })
  return getSubscription(id, user)
}

export async function getSubscription(id, user) {
  const subscription = await prisma.subscription.findUnique({ where: { id }, include: detailInclude })
  const hidden = isCustomer(user) && (subscription?.customerId !== user.customerId || subscription.status === 'DRAFT')
  if (!subscription || hidden) throw new HttpError(404, 'Subscription not found')

  const pricing = await priceLines(prisma, subscription.lines, subscription.plan, businessToday())
  return { ...subscription, pricing }
}

export async function listSubscriptions(query, user) {
  const where = {
    status: query.status,
    customerId: query.customerId,
    OR: query.search
      ? [
          { number: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        ]
      : undefined,
  }

  if (isCustomer(user)) {
    if (!user.customerId) return { items: [], meta: { total: 0, page: query.page, pageSize: query.pageSize } }
    where.customerId = user.customerId
    where.status = query.status === 'DRAFT' ? { in: [] } : (query.status ?? { not: 'DRAFT' })
  }

  const [items, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, billingPeriod: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { id: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.subscription.count({ where }),
  ])
  return { items, meta: { total, page: query.page, pageSize: query.pageSize } }
}

// everything the "new subscription" form needs, so it does not depend on the catalog endpoints
export async function getFormOptions() {
  const [customers, plans, products, templates] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      where: { active: true },
      include: { variants: true, taxes: { where: { active: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.quotationTemplate.findMany({ include: { lines: true }, orderBy: { name: 'asc' } }),
  ])
  return { customers, plans, products, templates }
}

const actions = {
  'send-quotation': {
    label: 'send a quotation for',
    from: ['DRAFT', 'QUOTATION'],
    to: 'QUOTATION',
    data: (sub, today, input) => ({
      quotationValidUntil: input.validDays
        ? addDays(today, input.validDays)
        : sub.quotationValidUntil && sub.quotationValidUntil >= today
          ? sub.quotationValidUntil
          : addDays(today, 30),
    }),
  },
  confirm: {
    label: 'confirm',
    from: ['QUOTATION'],
    to: 'CONFIRMED',
    check: (sub, today) => {
      if (sub.quotationValidUntil && sub.quotationValidUntil < today) {
        throw new HttpError(409, 'This quotation has expired, send a new one first')
      }
    },
  },
  activate: {
    label: 'activate',
    from: ['CONFIRMED'],
    to: 'ACTIVE',
    data: (sub) => ({ nextInvoiceDate: sub.startDate }),
  },
  pause: {
    label: 'pause',
    from: ['ACTIVE'],
    to: 'PAUSED',
    check: (sub, today) => {
      if (!sub.plan.pausable) throw new HttpError(409, `The ${sub.plan.name} plan cannot be paused`)
      // resuming skips the paused time, so anything already due has to be invoiced first
      if (sub.nextInvoiceDate && sub.nextInvoiceDate <= today) {
        throw new HttpError(409, 'This subscription has invoices due, run billing before pausing it')
      }
    },
  },
  resume: {
    label: 'resume',
    from: ['PAUSED'],
    to: 'ACTIVE',
    // the paused time is neither billed nor used up: see shiftForPause
    data: (sub, today, input, { days }) => shiftForPause(sub, days),
  },
  close: {
    label: 'close',
    from: ['ACTIVE', 'PAUSED'],
    to: 'CLOSED',
    check: (sub) => {
      if (!sub.plan.closable) throw new HttpError(409, `The ${sub.plan.name} plan cannot be closed early`)
    },
    data: () => ({ nextInvoiceDate: null }),
  },
}

export const actionNames = Object.keys(actions)

// days since the subscription was last paused, as of today
async function daysPausedUntil(db, id, today) {
  const paused = await db.subscriptionStatusHistory.findFirst({
    where: { subscriptionId: id, toStatus: 'PAUSED' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { createdAt: true },
  })
  return paused ? daysPaused(businessToday(paused.createdAt), today) : 0
}

// Applies one status move. db is the prisma client or a transaction, so other modules
// (e.g. approving a customer request) can run it in the same transaction as their own change.
export async function transitionSubscription(db, id, action, userId, input = {}) {
  const rule = actions[action]
  const subscription = await findOrThrow(id, db)
  const today = businessToday()

  if (!rule.from.includes(subscription.status)) {
    throw new HttpError(409, `Cannot ${rule.label} a subscription that is ${subscription.status.toLowerCase()}`)
  }
  rule.check?.(subscription, today)

  const context = action === 'resume' ? { days: await daysPausedUntil(db, id, today) } : {}

  // matching on the old status stops two people changing it at the same moment
  const { count } = await db.subscription.updateMany({
    where: { id, status: subscription.status },
    data: { status: rule.to, ...rule.data?.(subscription, today, input, context) },
  })
  if (count === 0) throw new HttpError(409, 'Someone else just changed this subscription, reload and try again')

  if (subscription.status !== rule.to) {
    await recordStatusChange(db, id, subscription.status, rule.to, userId, input.note)
  }
}

export async function runAction(id, action, user, input = {}) {
  await prisma.$transaction((tx) => transitionSubscription(tx, id, action, user.sub, input))

  const result = await getSubscription(id, user)
  if (action !== 'send-quotation') return result
  return { ...result, emailSent: await emailQuotation(result) }
}

// Moves an active subscription to another plan from its next invoice. Nothing is charged or refunded
// for the current period, and the next billing run uses the new plan's billing period.
// db is the prisma client or a transaction, so approving a customer request can run it in its own transaction.
export async function changeSubscriptionPlan(db, id, planId, userId, input = {}) {
  const subscription = await findOrThrow(id, db)
  const newPlan = await db.plan.findUnique({ where: { id: planId } })
  if (!newPlan) throw new HttpError(400, 'Plan not found')

  const problem = planChangeProblem(subscription, newPlan, businessToday())
  if (problem) throw new HttpError(409, problem)

  // matching on the old plan and status stops two people changing it at the same moment
  const { count } = await db.subscription.updateMany({
    where: { id, status: 'ACTIVE', planId: subscription.planId },
    data: { planId: newPlan.id },
  })
  if (count === 0) throw new HttpError(409, 'Someone else just changed this subscription, reload and try again')

  // the status does not change, so the history shows an Active -> Active row that carries the explanation
  const note = `Plan changed from ${subscription.plan.name} to ${newPlan.name}, from the next invoice${input.note ? ` (${input.note})` : ''}`
  await recordStatusChange(db, id, 'ACTIVE', 'ACTIVE', userId, note)
  await logAudit(userId, 'subscription.plan_change', 'Subscription', id, { from: subscription.plan.name, to: newPlan.name }, db)
}

export async function changePlan(id, planId, user, input = {}) {
  await prisma.$transaction((tx) => changeSubscriptionPlan(tx, id, planId, user.sub, input))
  return getSubscription(id, user)
}

export async function renewSubscription(id, user) {
  const old = await findOrThrow(id)
  if (!old.plan.renewable) throw new HttpError(409, `The ${old.plan.name} plan cannot be renewed`)
  if (!['ACTIVE', 'PAUSED', 'CLOSED'].includes(old.status)) {
    throw new HttpError(409, `Cannot renew a subscription that is ${old.status.toLowerCase()}`)
  }

  const today = businessToday()
  const startDate = old.expiryDate && old.expiryDate >= today ? addDays(old.expiryDate, 1) : today

  return createSubscription(
    {
      customerId: old.customerId,
      planId: old.planId,
      startDate,
      paymentTermDays: old.paymentTermDays,
      notes: old.notes,
      lines: old.lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
    },
    user,
    `Renewal of ${old.number}`,
  )
}

// the quotation is already saved, so a mail problem is reported instead of failing the request
async function emailQuotation(subscription) {
  const { pricing } = subscription
  const rows = pricing.lines
    .map((line) => `<tr><td>${escapeHtml(line.description)}</td><td>${line.quantity}</td><td>${formatMoney(line.amount)}</td></tr>`)
    .join('')

  try {
    await sendMail({
      to: subscription.customer.email,
      subject: `Quotation ${subscription.number} from Brightloop`,
      html: `
        <p>Hello ${escapeHtml(subscription.customer.name)},</p>
        <p>Here is your quotation for the <b>${escapeHtml(subscription.plan.name)}</b> plan, starting ${toDateString(subscription.startDate)}.</p>
        <table border="1" cellpadding="6" cellspacing="0"><tr><th>Item</th><th>Qty</th><th>Amount (incl. tax)</th></tr>${rows}</table>
        <p><b>Total per ${subscription.plan.billingPeriod.toLowerCase()} period: ${formatMoney(pricing.total)}</b></p>
        ${subscription.quotationValidUntil ? `<p>This quotation is valid until ${toDateString(subscription.quotationValidUntil)}.</p>` : ''}
        <p>Log in at ${env.appUrl} to see it.</p>`,
    })
    return true
  } catch (err) {
    console.error(`Could not email quotation ${subscription.number}:`, err.message)
    return false
  }
}

import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { logAudit } from '../../lib/audit.js'
import { today } from '../../lib/dates.js'

// Every query here filters by customerId from the JWT. A record that belongs to someone else is a 404,
// so the response doesn't reveal that it exists.

const planSummary = { select: { id: true, name: true, billingPeriod: true, price: true, pausable: true } }

function linesTotal(lines) {
  return lines.reduce((sum, line) => sum.plus(new Prisma.Decimal(line.unitPrice).times(line.quantity)), new Prisma.Decimal(0))
}

export async function listSubscriptions(customerId) {
  const subscriptions = await prisma.subscription.findMany({
    // drafts are internal work in progress, customers only see what has been sent to them
    where: { customerId, status: { not: 'DRAFT' } },
    include: { plan: planSummary, lines: { select: { quantity: true, unitPrice: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return subscriptions.map(({ lines, ...sub }) => ({ ...sub, recurringTotal: linesTotal(lines) }))
}

export async function getSubscription(customerId, id) {
  const subscription = await prisma.subscription.findFirst({
    where: { id, customerId, status: { not: 'DRAFT' } },
    include: {
      plan: planSummary,
      lines: {
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { attribute: true, value: true } },
        },
      },
      history: { orderBy: { createdAt: 'asc' }, select: { fromStatus: true, toStatus: true, createdAt: true } },
      requests: { orderBy: { createdAt: 'desc' }, include: { plan: { select: { id: true, name: true } } } },
    },
  })
  if (!subscription) throw new HttpError(404, 'Subscription not found')
  return { ...subscription, recurringTotal: linesTotal(subscription.lines) }
}

export async function listInvoices(customerId, { status, overdue }) {
  const where = { customerId, status: status ?? { not: 'DRAFT' } }
  if (overdue) Object.assign(where, { status: 'CONFIRMED', dueDate: { lt: today() } })

  const invoices = await prisma.invoice.findMany({
    where,
    select: {
      id: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      total: true,
      amountPaid: true,
      subscription: { select: { id: true, number: true } },
    },
    orderBy: { issueDate: 'desc' },
  })
  return invoices.map(withOverdue)
}

export async function getInvoice(customerId, id) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, customerId, status: { not: 'DRAFT' } },
    include: {
      lines: true,
      payments: { select: { id: true, method: true, amount: true, paidAt: true } },
      subscription: { select: { id: true, number: true } },
    },
  })
  if (!invoice) throw new HttpError(404, 'Invoice not found')
  return withOverdue(invoice)
}

function withOverdue(invoice) {
  return { ...invoice, overdue: invoice.status === 'CONFIRMED' && invoice.dueDate < today() }
}

export async function createRequest(customerId, userId, subscriptionId, { type, planId, note }) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, customerId },
    include: { plan: true, requests: { where: { status: 'PENDING' }, select: { id: true } } },
  })
  if (!subscription) throw new HttpError(404, 'Subscription not found')
  if (subscription.status !== 'ACTIVE') throw new HttpError(400, 'Only active subscriptions can be changed')
  if (subscription.requests.length) throw new HttpError(409, 'This subscription already has a request waiting for review')

  if (type === 'PAUSE' && !subscription.plan.pausable) {
    throw new HttpError(400, `The ${subscription.plan.name} plan can't be paused`)
  }
  if (type === 'UPGRADE') {
    if (planId === subscription.planId) throw new HttpError(400, 'You are already on this plan')
    const plan = await prisma.plan.findFirst({ where: { id: planId, active: true } })
    if (!plan) throw new HttpError(400, 'That plan is not available')
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.subscriptionRequest.create({
      data: { subscriptionId, customerId, type, planId: type === 'UPGRADE' ? planId : null, note },
    })
    await logAudit(userId, 'request.create', 'SubscriptionRequest', request.id, { type, subscriptionId, planId }, tx)
    return request
  })
}

// plans a customer can ask to move to
export function listPlans() {
  return prisma.plan.findMany({
    where: { active: true },
    select: { id: true, name: true, price: true, billingPeriod: true },
    orderBy: { price: 'asc' },
  })
}

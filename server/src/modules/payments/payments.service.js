import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { audit } from '../../lib/audit.js'
import { pageArgs, pageMeta } from '../../lib/pagination.js'
import { parseDate, utcToday } from '../../lib/dates.js'
import { balanceOf, daysOverdue, overdueWhere, paymentState } from '../../lib/invoice-state.js'

const { Decimal } = Prisma

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))

// Customers only ever see their own records, whatever filter they send.
export function scopedCustomerId(user, requested) {
  if (user.role !== 'CUSTOMER') return requested
  if (!user.customerId) throw new HttpError(403, 'No customer account linked to this login')
  return user.customerId
}

// Lock the invoice row for the rest of the transaction, so two payments recorded at the
// same moment cannot both see the old balance and overpay it together.
async function lockInvoice(tx, invoiceId) {
  const rows = await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`
  if (!rows.length) throw new HttpError(404, 'Invoice not found')
  return tx.invoice.findUnique({ where: { id: invoiceId } })
}

function toInvoiceSummary(invoice, today = utcToday()) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    state: paymentState(invoice, today),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    balance: balanceOf(invoice),
    daysOverdue: daysOverdue(invoice, today),
    reminderCount: invoice.reminderCount,
    lastReminderAt: invoice.lastReminderAt,
    customer: invoice.customer ? { id: invoice.customer.id, name: invoice.customer.name, email: invoice.customer.email } : undefined,
    subscription: invoice.subscription ? { id: invoice.subscription.id, number: invoice.subscription.number } : undefined,
  }
}

export async function recordPayment(input, userId) {
  const amount = new Decimal(input.amount)
  const paidAt = input.paidAt ? parseDate(input.paidAt) : utcToday()

  return prisma.$transaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId)

    if (invoice.status === 'DRAFT') throw new HttpError(400, 'Confirm the invoice before recording a payment')
    if (invoice.status === 'CANCELLED') throw new HttpError(400, 'This invoice is cancelled')
    if (invoice.status === 'PAID') throw new HttpError(400, 'This invoice is already fully paid')

    const balance = balanceOf(invoice)
    if (amount.gt(balance)) {
      throw new HttpError(400, `Payment exceeds the outstanding balance of ${formatMoney(balance)}`, {
        fieldErrors: { amount: [`Maximum is ${balance.toFixed(2)}`] },
      })
    }

    const payment = await tx.payment.create({
      data: { invoiceId: invoice.id, method: input.method, amount, paidAt, note: input.note || null, recordedById: userId },
    })

    const amountPaid = invoice.amountPaid.plus(amount)
    const fullyPaid = amountPaid.eq(invoice.total)
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid, ...(fullyPaid && { status: 'PAID' }) },
    })

    await audit(tx, {
      userId,
      action: 'payment.recorded',
      entity: 'Invoice',
      entityId: invoice.id,
      data: { paymentId: payment.id, invoiceNumber: invoice.number, method: payment.method, amount, balanceAfter: balanceOf(updated) },
    })
    if (fullyPaid) {
      await audit(tx, { userId, action: 'invoice.paid', entity: 'Invoice', entityId: invoice.id, data: { invoiceNumber: invoice.number, total: invoice.total } })
    }

    return { payment, invoice: toInvoiceSummary(updated) }
  })
}

export async function voidPayment(paymentId, userId) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new HttpError(404, 'Payment not found')

    const invoice = await lockInvoice(tx, payment.invoiceId)
    await tx.payment.delete({ where: { id: payment.id } })
    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: invoice.amountPaid.minus(payment.amount),
        ...(invoice.status === 'PAID' && { status: 'CONFIRMED' }),
      },
    })

    await audit(tx, {
      userId,
      action: 'payment.voided',
      entity: 'Invoice',
      entityId: invoice.id,
      data: { payment, invoiceNumber: invoice.number },
    })

    return { invoice: toInvoiceSummary(updated) }
  })
}

const paymentInclude = {
  invoice: { select: { id: true, number: true, total: true, amountPaid: true, status: true, customer: { select: { id: true, name: true } } } },
  recordedBy: { select: { id: true, name: true } },
}

export async function listPayments(query, user) {
  const customerId = scopedCustomerId(user, query.customerId)
  const where = {
    ...(query.method && { method: query.method }),
    ...(query.invoiceId && { invoiceId: query.invoiceId }),
    ...((query.from || query.to) && {
      paidAt: { ...(query.from && { gte: parseDate(query.from) }), ...(query.to && { lte: parseDate(query.to) }) },
    }),
    ...((customerId || query.search) && {
      invoice: {
        ...(customerId && { customerId }),
        ...(query.search && {
          OR: [
            { number: { contains: query.search, mode: 'insensitive' } },
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
          ],
        }),
      },
    }),
  }

  const [rows, total, sum] = await Promise.all([
    prisma.payment.findMany({ where, include: paymentInclude, orderBy: [{ paidAt: 'desc' }, { id: 'desc' }], ...pageArgs(query) }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ])

  return { data: rows, meta: { ...pageMeta(query, total), totalAmount: sum._sum.amount ?? 0 } }
}

export async function listReceivables(query, user) {
  const customerId = scopedCustomerId(user, query.customerId)
  const today = utcToday()

  const stateWhere = {
    all: { status: { in: ['CONFIRMED', 'PAID'] } },
    paid: { status: 'PAID' },
    outstanding: { status: 'CONFIRMED' },
    overdue: overdueWhere(today),
  }[query.state]

  const where = {
    ...stateWhere,
    ...(customerId && { customerId }),
    ...((query.from || query.to) && {
      issueDate: { ...(query.from && { gte: parseDate(query.from) }), ...(query.to && { lte: parseDate(query.to) }) },
    }),
    ...(query.search && {
      OR: [
        { number: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ],
    }),
  }

  // oldest debt first when chasing money, newest first otherwise
  const orderBy = query.state === 'overdue' || query.state === 'outstanding'
    ? [{ dueDate: 'asc' }, { id: 'asc' }]
    : [{ issueDate: 'desc' }, { id: 'desc' }]

  const [rows, total, sums] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { id: true, name: true, email: true } }, subscription: { select: { id: true, number: true } } },
      orderBy,
      ...pageArgs(query),
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({ where, _sum: { total: true, amountPaid: true } }),
  ])

  const totalAmount = sums._sum.total ?? new Decimal(0)
  const paidAmount = sums._sum.amountPaid ?? new Decimal(0)
  return {
    data: rows.map((inv) => toInvoiceSummary(inv, today)),
    meta: { ...pageMeta(query, total), totalAmount, paidAmount, balance: new Decimal(totalAmount).minus(paidAmount) },
  }
}

export async function getInvoicePayments(invoiceId, user) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      subscription: { select: { id: true, number: true } },
      payments: { include: { recordedBy: { select: { id: true, name: true } } }, orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] },
    },
  })
  if (!invoice || (user.role === 'CUSTOMER' && invoice.customerId !== user.customerId)) {
    throw new HttpError(404, 'Invoice not found')
  }
  return { invoice: toInvoiceSummary(invoice), payments: invoice.payments }
}

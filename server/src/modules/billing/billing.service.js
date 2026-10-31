import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { nextNumber } from '../../lib/sequence.js'
import { sendMail } from '../../lib/mailer.js'
import { addDays, addPeriod, businessToday, toDateString } from '../../lib/dates.js'
import { escapeHtml, formatMoney } from '../../lib/format.js'
import { recordStatusChange } from '../subscriptions/subscriptions.service.js'
import { lineInclude, priceLines } from './invoice.pricing.js'
import { renderInvoicePdf } from './invoice.pdf.js'

// stops a subscription with a very old start date from creating hundreds of invoices in one run
const MAX_PERIODS_PER_RUN = 60

const invoiceDetailInclude = {
  customer: true,
  subscription: { select: { id: true, number: true } },
  lines: { orderBy: { id: 'asc' } },
  payments: { orderBy: [{ paidAt: 'asc' }, { id: 'asc' }] },
}

const withAmountDue = (invoice) => ({ ...invoice, amountDue: invoice.total.minus(invoice.amountPaid) })

// customers only ever see invoices that were issued to them
const CUSTOMER_VISIBLE = ['CONFIRMED', 'PAID']

/* ---------- billing run ---------- */

// creates the invoice for the next unbilled period of one subscription; null when nothing is due
async function billNextPeriod(subscriptionId, today) {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, lines: { include: lineInclude, orderBy: { id: 'asc' } } },
    })
    if (subscription?.status !== 'ACTIVE' || !subscription.nextInvoiceDate || subscription.nextInvoiceDate > today) {
      return null
    }
    if (subscription.lines.length === 0) throw new HttpError(409, 'The subscription has no products')

    const periodStart = subscription.nextInvoiceDate
    const naturalEnd = addDays(addPeriod(periodStart, subscription.plan.billingPeriod), -1)
    const expiry = subscription.expiryDate
    if (expiry && periodStart > expiry) {
      await tx.subscription.update({ where: { id: subscriptionId }, data: { nextInvoiceDate: null } })
      return null
    }
    const periodEnd = expiry && expiry < naturalEnd ? expiry : naturalEnd

    const pricing = await priceLines(tx, subscription.lines, today)
    const number = await nextNumber(tx, 'INV')
    const invoice = await tx.invoice.create({
      data: {
        number,
        subscriptionId,
        customerId: subscription.customerId,
        periodStart,
        periodEnd,
        issueDate: periodStart,
        dueDate: addDays(periodStart, subscription.paymentTermDays),
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        taxTotal: pricing.taxTotal,
        total: pricing.total,
        lines: { create: pricing.lines },
      },
    })

    for (const discountId of pricing.appliedDiscountIds) {
      await tx.discount.update({ where: { id: discountId }, data: { usedCount: { increment: 1 } } })
    }

    const next = addDays(periodEnd, 1)
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { nextInvoiceDate: expiry && next > expiry ? null : next },
    })

    return { id: invoice.id, number, subscriptionNumber: subscription.number, total: pricing.total, periodStart, periodEnd }
  })
}

// subscriptions that reached their expiry date, are fully billed and whose plan says auto close
async function closeExpired(today) {
  const expired = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', expiryDate: { lt: today }, nextInvoiceDate: null, plan: { autoClose: true } },
    select: { id: true, number: true },
  })

  const closed = []
  for (const { id, number } of expired) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.subscription.updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'CLOSED' } })
      if (count === 1) await recordStatusChange(tx, id, 'ACTIVE', 'CLOSED', null, 'Closed automatically at expiry date')
    })
    closed.push(number)
  }
  return closed
}

// safe to run any number of times: one invoice per subscription and period is enforced by the database
export async function runBilling({ date } = {}) {
  const today = date ?? businessToday()
  const due = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', nextInvoiceDate: { lte: today } },
    select: { id: true, number: true },
    orderBy: [{ nextInvoiceDate: 'asc' }, { id: 'asc' }],
  })

  const invoices = []
  const errors = []
  for (const subscription of due) {
    try {
      for (let i = 0; i < MAX_PERIODS_PER_RUN; i++) {
        const invoice = await billNextPeriod(subscription.id, today)
        if (!invoice) break
        invoices.push(invoice)
      }
    } catch (err) {
      errors.push({ subscriptionId: subscription.id, number: subscription.number, message: err.message })
    }
  }

  return { date: today, checked: due.length, invoices, closed: await closeExpired(today), errors }
}

/* ---------- invoices ---------- */

export async function listInvoices(query, user) {
  const today = businessToday()
  const where = {
    status: query.status,
    customerId: query.customerId,
    subscriptionId: query.subscriptionId,
    OR: query.search
      ? [
          { number: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        ]
      : undefined,
  }
  if (query.overdue === 'true') {
    where.status = 'CONFIRMED'
    where.dueDate = { lt: today }
  }

  if (user.role === 'CUSTOMER') {
    if (!user.customerId) return { items: [], meta: { total: 0, page: query.page, pageSize: query.pageSize } }
    where.customerId = user.customerId
    where.status = !where.status || CUSTOMER_VISIBLE.includes(where.status) ? (where.status ?? { in: CUSTOMER_VISIBLE }) : { in: [] }
  }

  const [items, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { id: true, name: true } }, subscription: { select: { id: true, number: true } } },
      orderBy: { id: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.invoice.count({ where }),
  ])
  return { items: items.map(withAmountDue), meta: { total, page: query.page, pageSize: query.pageSize } }
}

export async function getInvoice(id, user) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceDetailInclude })
  const hidden =
    user.role === 'CUSTOMER' && (invoice?.customerId !== user.customerId || !CUSTOMER_VISIBLE.includes(invoice.status))
  if (!invoice || hidden) throw new HttpError(404, 'Invoice not found')
  return withAmountDue(invoice)
}

// moves an invoice from one of the allowed statuses to another, refusing if someone else got there first
async function changeStatus(id, allowedFrom, to, refusal) {
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  if (!invoice) throw new HttpError(404, 'Invoice not found')
  if (!allowedFrom.includes(invoice.status)) throw new HttpError(409, refusal(invoice))
  if (to === 'CANCELLED' && invoice.amountPaid.gt(0)) {
    throw new HttpError(409, 'This invoice already has payments, so it cannot be cancelled')
  }

  const { count } = await prisma.invoice.updateMany({ where: { id, status: invoice.status }, data: { status: to } })
  if (count === 0) throw new HttpError(409, 'Someone else just changed this invoice, reload and try again')
}

export async function confirmInvoice(id, user) {
  await changeStatus(id, ['DRAFT'], 'CONFIRMED', (invoice) => `Only a draft can be confirmed, this one is ${invoice.status.toLowerCase()}`)
  return getInvoice(id, user)
}

export async function cancelInvoice(id, user) {
  await changeStatus(id, ['DRAFT', 'CONFIRMED'], 'CANCELLED', (invoice) => `A ${invoice.status.toLowerCase()} invoice cannot be cancelled`)
  return getInvoice(id, user)
}

export async function getInvoicePdf(id, user) {
  const invoice = await getInvoice(id, user)
  return { invoice, pdf: await renderInvoicePdf(invoice) }
}

export async function sendInvoice(id, user) {
  const { invoice, pdf } = await getInvoicePdf(id, user)
  if (invoice.status !== 'CONFIRMED') throw new HttpError(409, 'Confirm the invoice before sending it')

  try {
    await sendMail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.number} from Brightloop`,
      html: `
        <p>Hello ${escapeHtml(invoice.customer.name)},</p>
        <p>Your invoice <b>${invoice.number}</b> for ${toDateString(invoice.periodStart)} to ${toDateString(invoice.periodEnd)} is attached.</p>
        <p><b>Amount due: ${formatMoney(invoice.amountDue)}</b> by ${toDateString(invoice.dueDate)}.</p>`,
      attachments: [{ filename: `${invoice.number.replaceAll('/', '-')}.pdf`, content: pdf, contentType: 'application/pdf' }],
    })
  } catch (err) {
    console.error(`Could not email invoice ${invoice.number}:`, err.message)
    throw new HttpError(502, 'The email could not be sent, please try again')
  }

  await prisma.invoice.update({ where: { id }, data: { sentAt: new Date() } })
  return getInvoice(id, user)
}

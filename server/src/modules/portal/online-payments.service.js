import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { HttpError } from '../../lib/http-error.js'
import { balanceOf } from '../../lib/invoice-state.js'
import { createOrder, fetchOrder, fetchPayment, fromPaise, isValidSignature, toPaise } from '../../lib/razorpay.js'
import { recordPayment } from '../payments/payments.service.js'

// Customers pay the full outstanding balance of one of their confirmed invoices.
// 'razorpay' uses Razorpay Checkout (test keys for the demo); 'demo' simulates a successful
// payment without any network, for an offline demo. Both record the payment through
// recordPayment, so the usual rules (no overpaying, PAID status, audit log) apply.

const methodFromRazorpay = { upi: 'UPI', card: 'CARD', emi: 'CARD', netbanking: 'BANK_TRANSFER' }

export function paymentConfig() {
  return {
    gateway: env.paymentGateway === 'off' ? null : env.paymentGateway,
    keyId: env.paymentGateway === 'razorpay' ? env.razorpayKeyId : null,
  }
}

async function ownInvoice(customerId, invoiceId) {
  if (env.paymentGateway === 'off') throw new HttpError(404, 'Online payments are not enabled')
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, customerId },
    include: { customer: { select: { name: true, email: true, phone: true } } },
  })
  if (!invoice || invoice.status === 'DRAFT') throw new HttpError(404, 'Invoice not found')
  return invoice
}

function assertPayable(invoice) {
  if (invoice.status !== 'CONFIRMED' || balanceOf(invoice).lte(0)) throw new HttpError(409, 'This invoice has nothing left to pay')
}

async function payableInvoice(customerId, invoiceId) {
  const invoice = await ownInvoice(customerId, invoiceId)
  assertPayable(invoice)
  return invoice
}

export async function startCheckout(customerId, invoiceId) {
  const invoice = await payableInvoice(customerId, invoiceId)
  const balance = balanceOf(invoice).toFixed(2)
  const base = { gateway: env.paymentGateway, invoiceNumber: invoice.number, amount: toPaise(balance), currency: 'INR' }
  if (env.paymentGateway === 'demo') return base

  const order = await createOrder({
    amount: balance,
    receipt: invoice.number,
    notes: { invoiceId: String(invoice.id), invoiceNumber: invoice.number },
  })
  return {
    ...base,
    keyId: env.razorpayKeyId,
    orderId: order.id,
    prefill: { name: invoice.customer.name, email: invoice.customer.email, contact: invoice.customer.phone ?? undefined },
  }
}

// a payment id is stored in the note, so a repeated confirmation is recognised instead of recorded twice
const alreadyRecorded = (invoiceId, paymentId) =>
  prisma.payment.findFirst({ where: { invoiceId, note: { contains: paymentId } }, select: { id: true } })

async function verifiedRazorpayPayment(invoice, { orderId, paymentId }) {
  const [payment, order] = await Promise.all([fetchPayment(paymentId), fetchOrder(orderId)])
  if (payment.order_id !== orderId || order.notes?.invoiceId !== String(invoice.id)) {
    throw new HttpError(400, 'This payment does not belong to this invoice')
  }
  if (!['captured', 'authorized'].includes(payment.status) || payment.currency !== 'INR') {
    throw new HttpError(400, `Payment is ${payment.status}, not completed`)
  }
  return {
    method: methodFromRazorpay[payment.method] ?? 'BANK_TRANSFER',
    amount: fromPaise(payment.amount),
    note: `Paid online via Razorpay (${payment.method}), payment ${paymentId}, order ${orderId}`,
  }
}

export async function confirmPayment(customerId, userId, invoiceId, body) {
  const invoice = await ownInvoice(customerId, invoiceId)

  let details
  if (env.paymentGateway === 'demo') {
    assertPayable(invoice)
    details = { method: 'UPI', amount: balanceOf(invoice).toFixed(2), note: 'Demo online payment (simulated, no money moved)' }
  } else {
    // signature first: it proves the ids came from Razorpay, so they are safe to look up
    if (!isValidSignature(body)) throw new HttpError(400, 'Payment could not be verified')
    // a double click or page refresh sends the same payment again
    if (await alreadyRecorded(invoice.id, body.paymentId)) return { alreadyRecorded: true }
    assertPayable(invoice)
    details = await verifiedRazorpayPayment(invoice, body)
  }

  const { invoice: summary } = await recordPayment({ invoiceId: invoice.id, ...details }, userId)
  return { alreadyRecorded: false, invoice: summary }
}

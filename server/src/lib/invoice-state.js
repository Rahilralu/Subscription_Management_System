import { Prisma } from '@prisma/client'
import { daysBetween, utcToday } from './dates.js'

// Overdue is derived rather than stored: a confirmed invoice whose due date has passed.
// Partially paid invoices stay CONFIRMED until the balance reaches zero, so they count too.
export function overdueWhere(today = utcToday()) {
  return { status: 'CONFIRMED', dueDate: { lt: today } }
}

export function balanceOf(invoice) {
  return new Prisma.Decimal(invoice.total).minus(invoice.amountPaid)
}

export function isOverdue(invoice, today = utcToday()) {
  return invoice.status === 'CONFIRMED' && invoice.dueDate < today
}

export function daysOverdue(invoice, today = utcToday()) {
  return isOverdue(invoice, today) ? daysBetween(invoice.dueDate, today) : 0
}

// What the UI shows: Draft / Outstanding / Overdue / Paid / Cancelled
export function paymentState(invoice, today = utcToday()) {
  if (invoice.status !== 'CONFIRMED') return invoice.status
  return isOverdue(invoice, today) ? 'OVERDUE' : 'OUTSTANDING'
}

export function agingBucket(days) {
  if (days <= 0) return null
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

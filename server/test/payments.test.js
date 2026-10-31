import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Prisma } from '@prisma/client'
import { addDays, daysBetween, formatDate, parseDate, utcToday } from '../src/lib/dates.js'
import { agingBucket, balanceOf, daysOverdue, isOverdue, overdueWhere, paymentState } from '../src/lib/invoice-state.js'
import { recordPaymentSchema } from '../src/modules/payments/payments.schema.js'
import { resolveRange } from '../src/modules/dashboard/dashboard.service.js'

const today = parseDate('2026-10-31')
const invoice = (over = {}) => ({
  status: 'CONFIRMED',
  total: new Prisma.Decimal('1000.00'),
  amountPaid: new Prisma.Decimal('0'),
  dueDate: parseDate('2026-10-20'),
  ...over,
})

test('balance is total minus paid, without float drift', () => {
  const inv = invoice({ total: new Prisma.Decimal('0.30'), amountPaid: new Prisma.Decimal('0.10') })
  assert.equal(balanceOf(inv).toString(), '0.2')
})

test('only confirmed invoices past their due date are overdue', () => {
  assert.equal(isOverdue(invoice(), today), true)
  assert.equal(isOverdue(invoice({ dueDate: today }), today), false, 'due today is not overdue yet')
  assert.equal(isOverdue(invoice({ status: 'PAID' }), today), false)
  assert.equal(isOverdue(invoice({ status: 'DRAFT' }), today), false)
  assert.equal(isOverdue(invoice({ status: 'CANCELLED' }), today), false)
})

test('a partially paid invoice stays overdue until fully paid', () => {
  const partial = invoice({ amountPaid: new Prisma.Decimal('400') })
  assert.equal(isOverdue(partial, today), true)
  assert.equal(balanceOf(partial).toString(), '600')
})

test('payment state shown to staff', () => {
  assert.equal(paymentState(invoice(), today), 'OVERDUE')
  assert.equal(paymentState(invoice({ dueDate: addDays(today, 5) }), today), 'OUTSTANDING')
  assert.equal(paymentState(invoice({ status: 'PAID' }), today), 'PAID')
  assert.equal(paymentState(invoice({ status: 'DRAFT' }), today), 'DRAFT')
})

test('days overdue counts whole days and is zero when not overdue', () => {
  assert.equal(daysOverdue(invoice(), today), 11)
  assert.equal(daysOverdue(invoice({ dueDate: addDays(today, 1) }), today), 0)
  assert.equal(daysOverdue(invoice({ status: 'PAID' }), today), 0)
})

test('overdue filter matches the helper', () => {
  assert.deepEqual(overdueWhere(today), { status: 'CONFIRMED', dueDate: { lt: today } })
})

test('aging buckets', () => {
  assert.equal(agingBucket(0), null)
  assert.equal(agingBucket(1), '1-30')
  assert.equal(agingBucket(30), '1-30')
  assert.equal(agingBucket(31), '31-60')
  assert.equal(agingBucket(61), '61-90')
  assert.equal(agingBucket(91), '90+')
})

test('date helpers work in UTC', () => {
  assert.equal(formatDate(parseDate('2026-02-28')), '2026-02-28')
  assert.equal(daysBetween(parseDate('2026-10-01'), parseDate('2026-10-31')), 30)
  assert.equal(utcToday(new Date('2026-10-31T23:59:59Z')).toISOString(), '2026-10-31T00:00:00.000Z')
})

test('dashboard range defaults to the current month so far', () => {
  const { from, to } = resolveRange({}, today)
  assert.equal(formatDate(from), '2026-10-01')
  assert.equal(formatDate(to), '2026-10-31')
  assert.equal(formatDate(resolveRange({ from: '2026-01-15', to: '2026-03-01' }, today).from), '2026-01-15')
})

test('payment input: amount rules', () => {
  const base = { invoiceId: 1, method: 'UPI', amount: '10.50' }
  assert.equal(recordPaymentSchema.safeParse(base).success, true)
  assert.equal(recordPaymentSchema.safeParse({ ...base, amount: 10 }).success, true, 'numbers are accepted')
  for (const amount of ['0', '-5', '1.234', 'abc', '']) {
    assert.equal(recordPaymentSchema.safeParse({ ...base, amount }).success, false, `rejects "${amount}"`)
  }
})

test('payment input: method and date rules', () => {
  const base = { invoiceId: 1, method: 'CARD', amount: '5' }
  assert.equal(recordPaymentSchema.safeParse({ ...base, method: 'BITCOIN' }).success, false)
  assert.equal(recordPaymentSchema.safeParse({ ...base, paidAt: '2099-01-01' }).success, false, 'future date')
  assert.equal(recordPaymentSchema.safeParse({ ...base, paidAt: '2026-01-01' }).success, true)
  assert.equal(recordPaymentSchema.safeParse({ ...base, paidAt: 'yesterday' }).success, false)
})

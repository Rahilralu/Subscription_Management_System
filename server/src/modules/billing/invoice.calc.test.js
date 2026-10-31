import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateInvoice } from './invoice.calc.js'

const today = new Date('2026-06-15')
const gst = { type: 'PERCENT', rate: 18 }

const line = (overrides = {}) => ({
  productId: 1,
  description: 'ERP License',
  quantity: 1,
  unitPrice: 1000,
  taxes: [],
  ...overrides,
})

const discount = (overrides = {}) => ({
  id: 1,
  active: true,
  type: 'PERCENT',
  value: 10,
  scope: 'PRODUCT',
  productId: 1,
  minPurchase: null,
  minQuantity: null,
  startDate: new Date('2026-01-01'),
  endDate: null,
  usageLimit: null,
  usedCount: 0,
  ...overrides,
})

const money = (value) => value.toFixed(2)

test('percent tax on quantity', () => {
  const result = calculateInvoice({ lines: [line({ quantity: 2, unitPrice: 1200, taxes: [gst] })], today })
  assert.equal(money(result.subtotal), '2400.00')
  assert.equal(money(result.taxTotal), '432.00')
  assert.equal(money(result.total), '2832.00')
})

test('product discount comes off before tax', () => {
  const result = calculateInvoice({ lines: [line({ taxes: [gst] })], discounts: [discount()], today })
  assert.equal(money(result.discountTotal), '100.00')
  assert.equal(money(result.taxTotal), '162.00')
  assert.equal(money(result.total), '1062.00')
  assert.deepEqual(result.appliedDiscountIds, [1])
})

test('product discount only touches its own product', () => {
  const lines = [line(), line({ productId: 2, unitPrice: 500 })]
  const result = calculateInvoice({ lines, discounts: [discount()], today })
  assert.equal(money(result.lines[0].discountAmount), '100.00')
  assert.equal(money(result.lines[1].discountAmount), '0.00')
})

test('subscription discount is shared across lines and the totals still add up', () => {
  const lines = [line({ unitPrice: 600, taxes: [gst] }), line({ productId: 2, unitPrice: 400 })]
  const off = discount({ scope: 'SUBSCRIPTION', productId: null, type: 'FIXED', value: 100 })
  const result = calculateInvoice({ lines, discounts: [off], today })

  assert.equal(money(result.lines[0].discountAmount), '60.00')
  assert.equal(money(result.lines[1].discountAmount), '40.00')
  assert.equal(money(result.discountTotal), '100.00')
  // 540 * 18% = 97.20 tax on the first line only
  assert.equal(money(result.taxTotal), '97.20')
  assert.equal(money(result.total), '997.20')
  assert.equal(result.total.toString(), result.subtotal.minus(result.discountTotal).plus(result.taxTotal).toString())
})

test('a fixed discount cannot be bigger than the price', () => {
  const off = discount({ type: 'FIXED', value: 5000 })
  const result = calculateInvoice({ lines: [line()], discounts: [off], today })
  assert.equal(money(result.discountTotal), '1000.00')
  assert.equal(money(result.total), '0.00')
})

test('discounts that are expired, not started, used up or inactive are ignored', () => {
  const ignored = [
    discount({ endDate: new Date('2026-06-14') }),
    discount({ startDate: new Date('2026-06-16') }),
    discount({ usageLimit: 3, usedCount: 3 }),
    discount({ active: false }),
  ]
  const result = calculateInvoice({ lines: [line()], discounts: ignored, today })
  assert.equal(money(result.discountTotal), '0.00')
  assert.deepEqual(result.appliedDiscountIds, [])
})

test('a discount on its last day and just under its usage limit still applies', () => {
  const ok = discount({ endDate: new Date('2026-06-15'), usageLimit: 3, usedCount: 2 })
  assert.equal(money(calculateInvoice({ lines: [line()], discounts: [ok], today }).discountTotal), '100.00')
})

test('minimum quantity and minimum purchase are respected', () => {
  const needsTwo = discount({ minQuantity: 2 })
  const needs5k = discount({ id: 2, minPurchase: 5000 })
  const result = calculateInvoice({ lines: [line()], discounts: [needsTwo, needs5k], today })
  assert.equal(money(result.discountTotal), '0.00')

  const enough = calculateInvoice({ lines: [line({ quantity: 6, unitPrice: 1000 })], discounts: [needsTwo, needs5k], today })
  // both 10% discounts apply, the second one on what is left after the first: 600 + 540
  assert.equal(money(enough.discountTotal), '1140.00')
})

test('fixed tax is charged per unit', () => {
  const result = calculateInvoice({
    lines: [line({ quantity: 3, taxes: [{ type: 'FIXED', rate: 5 }] })],
    today,
  })
  assert.equal(money(result.taxTotal), '15.00')
  assert.equal(money(result.total), '3015.00')
})

test('rounding is half-up to two decimals', () => {
  // 0.04 * 12.5% = 0.005 -> 0.01
  const result = calculateInvoice({ lines: [line({ unitPrice: '0.04', taxes: [{ type: 'PERCENT', rate: 12.5 }] })], today })
  assert.equal(money(result.taxTotal), '0.01')
})

test('an empty invoice is all zeros', () => {
  const result = calculateInvoice({ lines: [], today })
  assert.equal(money(result.total), '0.00')
  assert.deepEqual(result.lines, [])
})

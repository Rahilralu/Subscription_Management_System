import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planFeeLine, priceLines } from './invoice.pricing.js'

const today = new Date('2026-06-15')
const money = (value) => value.toFixed(2)

const monthly = { id: 1, name: 'Monthly', price: 1000 }
const yearly = { id: 2, name: 'Yearly', price: 10000 }
const free = { id: 3, name: 'Free', price: 0 }

// one Cloud Hosting at 800 with 18% GST
const hosting = (quantity = 1) => ({
  productId: 7,
  quantity,
  unitPrice: 800,
  variant: null,
  product: { name: 'Cloud Hosting', taxes: [{ type: 'PERCENT', rate: 18 }] },
})

const discount = (overrides = {}) => ({
  id: 1,
  active: true,
  type: 'PERCENT',
  value: 10,
  scope: 'SUBSCRIPTION',
  productId: null,
  minPurchase: null,
  minQuantity: null,
  startDate: new Date('2026-01-01'),
  endDate: null,
  usageLimit: null,
  usedCount: 0,
  ...overrides,
})

const db = (discounts = []) => ({ discount: { findMany: async () => discounts } })

test('the plan fee is a line of its own, with no product and no tax', () => {
  assert.deepEqual(planFeeLine(monthly), {
    productId: null,
    description: 'Monthly plan',
    quantity: 1,
    unitPrice: 1000,
    taxes: [],
    planFee: true,
  })
})

test('an invoice charges the plan price plus the products', async () => {
  const result = await priceLines(db(), [hosting()], monthly, today)
  assert.deepEqual(result.lines.map((line) => line.description), ['Monthly plan', 'Cloud Hosting'])
  assert.equal(money(result.subtotal), '1800.00')
  // GST is only charged on the product: 800 * 18%
  assert.equal(money(result.taxTotal), '144.00')
  assert.equal(money(result.total), '1944.00')
})

test('moving to another plan changes the amount', async () => {
  const onMonthly = await priceLines(db(), [hosting()], monthly, today)
  const onYearly = await priceLines(db(), [hosting()], yearly, today)
  assert.equal(money(onMonthly.total), '1944.00')
  assert.equal(money(onYearly.total), '10944.00')
})

test('a plan that costs nothing adds no line', async () => {
  const result = await priceLines(db(), [hosting()], free, today)
  assert.deepEqual(result.lines.map((line) => line.description), ['Cloud Hosting'])
  assert.equal(money(result.total), '944.00')
})

test('a subscription discount applies to the whole invoice, plan price included', async () => {
  const result = await priceLines(db([discount()]), [hosting()], monthly, today)
  // 10% of 1800; the plan line takes 100 of it and the product line takes 80
  assert.equal(money(result.discountTotal), '180.00')
  assert.equal(money(result.lines[0].discountAmount), '100.00')
  assert.equal(money(result.lines[1].discountAmount), '80.00')
  // tax is charged after discount: (800 - 80) * 18% = 129.60
  assert.equal(money(result.taxTotal), '129.60')
  assert.equal(money(result.total), '1749.60')
})

test('a product discount does not touch the plan price', async () => {
  const onHosting = discount({ scope: 'PRODUCT', productId: 7 })
  const result = await priceLines(db([onHosting]), [hosting()], monthly, today)
  assert.equal(money(result.lines[0].discountAmount), '0.00')
  assert.equal(money(result.lines[1].discountAmount), '80.00')
})

test('the plan fee does not count towards a minimum quantity', async () => {
  // one product plus the plan line would look like 2 items, but only products count
  const needsTwo = discount({ minQuantity: 2 })
  const one = await priceLines(db([needsTwo]), [hosting(1)], monthly, today)
  assert.equal(money(one.discountTotal), '0.00')

  const two = await priceLines(db([needsTwo]), [hosting(2)], monthly, today)
  assert.equal(money(two.discountTotal), '260.00') // 10% of (1000 + 1600)
})

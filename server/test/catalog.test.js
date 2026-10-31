import { test } from 'node:test'
import assert from 'node:assert/strict'
import { discountSchema } from '../src/modules/catalog/discounts.schema.js'
import { templateSchema } from '../src/modules/catalog/templates.schema.js'
import { planSchema } from '../src/modules/catalog/plans.schema.js'
import { taxSchema } from '../src/modules/catalog/taxes.schema.js'

const issuesAt = (result, field) => result.error.issues.filter((issue) => issue.path[0] === field)

const discount = (over = {}) => ({
  name: 'Launch offer',
  type: 'PERCENT',
  value: '10',
  scope: 'SUBSCRIPTION',
  startDate: '2026-11-01',
  ...over,
})

test('discount: optional limits default to null and dates become UTC midnight', () => {
  const parsed = discountSchema.parse(discount())
  assert.equal(parsed.minPurchase, null)
  assert.equal(parsed.minQuantity, null)
  assert.equal(parsed.usageLimit, null)
  assert.equal(parsed.endDate, null)
  assert.equal(parsed.startDate.toISOString(), '2026-11-01T00:00:00.000Z')
})

test('discount: product scope needs a product', () => {
  const result = discountSchema.safeParse(discount({ scope: 'PRODUCT' }))
  assert.equal(result.success, false)
  assert.equal(issuesAt(result, 'productId').length, 1)
  assert.equal(discountSchema.parse(discount({ scope: 'PRODUCT', productId: 3 })).productId, 3)
})

test('discount: subscription scope drops a stray productId', () => {
  assert.equal(discountSchema.parse(discount({ productId: 3 })).productId, null)
})

test('discount: percent is capped at 100 and value must be positive', () => {
  assert.equal(discountSchema.safeParse(discount({ value: '101' })).success, false)
  assert.equal(discountSchema.safeParse(discount({ value: '0' })).success, false)
  assert.equal(discountSchema.safeParse(discount({ type: 'FIXED', value: '500' })).success, true)
})

test('discount: end date may equal but not precede the start date', () => {
  assert.equal(discountSchema.safeParse(discount({ endDate: '2026-11-01' })).success, true)
  const result = discountSchema.safeParse(discount({ endDate: '2026-10-31' }))
  assert.equal(issuesAt(result, 'endDate').length, 1)
})

test('discount: limits must be whole numbers of at least 1', () => {
  assert.equal(discountSchema.safeParse(discount({ usageLimit: 0 })).success, false)
  assert.equal(discountSchema.safeParse(discount({ minQuantity: 1.5 })).success, false)
  assert.equal(discountSchema.parse(discount({ usageLimit: '5', minPurchase: 1000 })).minPurchase, '1000')
})

const template = (over = {}) => ({
  name: 'Starter pack',
  planId: 1,
  lines: [{ productId: 1, quantity: 2 }],
  ...over,
})

test('template: defaults validity to 30 days and normalises empty values', () => {
  const parsed = templateSchema.parse(template({ notes: '' }))
  assert.equal(parsed.validityDays, 30)
  assert.equal(parsed.notes, null)
  assert.equal(parsed.lines[0].variantId, null)
})

test('template: needs at least one line', () => {
  const result = templateSchema.safeParse(template({ lines: [] }))
  assert.equal(issuesAt(result, 'lines').length, 1)
})

test('template: rejects the same product and option twice', () => {
  const lines = [
    { productId: 1, variantId: 4, quantity: 1 },
    { productId: 1, variantId: 4, quantity: 2 },
  ]
  assert.equal(templateSchema.safeParse(template({ lines })).success, false)
  lines[1].variantId = 5
  assert.equal(templateSchema.safeParse(template({ lines })).success, true)
})

test('template: validity is between 1 and 365 days', () => {
  assert.equal(templateSchema.safeParse(template({ validityDays: 0 })).success, false)
  assert.equal(templateSchema.safeParse(template({ validityDays: 366 })).success, false)
})

test('plan: end date must be after start date', () => {
  const plan = { name: 'Monthly', price: '999', billingPeriod: 'MONTHLY', startDate: '2026-01-01' }
  assert.equal(planSchema.safeParse({ ...plan, endDate: '2026-01-01' }).success, false)
  assert.equal(planSchema.parse({ ...plan, endDate: '2026-12-31' }).endDate.toISOString(), '2026-12-31T00:00:00.000Z')
})

test('tax: percent rate is capped at 100', () => {
  assert.equal(taxSchema.safeParse({ name: 'GST', type: 'PERCENT', rate: '120' }).success, false)
  assert.equal(taxSchema.safeParse({ name: 'Fee', type: 'FIXED', rate: '120' }).success, true)
})

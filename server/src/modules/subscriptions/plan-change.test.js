import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planChangeProblem } from './plan-change.js'

const today = new Date('2026-10-31')

const subscription = (overrides = {}) => ({
  status: 'ACTIVE',
  planId: 1,
  nextInvoiceDate: new Date('2026-12-01'),
  lines: [{ quantity: 3, product: { name: 'ERP License' } }],
  ...overrides,
})

const plan = (overrides = {}) => ({ id: 2, name: 'Yearly', active: true, minQuantity: 1, ...overrides })

test('an active subscription can move to another active plan', () => {
  assert.equal(planChangeProblem(subscription(), plan(), today), null)
})

test('only active subscriptions can change plan', () => {
  for (const status of ['DRAFT', 'QUOTATION', 'CONFIRMED', 'PAUSED', 'CLOSED']) {
    assert.match(planChangeProblem(subscription({ status }), plan(), today), /only active subscriptions/)
  }
})

test('an inactive plan is refused', () => {
  assert.match(planChangeProblem(subscription(), plan({ active: false }), today), /Yearly plan is not available/)
})

test('moving to the plan it is already on is refused', () => {
  assert.match(planChangeProblem(subscription(), plan({ id: 1, name: 'Monthly' }), today), /already on the Monthly plan/)
})

test('every line must meet the new plan minimum quantity', () => {
  const lines = [
    { quantity: 5, product: { name: 'Cloud Hosting' } },
    { quantity: 2, product: { name: 'ERP License' } },
  ]
  const problem = planChangeProblem(subscription({ lines }), plan({ minQuantity: 5 }), today)
  assert.match(problem, /ERP License has a quantity of 2, but the Yearly plan needs at least 5/)
  assert.equal(planChangeProblem(subscription({ lines }), plan({ minQuantity: 2 }), today), null)
})

test('invoices that are already due must be billed on the old plan first', () => {
  const due = subscription({ nextInvoiceDate: new Date('2026-10-31') })
  assert.match(planChangeProblem(due, plan(), today), /run billing before changing its plan/)
  assert.match(planChangeProblem(subscription({ nextInvoiceDate: new Date('2026-10-01') }), plan(), today), /invoices due/)
})

test('a fully billed subscription with no next invoice can still change plan', () => {
  assert.equal(planChangeProblem(subscription({ nextInvoiceDate: null }), plan(), today), null)
})

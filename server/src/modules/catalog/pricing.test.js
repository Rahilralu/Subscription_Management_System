import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateTax } from './pricing.js'

const gst = { type: 'PERCENT', rate: '18' }
const fee = { type: 'FIXED', rate: '50' }

test('percent tax on line total', () => {
  const { lines, taxTotal } = calculateTax([{ quantity: 2, unitPrice: '500', taxes: [gst] }])
  assert.equal(lines[0].subtotal.toString(), '1000')
  assert.equal(taxTotal.toString(), '180')
  assert.equal(lines[0].amount.toString(), '1180')
})

test('fixed tax is per unit', () => {
  const { taxTotal } = calculateTax([{ quantity: 3, unitPrice: '100', taxes: [fee] }])
  assert.equal(taxTotal.toString(), '150')
})

test('several taxes on one line add up', () => {
  const { taxTotal } = calculateTax([{ quantity: 1, unitPrice: '1000', taxes: [gst, fee] }])
  assert.equal(taxTotal.toString(), '230')
})

test('archived taxes are skipped', () => {
  const { taxTotal } = calculateTax([{ quantity: 1, unitPrice: '1000', taxes: [{ ...gst, active: false }] }])
  assert.equal(taxTotal.toString(), '0')
})

test('tax is rounded to 2 decimals', () => {
  const { taxTotal } = calculateTax([{ quantity: 1, unitPrice: '333.33', taxes: [gst] }])
  assert.equal(taxTotal.toFixed(2), '60.00')
})

test('totals across lines, line without taxes', () => {
  const { subtotal, taxTotal } = calculateTax([
    { quantity: 2, unitPrice: '1760', taxes: [gst] },
    { quantity: 1, unitPrice: '500' },
  ])
  assert.equal(subtotal.toString(), '4020')
  assert.equal(taxTotal.toString(), '633.6')
})

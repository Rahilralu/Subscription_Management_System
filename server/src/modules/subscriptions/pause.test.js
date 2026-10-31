import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysPaused, shiftForPause } from './pause.js'
import { toDateString } from '../../lib/dates.js'

const d = (s) => new Date(s)
const shifted = (dates, days) => {
  const result = shiftForPause(dates, days)
  return {
    nextInvoiceDate: result.nextInvoiceDate && toDateString(result.nextInvoiceDate),
    expiryDate: result.expiryDate && toDateString(result.expiryDate),
  }
}

test('daysPaused counts whole days, also across a month end', () => {
  assert.equal(daysPaused(d('2026-10-20'), d('2026-11-02')), 13)
  assert.equal(daysPaused(d('2026-10-31'), d('2026-10-31')), 0)
})

test('daysPaused is never negative', () => {
  assert.equal(daysPaused(d('2026-11-05'), d('2026-11-01')), 0)
})

test('resuming moves the next invoice and the end date back by the paused days', () => {
  const result = shifted({ nextInvoiceDate: d('2026-12-01'), expiryDate: d('2027-06-30') }, 10)
  assert.deepEqual(result, { nextInvoiceDate: '2026-12-11', expiryDate: '2027-07-10' })
})

test('a subscription with no end date keeps having none', () => {
  const result = shifted({ nextInvoiceDate: d('2026-12-01'), expiryDate: null }, 7)
  assert.deepEqual(result, { nextInvoiceDate: '2026-12-08', expiryDate: null })
})

test('a fully billed subscription has no next invoice to move', () => {
  const result = shifted({ nextInvoiceDate: null, expiryDate: d('2026-12-31') }, 5)
  assert.deepEqual(result, { nextInvoiceDate: null, expiryDate: '2027-01-05' })
})

test('pausing and resuming on the same day changes nothing', () => {
  const dates = { nextInvoiceDate: d('2026-12-01'), expiryDate: d('2027-06-30') }
  assert.deepEqual(shifted(dates, 0), { nextInvoiceDate: '2026-12-01', expiryDate: '2027-06-30' })
})

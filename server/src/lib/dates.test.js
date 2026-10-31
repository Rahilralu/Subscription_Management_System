import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addDays, addMonths, addPeriod, businessToday, toDateString } from './dates.js'

const d = (s) => new Date(s)

test('addMonths clamps to the last day of a shorter month', () => {
  assert.equal(toDateString(addMonths(d('2026-01-31'), 1)), '2026-02-28')
  assert.equal(toDateString(addMonths(d('2028-01-31'), 1)), '2028-02-29')
  assert.equal(toDateString(addMonths(d('2026-12-31'), 2)), '2027-02-28')
})

test('addMonths keeps the day when the month is long enough', () => {
  assert.equal(toDateString(addMonths(d('2026-01-15'), 1)), '2026-02-15')
  assert.equal(toDateString(addMonths(d('2026-11-30'), 3)), '2027-02-28')
})

test('addPeriod covers every billing period', () => {
  assert.equal(toDateString(addPeriod(d('2026-03-01'), 'DAILY')), '2026-03-02')
  assert.equal(toDateString(addPeriod(d('2026-03-01'), 'WEEKLY')), '2026-03-08')
  assert.equal(toDateString(addPeriod(d('2026-03-01'), 'MONTHLY')), '2026-04-01')
  assert.equal(toDateString(addPeriod(d('2026-03-01'), 'YEARLY')), '2027-03-01')
  assert.equal(toDateString(addPeriod(d('2028-02-29'), 'YEARLY')), '2029-02-28')
  assert.throws(() => addPeriod(d('2026-03-01'), 'HOURLY'))
})

test('addDays works across month ends', () => {
  assert.equal(toDateString(addDays(d('2026-01-31'), 1)), '2026-02-01')
  assert.equal(toDateString(addDays(d('2026-03-01'), -1)), '2026-02-28')
})

test('businessToday uses the business calendar date, not UTC', () => {
  // 20:00 UTC on 31 Oct is already 1 Nov in India (UTC+5:30)
  assert.equal(toDateString(businessToday(d('2026-10-31T20:00:00Z'))), '2026-11-01')
  assert.equal(toDateString(businessToday(d('2026-10-31T10:00:00Z'))), '2026-10-31')
})

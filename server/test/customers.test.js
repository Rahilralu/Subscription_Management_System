import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createCustomerSchema, listCustomersQuery, updateCustomerSchema } from '../src/modules/customers/customers.schema.js'

const valid = { name: 'Ravi Mehta', email: 'ravi@example.com' }

test('a name and an email are enough to add a customer', () => {
  const result = createCustomerSchema.safeParse(valid)
  assert.equal(result.success, true)
  assert.equal(result.data.phone, null)
  assert.equal(result.data.address, null)
})

test('the name is required', () => {
  assert.equal(createCustomerSchema.safeParse({ email: valid.email }).success, false)
  assert.equal(createCustomerSchema.safeParse({ ...valid, name: '   ' }).success, false)
  assert.equal(createCustomerSchema.safeParse({ ...valid, name: 'x'.repeat(101) }).success, false)
})

test('the email is required and must look like an email', () => {
  assert.equal(createCustomerSchema.safeParse({ name: valid.name }).success, false)
  assert.equal(createCustomerSchema.safeParse({ ...valid, email: '' }).success, false)
  assert.equal(createCustomerSchema.safeParse({ ...valid, email: 'not-an-email' }).success, false)
})

test('the email is trimmed and lower-cased, so duplicates are caught however it was typed', () => {
  const result = createCustomerSchema.safeParse({ ...valid, email: '  Ravi@Example.COM ' })
  assert.equal(result.data.email, 'ravi@example.com')
})

test('the phone number is length limited', () => {
  assert.equal(createCustomerSchema.safeParse({ ...valid, phone: '9'.repeat(30) }).success, true)
  assert.equal(createCustomerSchema.safeParse({ ...valid, phone: '9'.repeat(31) }).success, false)
})

test('the address is length limited', () => {
  assert.equal(createCustomerSchema.safeParse({ ...valid, address: 'a'.repeat(300) }).success, true)
  assert.equal(createCustomerSchema.safeParse({ ...valid, address: 'a'.repeat(301) }).success, false)
})

test('a blank phone or address is stored as nothing', () => {
  const result = createCustomerSchema.safeParse({ ...valid, phone: '   ', address: '' })
  assert.equal(result.data.phone, null)
  assert.equal(result.data.address, null)
})

test('editing keeps the same rules, and the email can be left out', () => {
  assert.equal(updateCustomerSchema.safeParse({ name: 'Ravi M' }).success, true)
  assert.equal(updateCustomerSchema.safeParse({ name: '' }).success, false)
  assert.equal(updateCustomerSchema.safeParse({ name: 'Ravi M', phone: '9'.repeat(31) }).success, false)
  assert.equal(updateCustomerSchema.safeParse({ name: 'Ravi M', email: 'nope' }).success, false)
  assert.equal(updateCustomerSchema.safeParse({ name: 'Ravi M', email: 'new@example.com' }).success, true)
})

test('the list query defaults to the first page and rejects absurd page sizes', () => {
  assert.deepEqual(listCustomersQuery.parse({}), { page: 1, pageSize: 20 })
  assert.equal(listCustomersQuery.safeParse({ pageSize: '500' }).success, false)
  assert.equal(listCustomersQuery.parse({ search: '  asha ' }).search, 'asha')
})

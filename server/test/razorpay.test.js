import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// lib/razorpay.js reads config at import time; give it the minimum it needs
process.env.DATABASE_URL ??= 'postgresql://unused'
process.env.JWT_SECRET ??= 'test-secret'
const { toPaise, fromPaise, isValidSignature } = await import('../src/lib/razorpay.js')

test('rupee amounts convert to whole paise without float errors', () => {
  assert.equal(toPaise('1180'), 118000)
  assert.equal(toPaise('1180.5'), 118050)
  assert.equal(toPaise('2533.80'), 253380)
  assert.equal(toPaise('0.07'), 7)
  assert.equal(toPaise('38855.07'), 3885507)
  assert.equal(fromPaise(253380), '2533.80')
})

const secret = 'rzp_test_secret'
const sign = (orderId, paymentId) => crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')

test('a genuine Razorpay signature is accepted', () => {
  const ids = { orderId: 'order_ABC', paymentId: 'pay_XYZ' }
  assert.equal(isValidSignature({ ...ids, signature: sign(ids.orderId, ids.paymentId) }, secret), true)
})

test('tampered, swapped or missing values are rejected', () => {
  const signature = sign('order_ABC', 'pay_XYZ')
  assert.equal(isValidSignature({ orderId: 'order_ABC', paymentId: 'pay_OTHER', signature }, secret), false)
  assert.equal(isValidSignature({ orderId: 'order_OTHER', paymentId: 'pay_XYZ', signature }, secret), false)
  assert.equal(isValidSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature }, 'wrong-secret'), false)
  assert.equal(isValidSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature: 'short' }, secret), false)
  assert.equal(isValidSignature({ orderId: 'order_ABC', paymentId: 'pay_XYZ' }, secret), false)
  assert.equal(isValidSignature({}, secret), false)
})

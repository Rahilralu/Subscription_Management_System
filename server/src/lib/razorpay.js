import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { HttpError } from './http-error.js'

// Minimal Razorpay REST client (orders + payments), so no SDK dependency is needed.
// https://razorpay.com/docs/api/orders/  https://razorpay.com/docs/api/payments/

// Razorpay amounts are integers in paise; Decimal strings avoid float rounding ("1180.50" -> 118050)
export function toPaise(amount) {
  const [rupees, paise = ''] = String(amount).split('.')
  return Number(rupees) * 100 + Number(paise.padEnd(2, '0').slice(0, 2))
}

export const fromPaise = (paise) => (paise / 100).toFixed(2)

// Checkout returns razorpay_signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
export function isValidSignature({ orderId, paymentId, signature }, secret = env.razorpayKeySecret) {
  if (!orderId || !paymentId || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  const given = Buffer.from(String(signature))
  return given.length === expected.length && crypto.timingSafeEqual(given, Buffer.from(expected))
}

async function request(method, path, body) {
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')
  let res
  try {
    res = await fetch(`${env.razorpayApiUrl}${path}`, {
      method,
      headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    console.error(`[razorpay] ${method} ${path} failed:`, err.message)
    throw new HttpError(502, 'Could not reach the payment provider, please try again')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`[razorpay] ${method} ${path} -> ${res.status}`, data?.error?.description)
    throw new HttpError(502, 'The payment provider rejected the request')
  }
  return data
}

export const createOrder = ({ amount, receipt, notes }) =>
  request('POST', '/orders', { amount: toPaise(amount), currency: 'INR', receipt: receipt.slice(0, 40), notes })

export const fetchPayment = (paymentId) => request('GET', `/payments/${encodeURIComponent(paymentId)}`)

export const fetchOrder = (orderId) => request('GET', `/orders/${encodeURIComponent(orderId)}`)

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

// Starts the real Express app (no database needed: every request below is refused before a query).
process.env.DATABASE_URL ??= 'postgresql://unused'
process.env.JWT_SECRET ??= 'test-secret'
process.env.AUTH_RATE_LIMIT_PER_MIN = '10'
const { app } = await import('../src/app.js')

let server, base
before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}/api`
})
after(() => server.close())

const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) })

// Merges have dropped route registrations from app.js more than once; the web app then gets 404s.
test('every API area the web app calls is registered', async () => {
  const areas = ['/users', '/catalog/products', '/subscriptions', '/billing/invoices', '/payments', '/dashboard/summary',
    '/portal/invoices', '/subscription-requests', '/customers', '/chat/message']
  for (const path of areas) {
    const res = await fetch(base + path, { method: path === '/chat/message' ? 'POST' : 'GET' })
    assert.equal(res.status, 401, `${path} answered ${res.status}; 404 means the route is not registered in app.js`)
  }
})

test('login is limited per email: the 11th attempt in a minute is refused', async () => {
  const attempt = () => post('/auth/login', { email: 'victim@example.com', password: '' }) // invalid body: no database work
  for (let i = 0; i < 10; i++) assert.equal((await attempt()).status, 400)
  const blocked = await attempt()
  assert.equal(blocked.status, 429)
  assert.match((await blocked.json()).error.message, /Too many attempts/)
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
  // another account is not affected
  assert.equal((await post('/auth/login', { email: 'someone-else@example.com', password: '' })).status, 400)
})

test('the same email in different case or spacing shares one limit', async () => {
  for (let i = 0; i < 10; i++) await post('/auth/forgot-password', { email: i % 2 ? 'Spam@Example.com ' : 'spam@example.com' })
  assert.equal((await post('/auth/forgot-password', { email: 'SPAM@example.com' })).status, 429)
})

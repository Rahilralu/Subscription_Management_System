// Response-time check against a running API (npm run dev), meant to be run after `npm run db:seed:large`.
//
//   npm run perf                       20 requests per endpoint, fails if any p95 is >= 2000 ms
//   API_URL=http://host:4000/api RUNS=50 BUDGET_MS=1000 npm run perf
const API = process.env.API_URL ?? 'http://localhost:4000/api'
const RUNS = Number(process.env.RUNS ?? 20)
const BUDGET_MS = Number(process.env.BUDGET_MS ?? 2000)

const iso = (d) => d.toISOString().slice(0, 10)
const now = new Date()
const yearStart = `${now.getUTCFullYear()}-01-01`
const last12 = iso(new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)))
const today = iso(now)

const endpoints = [
  ['dashboard summary (this month)', '/dashboard/summary'],
  ['dashboard summary (12 months)', `/dashboard/summary?from=${last12}&to=${today}`],
  ['dashboard summary (plan filter)', `/dashboard/summary?from=${yearStart}&to=${today}&planId=1`],
  ['dashboard summary (customer filter)', `/dashboard/summary?from=${yearStart}&to=${today}&customerId=5`],
  ['dashboard charts', `/dashboard/charts?from=${last12}&to=${today}`],
  ['dashboard charts (plan filter)', `/dashboard/charts?from=${yearStart}&to=${today}&planId=2`],
  ['overdue list page 1', '/dashboard/overdue?pageSize=10'],
  ['overdue list page 50', '/dashboard/overdue?pageSize=10&page=50'],
  ['overdue list (search)', '/dashboard/overdue?pageSize=10&search=smith'],
  ['payments list', '/payments?pageSize=20'],
  ['payments list (method + dates)', `/payments?pageSize=20&method=UPI&from=${yearStart}&to=${today}`],
  ['payments list (search)', '/payments?pageSize=20&search=INV/2026'],
  ['receivables: outstanding', '/payments/receivables?state=outstanding&pageSize=20'],
  ['receivables: overdue', '/payments/receivables?state=overdue&pageSize=20'],
  ['receivables: paid', '/payments/receivables?state=paid&pageSize=20'],
  ['receivables: all (search)', '/payments/receivables?state=all&pageSize=20&search=a'],
  ['audit log', '/dashboard/audit?pageSize=25'],
]

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@brightloop.local', password: 'Admin@1234' }),
  })
  if (!res.ok) throw new Error(`Login failed (${res.status}). Is the API running and the database seeded?`)
  return (await res.json()).data.token
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]

async function measure(token, path) {
  const times = []
  for (let i = 0; i < RUNS + 1; i++) {
    const start = performance.now()
    const res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } })
    await res.arrayBuffer()
    const ms = performance.now() - start
    if (!res.ok) throw new Error(`${path} returned ${res.status}`)
    if (i > 0) times.push(ms) // the first request warms up connections and query plans
  }
  return times.sort((a, b) => a - b)
}

const token = await login()
const counts = await fetch(`${API}/dashboard/summary`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json())
console.log(`API ${API} · ${RUNS} runs per endpoint · budget p95 < ${BUDGET_MS} ms · ${counts.data.activeSubscriptions} active subscriptions\n`)

const rows = []
let failed = false
for (const [name, path] of endpoints) {
  const times = await measure(token, path)
  const p50 = percentile(times, 50)
  const p95 = percentile(times, 95)
  const ok = p95 < BUDGET_MS
  if (!ok) failed = true
  rows.push({ endpoint: name, 'p50 ms': Math.round(p50), 'p95 ms': Math.round(p95), 'max ms': Math.round(times.at(-1)), result: ok ? 'ok' : 'SLOW' })
}
console.table(rows)

if (failed) {
  console.error(`\nFAILED: at least one endpoint has p95 >= ${BUDGET_MS} ms`)
  process.exit(1)
}
console.log(`\nAll endpoints under ${BUDGET_MS} ms at p95`)

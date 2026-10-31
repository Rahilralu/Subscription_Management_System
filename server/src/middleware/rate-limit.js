import { HttpError } from '../lib/http-error.js'

// Sliding-window limiter kept in memory, one counter per key (the logged-in user by default).
// Good enough for a single API process; use a shared store if the API is ever scaled out.
export function createRateLimiter({ limit, windowMs = 60_000, now = Date.now, key = (req) => req.user?.sub ?? req.ip }) {
  const hits = new Map()

  return (req, res, next) => {
    const id = String(key(req))
    const time = now()
    const recent = (hits.get(id) ?? []).filter((t) => time - t < windowMs)

    if (recent.length >= limit) {
      const retryAfter = Math.ceil((windowMs - (time - recent[0])) / 1000)
      res.set('Retry-After', String(retryAfter))
      throw new HttpError(429, `You are sending messages too quickly. Please wait ${retryAfter} seconds.`)
    }

    recent.push(time)
    hits.set(id, recent)

    // drop idle keys now and then so the map cannot grow forever
    if (hits.size > 1000) {
      for (const [k, times] of hits) if (times.every((t) => time - t >= windowMs)) hits.delete(k)
    }
    next()
  }
}

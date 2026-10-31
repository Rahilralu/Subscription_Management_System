// All billing dates are date-only (@db.Date), so they are handled as UTC midnight.
const DAY_MS = 86_400_000

export const BUSINESS_TZ = process.env.BUSINESS_TZ ?? 'Asia/Kolkata'

export function toDateOnly(date) {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export const today = () => toDateOnly(new Date())

export function utcToday(now = new Date()) {
  return toDateOnly(now)
}

// today's calendar date in the business timezone, as UTC midnight
export function businessToday(now = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ })
    .format(now)
    .split('-')
    .map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS)

// 31 Jan + 1 month = 28 Feb (or 29 in a leap year), never 3 Mar
export function addMonths(date, months) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)))
}

export function addPeriod(date, billingPeriod, count = 1) {
  switch (billingPeriod) {
    case 'DAILY': return addDays(date, count)
    case 'WEEKLY': return addDays(date, 7 * count)
    case 'MONTHLY': return addMonths(date, count)
    case 'YEARLY': return addMonths(date, 12 * count)
    default: throw new Error(`Unknown billing period: ${billingPeriod}`)
  }
}

export function daysBetween(from, to) {
  return Math.floor((toDateOnly(to).getTime() - toDateOnly(from).getTime()) / DAY_MS)
}

export function parseDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

export const toDateString = (date) => date.toISOString().slice(0, 10)

export const formatDate = toDateString

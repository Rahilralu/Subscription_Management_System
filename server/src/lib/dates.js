const DAY = 24 * 60 * 60 * 1000

// Today's date as UTC midnight, which is how Prisma reads @db.Date columns.
export function utcToday(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY)
}

export function daysBetween(from, to) {
  return Math.floor((utcToday(to).getTime() - utcToday(from).getTime()) / DAY)
}

// 'YYYY-MM-DD' -> Date at UTC midnight
export function parseDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

export function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

// Billing dates are date-only (@db.Date), so compare in UTC midnight to avoid timezone drift.
export function toDateOnly(date) {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export const today = () => toDateOnly(new Date())

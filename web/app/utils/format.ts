const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Prisma Decimal values arrive as strings
export function formatMoney(value: string | number | null | undefined) {
  return money.format(Number(value ?? 0))
}

export function formatDate(value: string | Date | null | undefined) {
  return value ? date.format(new Date(value)) : '—'
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Prisma Decimal values arrive as strings
export function formatMoney(value: string | number | null | undefined) {
  return money.format(Number(value ?? 0))
}

export function formatDate(value: string | Date | null | undefined) {
  return value ? date.format(new Date(value)) : '—'
}

// for <input type="date">, which wants YYYY-MM-DD
export const dateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : '')
export const todayInputValue = () => new Date().toLocaleDateString('en-CA')

export const isOverdue = (invoice: { status: string, dueDate: string }) =>
  invoice.status === 'CONFIRMED' && dateInputValue(invoice.dueDate) < todayInputValue()

// 'MONTHLY' -> 'Monthly'
export const titleCase = (text: string) => text.charAt(0) + text.slice(1).toLowerCase()

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export const formatMoney = (value?: string | number | null) => money.format(Number(value ?? 0))

// date columns arrive as UTC midnight, so read them in UTC or they show up a day early
export function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// for <input type="date">, which wants YYYY-MM-DD
export const dateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : '')
export const todayInputValue = () => new Date().toLocaleDateString('en-CA')

export const isOverdue = (invoice: { status: string, dueDate: string }) =>
  invoice.status === 'CONFIRMED' && dateInputValue(invoice.dueDate) < todayInputValue()

export const statusColors = {
  DRAFT: 'neutral',
  QUOTATION: 'info',
  CONFIRMED: 'primary',
  ACTIVE: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  PAID: 'success',
  CANCELLED: 'error',
  OVERDUE: 'error',
} as const

export const titleCase = (text: string) => text.charAt(0) + text.slice(1).toLowerCase()

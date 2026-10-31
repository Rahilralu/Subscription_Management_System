// formatMoney / formatDate live in composables/useFormat.ts

// for <input type="date">, which wants YYYY-MM-DD
export const dateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : '')
export const todayInputValue = () => new Date().toLocaleDateString('en-CA')

export const isOverdue = (invoice: { status: string, dueDate: string }) =>
  invoice.status === 'CONFIRMED' && dateInputValue(invoice.dueDate) < todayInputValue()

// 'MONTHLY' -> 'Monthly'
export const titleCase = (text: string) => text.charAt(0) + text.slice(1).toLowerCase()

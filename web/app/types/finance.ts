export type Money = number | string

export interface Summary {
  range: { from: string, to: string }
  activeSubscriptions: number
  newSubscriptions: number
  mrr: number
  arr: number
  revenue: number
  paymentsCount: number
  invoiced: number
  invoicesCount: number
  paidInvoices: number
  collectionRate: number | null
  outstanding: number
  outstandingCount: number
  overdue: number
  overdueCount: number
}

export interface Charts {
  monthly: { month: string, collected: number, invoiced: number }[]
  subscriptionsByStatus: { status: string, count: number }[]
  paymentsByMethod: { method: string, amount: number, count: number }[]
  aging: { bucket: string, amount: number, count: number }[]
  topOverdueCustomers: { id: number, name: string, amount: number, invoices: number }[]
}

export type InvoiceState = 'DRAFT' | 'OUTSTANDING' | 'OVERDUE' | 'PAID' | 'CANCELLED'

export interface InvoiceSummary {
  id: number
  number: string
  status: string
  state: InvoiceState
  issueDate: string
  dueDate: string
  total: Money
  amountPaid: Money
  balance: Money
  daysOverdue: number
  reminderCount: number
  lastReminderAt: string | null
  customer?: { id: number, name: string, email: string }
  subscription?: { id: number, number: string }
}

export interface Payment {
  id: number
  invoiceId: number
  method: string
  amount: Money
  paidAt: string
  note: string | null
  createdAt: string
  invoice?: { id: number, number: string, total: Money, amountPaid: Money, status: string, customer: { id: number, name: string } }
  recordedBy?: { id: number, name: string } | null
}

export interface PageMeta {
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface Paged<T, M = object> {
  data: T[]
  meta: PageMeta & M
}

export const paymentMethods = [
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'CARD' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Cheque', value: 'CHEQUE' },
]

export const methodLabel = (value: string) => paymentMethods.find(m => m.value === value)?.label ?? value

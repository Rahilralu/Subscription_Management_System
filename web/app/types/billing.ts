// Money and dates arrive from the API as strings ("1180", "2026-10-31T00:00:00.000Z")

export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'
export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface ListResponse<T> {
  data: T[]
  meta: { total: number, page: number, pageSize: number }
}

export interface Plan {
  id: number
  name: string
  billingPeriod: BillingPeriod
  minQuantity: number
  pausable: boolean
  closable: boolean
  renewable: boolean
  autoClose: boolean
}

export interface PricedLine {
  description: string
  quantity: number
  unitPrice: string
  discountAmount: string
  taxAmount: string
  amount: string
}

export interface Pricing {
  lines: PricedLine[]
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
}

export interface SubscriptionRow {
  id: number
  number: string
  status: SubscriptionStatus
  startDate: string
  nextInvoiceDate: string | null
  customer: { id: number, name: string }
  plan: { id: number, name: string, billingPeriod: BillingPeriod }
}

export interface SubscriptionInvoice {
  id: number
  number: string
  status: InvoiceStatus
  periodStart: string
  periodEnd: string
  dueDate: string
  total: string
  amountPaid: string
}

export interface SubscriptionDetail {
  id: number
  number: string
  status: SubscriptionStatus
  startDate: string
  expiryDate: string | null
  nextInvoiceDate: string | null
  quotationValidUntil: string | null
  paymentTermDays: number
  notes: string | null
  customer: { id: number, name: string, email: string }
  plan: Plan
  lines: { id: number, productId: number, variantId: number | null, quantity: number }[]
  history: { id: number, fromStatus: SubscriptionStatus | null, toStatus: SubscriptionStatus, note: string | null, createdAt: string, changedBy: { name: string } | null }[]
  invoices: SubscriptionInvoice[]
  pricing: Pricing
  emailSent?: boolean
}

export interface InvoiceRow {
  id: number
  number: string
  status: InvoiceStatus
  periodStart: string
  periodEnd: string
  dueDate: string
  total: string
  amountPaid: string
  amountDue: string
  customer: { id: number, name: string }
  subscription: { id: number, number: string }
}

export interface InvoiceDetail extends InvoiceRow {
  issueDate: string
  subtotal: string
  discountTotal: string
  taxTotal: string
  sentAt: string | null
  customer: { id: number, name: string, email: string, phone: string | null, address: string | null }
  lines: (PricedLine & { id: number })[]
  payments: { id: number, method: string, amount: string, paidAt: string, note: string | null }[]
}

export interface BillingRunResult {
  date: string
  checked: number
  invoices: { id: number, number: string, subscriptionNumber: string, total: string, periodStart: string, periodEnd: string }[]
  closed: string[]
  errors: { subscriptionId: number, number: string, message: string }[]
}

export interface FormProduct {
  id: number
  name: string
  salesPrice: string
  variants: { id: number, attribute: string, value: string, extraPrice: string }[]
}

export interface FormOptions {
  customers: { id: number, name: string, email: string }[]
  plans: (Plan & { endDate: string | null })[]
  products: FormProduct[]
  templates: { id: number, name: string, planId: number, lines: { productId: number, variantId: number | null, quantity: number }[] }[]
}

export interface SubscriptionPayload {
  customerId?: number
  planId: number
  startDate?: string
  expiryDate?: string
  paymentTermDays: number
  notes: string | null
  lines: { productId: number, variantId: number | null, quantity: number }[]
}

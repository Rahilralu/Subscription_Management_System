export interface CartVariant {
  id: number
  label: string
  extraPrice: number
}

export interface PlanOption {
  id: number
  name: string
  billingPeriod: string
  minQuantity: number
}

// A line as the assistant suggests it, and as the cart keeps it.
export interface CartItem {
  productId: number
  name: string
  kind: 'core' | 'addon'
  reason: string
  quantity: number
  variantId: number | null
  variants: CartVariant[]
}

export interface QuoteLine {
  productId: number
  variantId: number | null
  name: string
  variant: string | null
  quantity: number
  unitPrice: string
  discountAmount: string
  taxAmount: string
  amount: string
}

// Prices always come from the server; the browser never calculates money.
export interface Quote {
  plan: { id: number, name: string, billingPeriod: string, minQuantity: number }
  // the plan's own price, charged on every invoice on top of the products; null when the plan is free
  planPrice: string | null
  lines: QuoteLine[]
  subtotal: string
  discountTotal: string
  taxTotal: string
  total: string
}

export interface Proposal {
  planId: number
  plans: PlanOption[]
  items: CartItem[]
  quote: Quote
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  proposal?: Proposal | null
  mode?: 'ai' | 'basic'
}

export const periodLabel: Record<string, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }

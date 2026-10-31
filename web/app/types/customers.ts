// Money and dates arrive from the API as strings

export interface CustomerContact {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  hasLogin: boolean
}

export interface CustomerRow extends CustomerContact {
  activeSubscriptions: number
  outstanding: string
  overdue: string
}

export interface CustomerSubscription {
  id: number
  number: string
  status: string
  nextInvoiceDate: string | null
  plan: { id: number, name: string }
}

export interface CustomerInvoice {
  id: number
  number: string
  status: string
  total: string
  amountPaid: string
  dueDate: string
  overdue: boolean
}

export interface CustomerDetail extends CustomerContact {
  createdAt: string
  subscriptions: CustomerSubscription[]
  invoices: CustomerInvoice[]
  outstanding: string
  overdue: string
}

export interface CustomerInput {
  name: string
  email: string
  phone: string
  address: string
}

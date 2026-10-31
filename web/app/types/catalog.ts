import type { BillingPeriod } from './billing'

export type ProductType = 'SERVICE' | 'GOODS'

export interface Variant {
  id?: number
  attribute: string
  value: string
  extraPrice: string
}

export interface Tax {
  id: number
  name: string
  type: 'PERCENT' | 'FIXED'
  rate: string
}

export interface Product {
  id: number
  name: string
  type: ProductType
  salesPrice: string
  costPrice: string
  notes: string | null
  active: boolean
  variants: Variant[]
  taxes: Tax[]
}

export interface ProductInput {
  name: string
  type: ProductType
  salesPrice: string
  costPrice: string
  notes: string
  active?: boolean
  taxIds: number[]
  variants: Variant[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type AmountType = 'PERCENT' | 'FIXED'

export interface TaxRecord extends Tax {
  active: boolean
  _count: { products: number }
}

export interface TaxInput {
  name: string
  type: AmountType
  rate: string
  active?: boolean
}

export interface PlanRules {
  autoClose: boolean
  closable: boolean
  pausable: boolean
  renewable: boolean
}

export interface PlanRecord extends PlanRules {
  id: number
  name: string
  price: string
  billingPeriod: BillingPeriod
  minQuantity: number
  startDate: string
  endDate: string | null
  active: boolean
  _count?: { subscriptions: number }
}

export interface PlanInput extends PlanRules {
  name: string
  price: string
  billingPeriod: BillingPeriod
  minQuantity: number
  startDate: string
  endDate: string
  active?: boolean
}

export type DiscountScope = 'PRODUCT' | 'SUBSCRIPTION'

export interface Discount {
  id: number
  name: string
  type: AmountType
  value: string
  scope: DiscountScope
  productId: number | null
  product: { id: number, name: string } | null
  minPurchase: string | null
  minQuantity: number | null
  usageLimit: number | null
  usedCount: number
  startDate: string
  endDate: string | null
  active: boolean
}

export interface DiscountInput {
  name: string
  type: AmountType
  value: string
  scope: DiscountScope
  productId: number | null
  minPurchase: string
  minQuantity: number | null
  usageLimit: number | null
  startDate: string
  endDate: string
  active?: boolean
}

export interface TemplateLine {
  id: number
  productId: number
  variantId: number | null
  quantity: number
  product: { id: number, name: string, salesPrice: string, active: boolean, variants: Variant[] }
  variant: { id: number, attribute: string, value: string, extraPrice: string } | null
}

export interface QuotationTemplate {
  id: number
  name: string
  planId: number
  validityDays: number
  notes: string | null
  plan: { id: number, name: string, billingPeriod: BillingPeriod, minQuantity: number, active: boolean }
  lines: TemplateLine[]
}

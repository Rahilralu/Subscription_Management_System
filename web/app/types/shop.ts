import type { CartItem, CartVariant } from '~/types/chat'

// What a customer can browse before asking for a quotation. Prices arrive as strings.

export interface ShopProduct {
  id: number
  name: string
  type: 'SERVICE' | 'GOODS'
  description: string | null
  price: string
  variants: CartVariant[]
}

export interface ShopPackage {
  id: number
  name: string
  description: string | null
  plan: { id: number, name: string, price: string, billingPeriod: string, minQuantity: number }
  // plan price plus products, per billing period, before tax and discounts
  priceBeforeTax: string
  includes: { name: string, variant: string | null, quantity: number }[]
  // the same lines in the shape the cart keeps
  items: CartItem[]
}

export interface ShopPlan {
  id: number
  name: string
  price: string
  billingPeriod: string
}

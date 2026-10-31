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

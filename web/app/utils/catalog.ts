import type { AmountType, Discount, DiscountInput, PlanRecord, PlanInput, Product, ProductInput, TaxInput, TaxRecord } from '~/types/catalog'

export function productToInput(product: Product): ProductInput {
  return {
    name: product.name,
    type: product.type,
    salesPrice: String(product.salesPrice),
    costPrice: String(product.costPrice),
    notes: product.notes ?? '',
    taxIds: product.taxes.map((tax) => tax.id),
    variants: product.variants.map(({ id, attribute, value, extraPrice }) => ({
      id,
      attribute,
      value,
      extraPrice: String(extraPrice),
    })),
  }
}



export function taxToInput(tax: TaxRecord): TaxInput {
  return { name: tax.name, type: tax.type, rate: String(tax.rate) }
}

export function planToInput(plan: PlanRecord): PlanInput {
  return {
    name: plan.name,
    price: String(plan.price),
    billingPeriod: plan.billingPeriod,
    minQuantity: plan.minQuantity,
    startDate: dateInputValue(plan.startDate),
    endDate: dateInputValue(plan.endDate),
    autoClose: plan.autoClose,
    closable: plan.closable,
    pausable: plan.pausable,
    renewable: plan.renewable,
  }
}

export function discountToInput(discount: Discount): DiscountInput {
  return {
    name: discount.name,
    type: discount.type,
    value: String(discount.value),
    scope: discount.scope,
    productId: discount.productId,
    minPurchase: discount.minPurchase == null ? '' : String(discount.minPurchase),
    minQuantity: discount.minQuantity,
    usageLimit: discount.usageLimit,
    startDate: dateInputValue(discount.startDate),
    endDate: dateInputValue(discount.endDate),
  }
}

// request bodies: the API wants null, not '', for "not set"
export const planBody = (input: PlanInput) => ({ ...input, endDate: input.endDate || null })

export const discountBody = (input: DiscountInput) => ({
  ...input,
  productId: input.scope === 'PRODUCT' ? input.productId : null,
  minPurchase: input.minPurchase || null,
  endDate: input.endDate || null,
})

export const formatAmount = (type: AmountType, value: string | number) =>
  type === 'PERCENT' ? `${Number(value)}%` : formatMoney(value)

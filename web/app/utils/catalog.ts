import type { Product, ProductInput } from '~/types/catalog'

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

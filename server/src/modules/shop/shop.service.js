import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

const MAX_PRODUCTS = 100

// Only what a customer needs to choose: never cost prices, and only products that are on sale.
const productSelect = {
  id: true,
  name: true,
  type: true,
  notes: true,
  salesPrice: true,
  variants: { select: { id: true, attribute: true, value: true, extraPrice: true }, orderBy: { id: 'asc' } },
}

// same shape the cart keeps, so a product can be dropped straight into it
const toCartVariant = (variant) => ({
  id: variant.id,
  label: `${variant.attribute}: ${variant.value}`,
  extraPrice: Number(variant.extraPrice),
})

const toCartItem = (product, variantId, quantity) => ({
  productId: product.id,
  name: product.name,
  kind: 'core',
  reason: '',
  quantity,
  variantId,
  variants: product.variants.map(toCartVariant),
})

export async function listProducts({ search }) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }] }),
    },
    select: productSelect,
    orderBy: { name: 'asc' },
    take: MAX_PRODUCTS,
  })

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    type: product.type,
    description: product.notes,
    price: product.salesPrice,
    variants: product.variants.map(toCartVariant),
  }))
}

// Ready-made bundles the admin set up (quotation templates). A bundle is only offered while its plan
// and every product in it are still on sale, so adding it to the cart always works.
export async function listPackages() {
  const templates = await prisma.quotationTemplate.findMany({
    include: {
      plan: { select: { id: true, name: true, price: true, billingPeriod: true, minQuantity: true, active: true } },
      lines: { include: { product: { select: { ...productSelect, active: true } }, variant: true }, orderBy: { id: 'asc' } },
    },
    orderBy: { name: 'asc' },
  })

  return templates
    .filter((template) => template.plan.active && template.lines.length > 0 && template.lines.every((line) => line.product.active))
    .map((template) => {
      // a rough "from" price per period, before tax and discounts: the plan price plus the products
      const priceBeforeTax = template.lines.reduce(
        (sum, line) => sum.plus(new Prisma.Decimal(line.product.salesPrice).plus(line.variant?.extraPrice ?? 0).times(line.quantity)),
        new Prisma.Decimal(template.plan.price),
      )

      return {
        id: template.id,
        name: template.name,
        description: template.notes,
        plan: {
          id: template.plan.id,
          name: template.plan.name,
          price: template.plan.price,
          billingPeriod: template.plan.billingPeriod,
          minQuantity: template.plan.minQuantity,
        },
        priceBeforeTax,
        includes: template.lines.map((line) => ({
          name: line.product.name,
          variant: line.variant ? `${line.variant.attribute}: ${line.variant.value}` : null,
          quantity: line.quantity,
        })),
        items: template.lines.map((line) => toCartItem(line.product, line.variantId, line.quantity)),
      }
    })
}

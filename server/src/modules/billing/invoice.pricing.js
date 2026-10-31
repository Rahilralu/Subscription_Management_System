import { calculateInvoice } from './invoice.calc.js'

// include this on subscription lines so they carry what the price calculation needs
export const lineInclude = {
  product: { include: { taxes: { where: { active: true } } } },
  variant: true,
}

export function describeLine(line) {
  const variant = line.variant ? ` (${line.variant.attribute}: ${line.variant.value})` : ''
  return `${line.product.name}${variant}`
}

// The plan's own price is charged once on every invoice, on top of the product lines. That is what makes
// the amount change when a subscription moves between plans. It has no product and no tax.
export function planFeeLine(plan) {
  return { productId: null, description: `${plan.name} plan`, quantity: 1, unitPrice: plan.price, taxes: [], planFee: true }
}

// plan is the subscription's plan. db can be the prisma client or a transaction client.
export async function priceLines(db, lines, plan, today) {
  const discounts = await db.discount.findMany({ where: { active: true } })
  const planFee = Number(plan.price) > 0 ? [planFeeLine(plan)] : []

  return calculateInvoice({
    lines: [
      ...planFee,
      ...lines.map((line) => ({
        productId: line.productId,
        description: describeLine(line),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxes: line.product.taxes,
      })),
    ],
    discounts,
    today,
  })
}

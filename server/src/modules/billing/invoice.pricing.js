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

// db can be the prisma client or a transaction client
export async function priceLines(db, lines, today) {
  const discounts = await db.discount.findMany({ where: { active: true } })

  return calculateInvoice({
    lines: lines.map((line) => ({
      productId: line.productId,
      description: describeLine(line),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxes: line.product.taxes,
    })),
    discounts,
    today,
  })
}

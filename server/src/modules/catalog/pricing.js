import { Prisma } from '@prisma/client'

const { Decimal } = Prisma

export function calculateTax(lines) {
  let subtotal = new Decimal(0)
  let taxTotal = new Decimal(0)

  const result = lines.map((line) => {
    const lineTotal = new Decimal(line.unitPrice).times(line.quantity)
    const taxAmount = new Decimal(0)

    subtotal = subtotal.plus(lineTotal)
    taxTotal = taxTotal.plus(taxAmount)

    return { ...line, subtotal: lineTotal, taxAmount }
  })

  return { lines: result, subtotal, taxTotal }
}

export async function findDiscounts(subscription, subtotal) {
  return []
}

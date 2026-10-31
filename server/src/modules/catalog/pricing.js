import { Prisma } from '@prisma/client'

const { Decimal } = Prisma

function lineTax(lineTotal, quantity, taxes = []) {
  let total = new Decimal(0)

  for (const tax of taxes) {
    if (tax.active === false) continue
    const amount =
      tax.type === 'PERCENT'
        ? lineTotal.times(tax.rate).dividedBy(100)
        : new Decimal(tax.rate).times(quantity)
    total = total.plus(amount)
  }

  return total.toDecimalPlaces(2)
}

export function calculateTax(lines) {
  let subtotal = new Decimal(0)
  let taxTotal = new Decimal(0)

  const result = lines.map((line) => {
    const lineTotal = new Decimal(line.unitPrice).times(line.quantity)
    const taxAmount = lineTax(lineTotal, line.quantity, line.taxes)

    subtotal = subtotal.plus(lineTotal)
    taxTotal = taxTotal.plus(taxAmount)

    return { ...line, subtotal: lineTotal, taxAmount, amount: lineTotal.plus(taxAmount) }
  })

  return { lines: result, subtotal, taxTotal }
}

export async function findDiscounts(subscription, subtotal) {
  return []
}

import { Prisma } from '@prisma/client'

const { Decimal } = Prisma
const ZERO = new Decimal(0)

const round = (value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
const sum = (values) => values.reduce((total, value) => total.plus(value), ZERO)

export function isDiscountUsable(discount, today) {
  if (!discount.active) return false
  if (discount.startDate > today) return false
  if (discount.endDate && discount.endDate < today) return false
  return discount.usageLimit == null || discount.usedCount < discount.usageLimit
}

function discountOn(discount, amount) {
  const raw = discount.type === 'PERCENT' ? amount.mul(discount.value).div(100) : new Decimal(discount.value)
  return round(Decimal.min(raw, amount))
}

// splits total in proportion to weights; the last row takes the rounding leftover
function allocate(total, weights) {
  const weightSum = sum(weights)
  if (weightSum.isZero()) return weights.map(() => ZERO)

  let left = total
  return weights.map((weight, i) => {
    const share = i === weights.length - 1 ? left : round(total.mul(weight).div(weightSum))
    left = left.minus(share)
    return share
  })
}

/**
 * lines:     [{ productId, description, quantity, unitPrice, taxes: [{ type, rate }] }]
 * discounts: Discount rows; eligibility (dates, usage limit, minimums) is decided here
 * Tax is charged on the price after discount. A FIXED tax is per unit.
 * total = subtotal - discountTotal + taxTotal, and every figure is the sum of its rounded line values.
 */
export function calculateInvoice({ lines, discounts = [], today }) {
  const usable = discounts.filter((discount) => isDiscountUsable(discount, today))
  const applied = new Set()

  const rows = lines.map((line) => {
    const base = round(new Decimal(line.unitPrice).mul(line.quantity))
    let discount = ZERO

    for (const d of usable) {
      if (d.scope !== 'PRODUCT' || d.productId !== line.productId) continue
      if (d.minQuantity != null && line.quantity < d.minQuantity) continue
      if (d.minPurchase != null && base.lt(d.minPurchase)) continue

      const amount = discountOn(d, base.minus(discount))
      if (amount.isZero()) continue
      discount = discount.plus(amount)
      applied.add(d.id)
    }
    return { line, base, discount }
  })

  const subtotal = sum(rows.map((row) => row.base))
  const totalQuantity = lines.reduce((count, line) => count + line.quantity, 0)

  let invoiceDiscount = ZERO
  for (const d of usable) {
    if (d.scope !== 'SUBSCRIPTION') continue
    if (d.minQuantity != null && totalQuantity < d.minQuantity) continue
    if (d.minPurchase != null && subtotal.lt(d.minPurchase)) continue

    const remaining = subtotal.minus(sum(rows.map((row) => row.discount))).minus(invoiceDiscount)
    const amount = discountOn(d, remaining)
    if (amount.isZero()) continue
    invoiceDiscount = invoiceDiscount.plus(amount)
    applied.add(d.id)
  }
  const shares = allocate(invoiceDiscount, rows.map((row) => row.base.minus(row.discount)))

  const resultLines = rows.map(({ line, base, discount }, i) => {
    const discountAmount = discount.plus(shares[i])
    const taxable = base.minus(discountAmount)
    const taxAmount = sum(
      (line.taxes ?? []).map((tax) =>
        tax.type === 'PERCENT' ? round(taxable.mul(tax.rate).div(100)) : round(new Decimal(tax.rate).mul(line.quantity)),
      ),
    )
    return {
      productId: line.productId,
      description: line.description,
      quantity: line.quantity,
      unitPrice: new Decimal(line.unitPrice),
      taxAmount,
      discountAmount,
      amount: taxable.plus(taxAmount),
    }
  })

  const discountTotal = sum(resultLines.map((line) => line.discountAmount))
  const taxTotal = sum(resultLines.map((line) => line.taxAmount))

  return {
    lines: resultLines,
    subtotal,
    discountTotal,
    taxTotal,
    total: subtotal.minus(discountTotal).plus(taxTotal),
    appliedDiscountIds: [...applied],
  }
}

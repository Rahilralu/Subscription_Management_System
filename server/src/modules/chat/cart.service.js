import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { nextNumber } from '../../lib/sequence.js'
import { logAudit } from '../../lib/audit.js'
import { addDays, businessToday } from '../../lib/dates.js'
import { priceLines } from '../billing/invoice.pricing.js'
import { buildLines, findActivePlan } from '../subscriptions/subscriptions.service.js'

const MAX_OPEN_QUOTATIONS = 10

// A plan can be switched on but still outside the dates it is offered, which customers must not pick.
export async function findAvailablePlan(planId) {
  const plan = await findActivePlan(planId)
  const today = businessToday()
  if (plan.startDate > today || (plan.endDate && plan.endDate < today)) {
    throw new HttpError(400, `The ${plan.name} plan is not available right now`)
  }
  return plan
}

// Validates the cart against the live catalog and prices it with the same rules invoices use.
// The browser only sends product ids and quantities; every amount here comes from the database.
// Returns the customer-facing quote plus the validated rows, which requestQuotation stores.
async function priceCart({ planId, lines }) {
  const plan = await findAvailablePlan(planId)
  const rows = await buildLines(lines, plan)

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: rows.map((row) => row.productId) } },
      include: { taxes: { where: { active: true } } },
    }),
    prisma.productVariant.findMany({ where: { id: { in: rows.flatMap((row) => (row.variantId ? [row.variantId] : [])) } } }),
  ])
  const productById = new Map(products.map((p) => [p.id, p]))
  const variantById = new Map(variants.map((v) => [v.id, v]))

  const priceable = rows.map((row) => ({
    ...row,
    product: productById.get(row.productId),
    variant: row.variantId ? variantById.get(row.variantId) : null,
  }))
  const pricing = await priceLines(prisma, priceable, businessToday())

  const quote = {
    plan: { id: plan.id, name: plan.name, billingPeriod: plan.billingPeriod, minQuantity: plan.minQuantity },
    lines: pricing.lines.map((line, i) => ({
      productId: line.productId,
      variantId: priceable[i].variantId,
      name: priceable[i].product.name,
      variant: priceable[i].variant ? `${priceable[i].variant.attribute}: ${priceable[i].variant.value}` : null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      taxAmount: line.taxAmount,
      amount: line.amount,
    })),
    subtotal: pricing.subtotal,
    discountTotal: pricing.discountTotal,
    taxTotal: pricing.taxTotal,
    total: pricing.total,
  }
  return { quote, rows, plan }
}

export async function quoteCart(input) {
  return (await priceCart(input)).quote
}

// Customers cannot create subscriptions themselves, so a request becomes a QUOTATION that staff
// then see in their normal subscription list and can confirm or change.
export async function requestQuotation(input, user) {
  if (!user.customerId) throw new HttpError(403, 'No customer account is linked to this login')

  const open = await prisma.subscription.count({ where: { customerId: user.customerId, status: 'QUOTATION' } })
  if (open >= MAX_OPEN_QUOTATIONS) {
    throw new HttpError(409, 'You already have several open quotations. Please wait for our team to respond to them first.')
  }

  const { rows, plan } = await priceCart(input)
  const startDate = businessToday()
  const expiryDate = plan.endDate && plan.endDate >= startDate ? plan.endDate : null
  const notes = ['Requested from the shopping cart', input.notes].filter(Boolean).join('\n')

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        number: await nextNumber(tx, 'SUB'),
        customerId: user.customerId,
        planId: plan.id,
        status: 'QUOTATION',
        startDate,
        expiryDate,
        quotationValidUntil: addDays(startDate, 30),
        notes,
        lines: { create: rows },
        history: { create: { toStatus: 'QUOTATION', changedById: user.sub, note: 'Requested by the customer from the cart' } },
      },
      select: { id: true, number: true, status: true },
    })

    await logAudit(
      user.sub,
      'cart.quotation_requested',
      'Subscription',
      subscription.id,
      { number: subscription.number, planId: plan.id, lines: rows.length },
      tx,
    )

    return subscription
  })
}

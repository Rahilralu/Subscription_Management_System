import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'

const templateInclude = {
  plan: { select: { id: true, name: true, billingPeriod: true, minQuantity: true, active: true } },
  lines: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          salesPrice: true,
          active: true,
          variants: { select: { id: true, attribute: true, value: true, extraPrice: true }, orderBy: { id: 'asc' } },
        },
      },
      variant: { select: { id: true, attribute: true, value: true, extraPrice: true } },
    },
    orderBy: { id: 'asc' },
  },
}

export function listTemplates() {
  return prisma.quotationTemplate.findMany({ include: templateInclude, orderBy: { name: 'asc' } })
}

export async function getTemplate(id) {
  const template = await prisma.quotationTemplate.findUnique({ where: { id }, include: templateInclude })
  if (!template) throw new HttpError(404, 'Template not found')
  return template
}

// Same rules the subscriptions service applies when a template is used,
// so a saved template can always be turned into a subscription.
async function checkTemplate({ planId, lines }) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan?.active) throw new HttpError(400, 'Plan not found or inactive')

  const productIds = lines.map((line) => line.productId)
  const variantIds = lines.flatMap((line) => (line.variantId ? [line.variantId] : []))
  const [products, variants] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, active: true }, select: { id: true, name: true } }),
    prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, productId: true } }),
  ])

  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId)
    if (!product) throw new HttpError(400, `Product ${line.productId} was not found or is inactive`)

    if (line.variantId && variants.find((v) => v.id === line.variantId)?.productId !== product.id) {
      throw new HttpError(400, `That option does not belong to ${product.name}`)
    }
    if (line.quantity < plan.minQuantity) {
      throw new HttpError(400, `${product.name}: the ${plan.name} plan needs a quantity of at least ${plan.minQuantity}`)
    }
  }
}

export async function createTemplate({ lines, ...data }) {
  await checkTemplate({ ...data, lines })
  return prisma.quotationTemplate.create({
    data: { ...data, lines: { create: lines } },
    include: templateInclude,
  })
}

export async function updateTemplate(id, { lines, ...data }) {
  await getTemplate(id)
  await checkTemplate({ ...data, lines })
  // lines carry no history of their own (subscriptions copy them), so replacing them is safe
  return prisma.quotationTemplate.update({
    where: { id },
    data: { ...data, lines: { deleteMany: {}, create: lines } },
    include: templateInclude,
  })
}

// Subscriptions copy a template's lines when created, so deleting one never affects them.
export async function deleteTemplate(id) {
  await getTemplate(id)
  await prisma.quotationTemplate.delete({ where: { id } })
  return { id }
}

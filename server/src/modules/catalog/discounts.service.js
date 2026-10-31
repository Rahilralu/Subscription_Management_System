import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'

const discountInclude = { product: { select: { id: true, name: true } } }

export function listDiscounts({ archived }) {
  return prisma.discount.findMany({
    where: { active: archived !== 'true' },
    include: discountInclude,
    orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
  })
}

export async function getDiscount(id) {
  const discount = await prisma.discount.findUnique({ where: { id }, include: discountInclude })
  if (!discount) throw new HttpError(404, 'Discount not found')
  return discount
}

async function checkProduct(productId, currentProductId) {
  if (!productId) return
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { active: true } })
  if (!product) throw new HttpError(400, 'Product not found')
  // keep an existing link to an archived product, but don't create new ones
  if (!product.active && productId !== currentProductId) throw new HttpError(400, 'That product is archived')
}

export async function createDiscount(data) {
  await checkProduct(data.productId)
  return prisma.discount.create({ data, include: discountInclude })
}

export async function updateDiscount(id, data) {
  const discount = await getDiscount(id)
  await checkProduct(data.productId, discount.productId)

  if (data.usageLimit != null && data.usageLimit < discount.usedCount) {
    throw new HttpError(400, `Usage limit cannot be below the ${discount.usedCount} times it has already been used`)
  }

  return prisma.discount.update({ where: { id }, data, include: discountInclude })
}

export async function archiveDiscount(id) {
  await getDiscount(id)
  return prisma.discount.update({ where: { id }, data: { active: false }, include: discountInclude })
}

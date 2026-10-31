import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'

const productInclude = {
  variants: { orderBy: { id: 'asc' } },
  taxes: { select: { id: true, name: true, type: true, rate: true } },
}

export async function listProducts({ search, page, pageSize, archived }) {
  const where = {
    active: archived !== 'true',
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  }

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getProduct(id) {
  const product = await prisma.product.findUnique({ where: { id }, include: productInclude })
  if (!product) throw new HttpError(404, 'Product not found')
  return product
}

async function checkTaxes(taxIds) {
  const count = await prisma.tax.count({ where: { id: { in: taxIds } } })
  if (count !== taxIds.length) throw new HttpError(400, 'One or more taxes do not exist')
}

export async function createProduct({ taxIds, variants, ...data }) {
  await checkTaxes(taxIds)

  return prisma.product.create({
    data: {
      ...data,
      taxes: { connect: taxIds.map((id) => ({ id })) },
      variants: { create: variants.map(({ id, ...variant }) => variant) },
    },
    include: productInclude,
  })
}

export async function updateProduct(id, { taxIds, variants, ...data }) {
  const product = await getProduct(id)
  await checkTaxes(taxIds)

  const existingIds = product.variants.map((v) => v.id)
  const keptIds = variants.filter((v) => v.id).map((v) => v.id)

  if (keptIds.some((variantId) => !existingIds.includes(variantId))) {
    throw new HttpError(400, 'Variant does not belong to this product')
  }

  const removedIds = existingIds.filter((variantId) => !keptIds.includes(variantId))
  if (removedIds.length) {
    const inSubscriptions = await prisma.subscriptionLine.count({ where: { variantId: { in: removedIds } } })
    const inTemplates = await prisma.quotationTemplateLine.count({ where: { variantId: { in: removedIds } } })
    if (inSubscriptions || inTemplates) {
      throw new HttpError(409, 'A removed variant is used in subscriptions or templates')
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...data,
      taxes: { set: taxIds.map((taxId) => ({ id: taxId })) },
      variants: {
        deleteMany: { id: { in: removedIds } },
        update: variants
          .filter((v) => v.id)
          .map(({ id: variantId, ...variant }) => ({ where: { id: variantId }, data: variant })),
        create: variants.filter((v) => !v.id),
      },
    },
    include: productInclude,
  })
}

export async function archiveProduct(id) {
  await getProduct(id)
  return prisma.product.update({ where: { id }, data: { active: false }, include: productInclude })
}

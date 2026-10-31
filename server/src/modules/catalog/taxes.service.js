import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'

export function listTaxes({ archived }) {
  return prisma.tax.findMany({
    where: { active: archived !== 'true' },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
}

async function getTax(id) {
  const tax = await prisma.tax.findUnique({ where: { id } })
  if (!tax) throw new HttpError(404, 'Tax not found')
  return tax
}

export function createTax(data) {
  return prisma.tax.create({ data })
}

export async function updateTax(id, data) {
  await getTax(id)
  return prisma.tax.update({ where: { id }, data })
}

export async function archiveTax(id) {
  await getTax(id)
  return prisma.tax.update({ where: { id }, data: { active: false } })
}

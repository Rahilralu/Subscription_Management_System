import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'

export function listPlans({ archived }) {
  return prisma.plan.findMany({
    where: { active: archived !== 'true' },
    include: { _count: { select: { subscriptions: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getPlan(id) {
  const plan = await prisma.plan.findUnique({ where: { id } })
  if (!plan) throw new HttpError(404, 'Plan not found')
  return plan
}

export function createPlan(data) {
  return prisma.plan.create({ data })
}

export async function updatePlan(id, data) {
  await getPlan(id)
  return prisma.plan.update({ where: { id }, data })
}

export async function archivePlan(id) {
  await getPlan(id)
  return prisma.plan.update({ where: { id }, data: { active: false } })
}

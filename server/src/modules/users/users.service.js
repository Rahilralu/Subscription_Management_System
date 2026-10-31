import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { logAudit } from '../../lib/audit.js'
import { hashPassword } from '../auth/auth.service.js'

const publicFields = { id: true, name: true, email: true, role: true, active: true, createdAt: true }

export function listUsers({ role, q }) {
  return prisma.user.findMany({
    where: {
      role,
      ...(q && {
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }],
      }),
    },
    select: publicFields,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
}

export async function createUser(adminId, { name, email, role, password }) {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists')
  }
  const passwordHash = await hashPassword(password)

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, role, passwordHash }, select: publicFields })
    await logAudit(adminId, 'user.create', 'User', user.id, { role }, tx)
    return user
  })
}

export async function updateUser(adminId, id, changes) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new HttpError(404, 'User not found')
  if (user.role === 'CUSTOMER') throw new HttpError(400, 'Customer accounts are not managed here')
  if (id === adminId && (changes.active === false || (changes.role && changes.role !== 'ADMIN'))) {
    throw new HttpError(400, 'You cannot deactivate yourself or remove your own admin access')
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: changes, select: publicFields })
    const action = changes.active === false ? 'user.deactivate' : changes.active === true ? 'user.activate' : 'user.update'
    await logAudit(adminId, action, 'User', id, changes, tx)
    return updated
  })
}

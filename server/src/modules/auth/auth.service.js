import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'

const userInclude = { customer: { select: { id: true } } }

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    customerId: user.customer?.id ?? null,
  }
}

function signToken(user) {
  const payload = { sub: user.id, role: user.role, customerId: user.customer?.id ?? null }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude })
  const valid = user?.active && (await bcrypt.compare(password, user.passwordHash))
  if (!valid) throw new HttpError(401, 'Wrong email or password')

  return { token: signToken(user), user: toPublicUser(user) }
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude })
  if (!user?.active) throw new HttpError(401, 'Account not found')
  return toPublicUser(user)
}

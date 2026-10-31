import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { sendMail } from '../../lib/mailer.js'
import { logAudit } from '../../lib/audit.js'

const userInclude = { customer: { select: { id: true } } }
const RESET_TOKEN_MINUTES = 30

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

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

export const hashPassword = (password) => bcrypt.hash(password, 10)

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude })
  const valid = user?.active && (await bcrypt.compare(password, user.passwordHash))
  if (!valid) throw new HttpError(401, 'Wrong email or password')

  return { token: signToken(user), user: toPublicUser(user) }
}

export async function signup({ name, email, password }) {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'An account with this email already exists')
  }
  const passwordHash = await hashPassword(password)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name, email, passwordHash, role: 'CUSTOMER' } })

    // staff may have created the customer record before they had a login
    const existing = await tx.customer.findUnique({ where: { email } })
    if (existing && existing.userId) throw new HttpError(409, 'An account with this email already exists')
    if (existing) {
      await tx.customer.update({ where: { id: existing.id }, data: { userId: created.id } })
    } else {
      await tx.customer.create({ data: { name, email, userId: created.id } })
    }

    await logAudit(created.id, 'user.signup', 'User', created.id, null, tx)
    return tx.user.findUnique({ where: { id: created.id }, include: userInclude })
  })

  return { token: signToken(user), user: toPublicUser(user) }
}

// Always succeeds from the caller's point of view, so it can't be used to find out which emails exist.
export async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.active) return

  const token = crypto.randomBytes(32).toString('base64url')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(token),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
    },
  })

  const link = `${env.appUrl}/reset-password?token=${token}`
  await sendMail({
    to: user.email,
    subject: 'Reset your Brightloop password',
    text: `Hi ${user.name},\n\nUse this link to set a new password. It expires in ${RESET_TOKEN_MINUTES} minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<p>Hi ${user.name},</p><p>Use this link to set a new password. It expires in ${RESET_TOKEN_MINUTES} minutes.</p><p><a href="${link}">Reset password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
  })
}

export async function resetPassword({ token, password }) {
  const user = await prisma.user.findUnique({ where: { resetTokenHash: hashToken(token) } })
  if (!user?.active || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw new HttpError(400, 'This reset link is invalid or has expired')
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetTokenExpiresAt: null },
    })
    await logAudit(user.id, 'auth.password_reset', 'User', user.id, null, tx)
  })
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude })
  if (!user?.active) throw new HttpError(401, 'Account not found')
  return toPublicUser(user)
}

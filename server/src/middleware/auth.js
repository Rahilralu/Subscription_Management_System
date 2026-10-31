import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../lib/http-error.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Please log in')

  try {
    req.user = jwt.verify(header.slice(7), env.jwtSecret)
  } catch {
    throw new HttpError(401, 'Session expired, please log in again')
  }

  // check the account is still active, so deactivating a user cuts off their session right away
  const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { active: true, role: true } })
  if (!user?.active) throw new HttpError(401, 'Your account is no longer active')
  req.user.role = user.role
  next()
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) throw new HttpError(403, 'You do not have access to this')
  next()
}

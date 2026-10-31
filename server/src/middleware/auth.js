import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { HttpError } from '../lib/http-error.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Please log in')

  try {
    req.user = jwt.verify(header.slice(7), env.jwtSecret)
  } catch {
    throw new HttpError(401, 'Session expired, please log in again')
  }
  next()
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) throw new HttpError(403, 'You do not have access to this')
  next()
}

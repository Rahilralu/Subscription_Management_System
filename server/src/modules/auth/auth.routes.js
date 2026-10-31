import { Router } from 'express'
import { env } from '../../config/env.js'
import { validate } from '../../middleware/validate.js'
import { requireAuth } from '../../middleware/auth.js'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js'
import * as auth from './auth.controller.js'

const router = Router()

// Counted per email (plus IP): it stops password guessing and reset-email floods against one account,
// and still works when every request reaches the API through the web app's proxy from one address.
export const attemptKey = (req) => `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`

const tooManyAttempts = (retryAfter) => `Too many attempts. Please wait ${retryAfter} seconds and try again.`
const limited = () => createRateLimiter({ limit: env.authRateLimitPerMin, key: attemptKey, message: tooManyAttempts })

router.post('/login', limited(), validate({ body: loginSchema }), auth.login)
router.post('/signup', limited(), validate({ body: signupSchema }), auth.signup)
router.post('/forgot-password', limited(), validate({ body: forgotPasswordSchema }), auth.forgotPassword)
// not limited: the reset token is 32 random bytes, so it cannot be guessed
router.post('/reset-password', validate({ body: resetPasswordSchema }), auth.resetPassword)
router.get('/me', requireAuth, auth.me)

export default router

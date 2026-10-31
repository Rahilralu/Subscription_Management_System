import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth } from '../../middleware/auth.js'
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js'
import * as auth from './auth.controller.js'

const router = Router()

router.post('/login', validate({ body: loginSchema }), auth.login)
router.post('/signup', validate({ body: signupSchema }), auth.signup)
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), auth.forgotPassword)
router.post('/reset-password', validate({ body: resetPasswordSchema }), auth.resetPassword)
router.get('/me', requireAuth, auth.me)

export default router

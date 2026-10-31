import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth } from '../../middleware/auth.js'
import { loginSchema } from './auth.schema.js'
import * as auth from './auth.controller.js'

const router = Router()

router.post('/login', validate({ body: loginSchema }), auth.login)
router.get('/me', requireAuth, auth.me)

export default router

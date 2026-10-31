import { Router } from 'express'
import { env } from '../../config/env.js'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { createRateLimiter } from '../../middleware/rate-limit.js'
import { messageSchema, quoteSchema, quoteRequestSchema } from './chat.schema.js'
import * as chat from './chat.controller.js'

const router = Router()

// the shopping assistant and cart are for customers; every handler uses the customer from the login
router.use(requireAuth, requireRole('CUSTOMER'))

// each message can cost an AI call, so cap how fast one user can send them
const messageLimit = createRateLimiter({ limit: env.chatRateLimitPerMin })

router.post('/message', messageLimit, validate({ body: messageSchema }), chat.message)
router.post('/quote', validate({ body: quoteSchema }), chat.quote)
router.post('/quote-request', validate({ body: quoteRequestSchema }), chat.quoteRequest)

export default router

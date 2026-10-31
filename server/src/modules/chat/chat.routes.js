import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { quoteSchema, quoteRequestSchema } from './chat.schema.js'
import * as chat from './chat.controller.js'

const router = Router()

// the shopping assistant and cart are for customers; every handler uses the customer from the login
router.use(requireAuth, requireRole('CUSTOMER'))

router.post('/quote', validate({ body: quoteSchema }), chat.quote)
router.post('/quote-request', validate({ body: quoteRequestSchema }), chat.quoteRequest)

export default router

import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { productQuery } from './shop.schema.js'
import * as shop from './shop.controller.js'

const router = Router()

// what customers can browse before they ask for a quotation; read-only
router.use(requireAuth, requireRole('CUSTOMER'))

router.get('/products', validate({ query: productQuery }), shop.products)
router.get('/packages', shop.packages)

export default router

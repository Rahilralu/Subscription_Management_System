import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { createCustomerSchema, idParams, listCustomersQuery, updateCustomerSchema } from './customers.schema.js'
import * as customers from './customers.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'STAFF'))

router.get('/', validate({ query: listCustomersQuery }), customers.list)
router.get('/:id', validate({ params: idParams }), customers.get)
router.post('/', validate({ body: createCustomerSchema }), customers.create)
router.put('/:id', validate({ params: idParams, body: updateCustomerSchema }), customers.update)

export default router

import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { productSchema, productListQuery, idParams } from './products.schema.js'
import { taxSchema, taxListQuery } from './taxes.schema.js'
import * as products from './products.controller.js'
import * as taxes from './taxes.controller.js'

const router = Router()

const staff = [requireAuth, requireRole('ADMIN', 'STAFF')]
const admin = [requireAuth, requireRole('ADMIN')]

router.get('/products', staff, validate({ query: productListQuery }), products.list)
router.get('/products/:id', staff, validate({ params: idParams }), products.get)
router.post('/products', admin, validate({ body: productSchema }), products.create)
router.put('/products/:id', admin, validate({ params: idParams, body: productSchema }), products.update)
router.delete('/products/:id', admin, validate({ params: idParams }), products.archive)

router.get('/taxes', staff, validate({ query: taxListQuery }), taxes.list)
router.post('/taxes', admin, validate({ body: taxSchema }), taxes.create)
router.put('/taxes/:id', admin, validate({ params: idParams, body: taxSchema }), taxes.update)
router.delete('/taxes/:id', admin, validate({ params: idParams }), taxes.archive)

export default router

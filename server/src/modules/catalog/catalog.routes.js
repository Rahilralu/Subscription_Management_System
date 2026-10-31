import { Router } from 'express'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { idParams } from './common.schema.js'
import { productSchema, productListQuery } from './products.schema.js'
import { taxSchema, taxListQuery } from './taxes.schema.js'
import { planSchema, planListQuery } from './plans.schema.js'
import { discountSchema, discountListQuery } from './discounts.schema.js'
import { templateSchema } from './templates.schema.js'
import * as products from './products.controller.js'
import * as taxes from './taxes.controller.js'
import * as plans from './plans.controller.js'
import * as discounts from './discounts.controller.js'
import * as templates from './templates.controller.js'

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

router.get('/plans', staff, validate({ query: planListQuery }), plans.list)
router.get('/plans/:id', staff, validate({ params: idParams }), plans.get)
router.post('/plans', admin, validate({ body: planSchema }), plans.create)
router.put('/plans/:id', admin, validate({ params: idParams, body: planSchema }), plans.update)
router.delete('/plans/:id', admin, validate({ params: idParams }), plans.archive)

// billing reads discounts straight from the database, so only admins need these
router.get('/discounts', admin, validate({ query: discountListQuery }), discounts.list)
router.get('/discounts/:id', admin, validate({ params: idParams }), discounts.get)
router.post('/discounts', admin, validate({ body: discountSchema }), discounts.create)
router.put('/discounts/:id', admin, validate({ params: idParams, body: discountSchema }), discounts.update)
router.delete('/discounts/:id', admin, validate({ params: idParams }), discounts.archive)

router.get('/templates', staff, templates.list)
router.get('/templates/:id', staff, validate({ params: idParams }), templates.get)
router.post('/templates', admin, validate({ body: templateSchema }), templates.create)
router.put('/templates/:id', admin, validate({ params: idParams, body: templateSchema }), templates.update)
router.delete('/templates/:id', admin, validate({ params: idParams }), templates.remove)

export default router

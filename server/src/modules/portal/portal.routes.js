import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { idParams, invoiceListQuery, createRequestSchema, confirmPaymentSchema } from './portal.schema.js'
import * as portal from './portal.controller.js'

const router = Router()

// customers only; every handler scopes to req.user.customerId
router.use(requireAuth, requireRole('CUSTOMER'))

router.get('/subscriptions', portal.subscriptions)
router.get('/subscriptions/:id', validate({ params: idParams }), portal.subscription)
router.post('/subscriptions/:id/requests', validate({ params: idParams, body: createRequestSchema }), portal.createRequest)
router.post('/subscriptions/:id/resume', validate({ params: idParams }), portal.resume)
router.post('/subscriptions/:id/accept', validate({ params: idParams }), portal.acceptQuotation)
router.get('/invoices', validate({ query: invoiceListQuery }), portal.invoices)
router.get('/invoices/:id', validate({ params: idParams }), portal.invoice)
router.get('/invoices/:id/pdf', validate({ params: idParams }), portal.invoicePdf)
router.get('/plans', portal.plans)
router.get('/payments/config', portal.paymentConfig)
router.post('/invoices/:id/checkout', validate({ params: idParams }), portal.startCheckout)
router.post('/invoices/:id/pay', validate({ params: idParams, body: confirmPaymentSchema }), portal.confirmPayment)

export default router

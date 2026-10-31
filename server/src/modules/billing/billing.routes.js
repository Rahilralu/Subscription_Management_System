import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { idParamSchema, invoiceListQuerySchema, runBillingSchema } from './billing.schema.js'
import * as billing from './billing.controller.js'

const router = Router()
const staff = requireRole('ADMIN', 'STAFF')
const byId = validate({ params: idParamSchema })

router.use(requireAuth)

router.post('/run', staff, validate({ body: runBillingSchema }), billing.run)

// customers can read and download their own invoices; everything else is for staff
router.get('/invoices', validate({ query: invoiceListQuerySchema }), billing.listInvoices)
router.get('/invoices/:id', byId, billing.getInvoice)
router.get('/invoices/:id/pdf', byId, billing.downloadPdf)
router.post('/invoices/:id/confirm', staff, byId, billing.confirmInvoice)
router.post('/invoices/:id/cancel', staff, byId, billing.cancelInvoice)
router.post('/invoices/:id/send', staff, byId, billing.sendInvoice)

export default router

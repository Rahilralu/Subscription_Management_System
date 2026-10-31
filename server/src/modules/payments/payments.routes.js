import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { idParamSchema, listPaymentsSchema, listReceivablesSchema, recordPaymentSchema } from './payments.schema.js'
import * as ctrl from './payments.controller.js'

const router = Router()
const team = requireRole('ADMIN', 'STAFF')

router.use(requireAuth)

// readable by everyone; customers are scoped to their own invoices in the service
router.get('/', validate({ query: listPaymentsSchema }), ctrl.list)
router.get('/receivables', validate({ query: listReceivablesSchema }), ctrl.receivables)
router.get('/invoices/:id', validate({ params: idParamSchema }), ctrl.invoicePayments)

router.post('/', team, validate({ body: recordPaymentSchema }), ctrl.record)
router.delete('/:id', requireRole('ADMIN'), validate({ params: idParamSchema }), ctrl.remove)

router.post('/reminders/run', team, ctrl.runReminders)
router.post('/invoices/:id/remind', team, validate({ params: idParamSchema }), ctrl.remindInvoice)

export default router

import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { auditListSchema, dashboardFilterSchema, filterOptionsSchema, overdueListSchema } from './dashboard.schema.js'
import * as ctrl from './dashboard.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'STAFF'))

router.get('/summary', validate({ query: dashboardFilterSchema }), ctrl.summary)
router.get('/charts', validate({ query: dashboardFilterSchema }), ctrl.charts)
router.get('/overdue', validate({ query: overdueListSchema }), ctrl.overdue)
router.get('/filter-options', validate({ query: filterOptionsSchema }), ctrl.filterOptions)
router.get('/audit', requireRole('ADMIN'), validate({ query: auditListSchema }), ctrl.audit)

export default router

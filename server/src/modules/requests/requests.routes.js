import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { listRequestsQuery, idParams, decisionSchema } from './requests.schema.js'
import * as requests from './requests.controller.js'

const router = Router()

router.use(requireAuth, requireRole('ADMIN', 'STAFF'))

router.get('/', validate({ query: listRequestsQuery }), requests.list)
router.post('/:id/approve', validate({ params: idParams, body: decisionSchema }), requests.approve)
router.post('/:id/reject', validate({ params: idParams, body: decisionSchema }), requests.reject)

export default router

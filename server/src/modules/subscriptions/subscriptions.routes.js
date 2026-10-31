import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { actionNames } from './subscriptions.service.js'
import {
  actionSchema,
  changePlanSchema,
  createSubscriptionSchema,
  fromTemplateSchema,
  idParamSchema,
  listQuerySchema,
  updateSubscriptionSchema,
} from './subscriptions.schema.js'
import * as subscriptions from './subscriptions.controller.js'

const router = Router()
const staff = requireRole('ADMIN', 'STAFF')

router.use(requireAuth)

// customers can read their own; everything that changes data is for staff
router.get('/', validate({ query: listQuerySchema }), subscriptions.list)
router.get('/options', staff, subscriptions.options)
router.post('/', staff, validate({ body: createSubscriptionSchema }), subscriptions.create)
router.post('/from-template', staff, validate({ body: fromTemplateSchema }), subscriptions.createFromTemplate)

router.get('/:id', validate({ params: idParamSchema }), subscriptions.get)
router.patch('/:id', staff, validate({ params: idParamSchema, body: updateSubscriptionSchema }), subscriptions.update)
router.post('/:id/renew', staff, validate({ params: idParamSchema }), subscriptions.renew)
router.post('/:id/change-plan', staff, validate({ params: idParamSchema, body: changePlanSchema }), subscriptions.changePlan)

// /:id/send-quotation, /confirm, /activate, /pause, /resume, /close
for (const action of actionNames) {
  router.post(
    `/:id/${action}`,
    staff,
    validate({ params: idParamSchema, body: actionSchema }),
    subscriptions.runAction(action),
  )
}

export default router

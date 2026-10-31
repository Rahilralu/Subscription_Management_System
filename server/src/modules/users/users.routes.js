import { Router } from 'express'
import { validate } from '../../middleware/validate.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { listUsersQuery, createUserSchema, updateUserSchema, idParams } from './users.schema.js'
import * as users from './users.controller.js'

const router = Router()

// only the admin manages staff accounts
router.use(requireAuth, requireRole('ADMIN'))

router.get('/', validate({ query: listUsersQuery }), users.list)
router.post('/', validate({ body: createUserSchema }), users.create)
router.patch('/:id', validate({ params: idParams, body: updateUserSchema }), users.update)

export default router

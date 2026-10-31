import { z } from 'zod'
import { emailSchema, passwordSchema } from '../auth/auth.schema.js'

const staffRole = z.enum(['STAFF', 'ADMIN'])

export const listUsersQuery = z.object({
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']).optional(),
  q: z.string().trim().optional(),
})

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(100),
  email: emailSchema,
  role: staffRole.default('STAFF'),
  password: passwordSchema,
})

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    role: staffRole.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update')

export const idParams = z.object({ id: z.coerce.number().int().positive() })

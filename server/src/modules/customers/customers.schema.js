import { z } from 'zod'
import { emailSchema } from '../auth/auth.schema.js'
import { paginationSchema } from '../../lib/pagination.js'

export const idParams = z.object({ id: z.coerce.number().int().positive() })

export const listCustomersQuery = z.object({
  search: z.string().trim().min(1).optional(),
  ...paginationSchema,
})

// optional text where a blank box means "nothing"
const optionalText = (max) =>
  z.string().trim().max(max, `Keep this under ${max} characters`).nullish().transform((value) => value || null)

const fields = {
  name: z.string().trim().min(1, 'Name is required').max(100, 'Keep the name under 100 characters'),
  phone: optionalText(30),
  address: optionalText(300),
}

export const createCustomerSchema = z.object({ ...fields, email: emailSchema })

// A PUT replaces name, phone and address. The email only changes if one is sent, and only for customers without a login.
export const updateCustomerSchema = z.object({ ...fields, email: emailSchema.optional() })

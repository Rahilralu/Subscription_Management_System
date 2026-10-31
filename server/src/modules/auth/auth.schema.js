import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'))

export const passwordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs a special character')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

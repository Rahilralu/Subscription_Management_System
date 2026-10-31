import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'))

// Keep in sync with web/app/utils/password.ts
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

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: emailSchema,
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is missing'),
  password: passwordSchema,
})

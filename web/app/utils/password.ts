import { z } from 'zod'

// Keep in sync with server/src/modules/auth/auth.schema.js
export const passwordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs a special character')

// same rules as passwordSchema, one by one, so forms can show which ones are still missing
export const passwordRules = [
  { label: 'More than 8 characters', test: (v: string) => v.length >= 9 },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

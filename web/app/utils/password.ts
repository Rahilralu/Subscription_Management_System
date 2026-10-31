import { z } from 'zod'

// Keep in sync with server/src/modules/auth/auth.schema.js
export const passwordSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs a special character')

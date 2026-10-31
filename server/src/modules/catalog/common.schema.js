import { z } from 'zod'

// money in, as a string with up to 2 decimals (Prisma Decimal accepts strings without float drift)
export const amount = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount'))

export const day = z.iso.date('Enter a valid date')

// date-only columns are stored as UTC midnight
export const toDay = (value) => (value ? new Date(`${value}T00:00:00.000Z`) : null)

export const idParams = z.object({
  id: z.coerce.number({ error: 'Invalid id' }).int().positive('Invalid id'),
})

export const archivedQuery = z.object({
  archived: z.enum(['true', 'false']).default('false'),
})

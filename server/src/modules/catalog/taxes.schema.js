import { z } from 'zod'

const amount = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount'))

export const taxSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    type: z.enum(['PERCENT', 'FIXED']),
    rate: amount,
    active: z.boolean().optional(),
  })
  .refine((tax) => tax.type !== 'PERCENT' || Number(tax.rate) <= 100, {
    path: ['rate'],
    message: 'Percent must be between 0 and 100',
  })

export const taxListQuery = z.object({
  archived: z.enum(['true', 'false']).default('false'),
})

import { z } from 'zod'
import { amount, archivedQuery } from './common.schema.js'

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

export const taxListQuery = archivedQuery

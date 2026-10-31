import { z } from 'zod'

export const idParams = z.object({ id: z.coerce.number().int().positive() })

export const invoiceListQuery = z.object({
  status: z.enum(['CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  overdue: z.stringbool().optional(),
})

export const createRequestSchema = z
  .object({
    type: z.enum(['PAUSE', 'UPGRADE']),
    planId: z.coerce.number().int().positive().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.type !== 'UPGRADE' || data.planId, { message: 'Choose the plan to move to', path: ['planId'] })

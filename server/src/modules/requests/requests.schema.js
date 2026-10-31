import { z } from 'zod'

export const listRequestsQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export const idParams = z.object({ id: z.coerce.number().int().positive() })

export const decisionSchema = z.object({
  decisionNote: z.string().trim().max(500).optional(),
})

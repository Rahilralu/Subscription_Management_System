import { z } from 'zod'
import { paginationSchema } from '../../lib/pagination.js'

const id = z.coerce.number().int().positive()
const isoDate = z.iso.date('Use the format YYYY-MM-DD')

export const dashboardFilterSchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    planId: id.optional(),
    customerId: id.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: 'Start date must be before end date', path: ['from'] })

export const overdueListSchema = z.object({
  ...paginationSchema,
  planId: id.optional(),
  customerId: id.optional(),
  search: z.string().trim().max(100).optional(),
})

export const filterOptionsSchema = z.object({ search: z.string().trim().max(100).optional() })

export const auditListSchema = z.object({
  ...paginationSchema,
  action: z.string().trim().max(100).optional(),
  entity: z.string().trim().max(50).optional(),
  entityId: id.optional(),
  userId: id.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
})

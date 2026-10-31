import { z } from 'zod'
import { amount, day, archivedQuery, toDay } from './common.schema.js'

export const planSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    price: amount,
    billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    minQuantity: z.coerce.number().int().min(1, 'Minimum quantity is at least 1').default(1),
    startDate: day,
    endDate: day.nullish(),
    autoClose: z.boolean().default(false),
    closable: z.boolean().default(true),
    pausable: z.boolean().default(false),
    renewable: z.boolean().default(true),
    active: z.boolean().optional(),
  })
  .refine((plan) => !plan.endDate || plan.endDate > plan.startDate, {
    path: ['endDate'],
    message: 'End date must be after start date',
  })
  .transform((plan) => ({
    ...plan,
    startDate: toDay(plan.startDate),
    endDate: toDay(plan.endDate),
  }))

export const planListQuery = archivedQuery

import { z } from 'zod'

const amount = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount'))

const day = z.iso.date('Enter a valid date')

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
    startDate: new Date(plan.startDate),
    endDate: plan.endDate ? new Date(plan.endDate) : null,
  }))

export const planListQuery = z.object({
  archived: z.enum(['true', 'false']).default('false'),
})

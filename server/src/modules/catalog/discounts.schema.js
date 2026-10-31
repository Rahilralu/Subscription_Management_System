import { z } from 'zod'
import { amount, day, archivedQuery, toDay } from './common.schema.js'

const positiveInt = (message) => z.coerce.number().int().min(1, message)

export const discountSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(['PERCENT', 'FIXED']),
    value: amount,
    scope: z.enum(['PRODUCT', 'SUBSCRIPTION']),
    productId: z.number().int().positive().nullish(),
    minPurchase: amount.nullish(),
    minQuantity: positiveInt('Minimum quantity is at least 1').nullish(),
    usageLimit: positiveInt('Usage limit is at least 1').nullish(),
    startDate: day,
    endDate: day.nullish(),
    active: z.boolean().optional(),
  })
  .superRefine((discount, ctx) => {
    if (Number(discount.value) <= 0) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Value must be more than 0' })
    }
    if (discount.type === 'PERCENT' && Number(discount.value) > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent must be between 0 and 100' })
    }
    if (discount.scope === 'PRODUCT' && !discount.productId) {
      ctx.addIssue({ code: 'custom', path: ['productId'], message: 'Choose a product' })
    }
    // a one-day discount is fine: billing treats both dates as inclusive
    if (discount.endDate && discount.endDate < discount.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date' })
    }
  })
  .transform((discount) => ({
    ...discount,
    productId: discount.scope === 'PRODUCT' ? discount.productId : null,
    minPurchase: discount.minPurchase ?? null,
    minQuantity: discount.minQuantity ?? null,
    usageLimit: discount.usageLimit ?? null,
    startDate: toDay(discount.startDate),
    endDate: toDay(discount.endDate),
  }))

export const discountListQuery = archivedQuery

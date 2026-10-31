import { z } from 'zod'

const id = z.coerce.number().int().positive()
const dateOnly = z.iso.date('Use the format YYYY-MM-DD').transform((value) => new Date(value))

export const idParamSchema = z.object({ id })

const lineSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullish(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
})

const detailsSchema = {
  planId: z.number().int().positive(),
  startDate: dateOnly.optional(),
  expiryDate: dateOnly.nullish(),
  paymentTermDays: z.number().int().min(0).max(365).optional(),
  notes: z.string().trim().max(1000).nullish(),
}

export const createSubscriptionSchema = z.object({
  customerId: z.number().int().positive(),
  ...detailsSchema,
  lines: z.array(lineSchema).min(1, 'Add at least one product').max(50),
})

export const fromTemplateSchema = z.object({
  templateId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  startDate: dateOnly.optional(),
})

export const updateSubscriptionSchema = z.object({
  ...Object.fromEntries(Object.entries(detailsSchema).map(([key, schema]) => [key, schema.optional()])),
  lines: z.array(lineSchema).min(1, 'Add at least one product').max(50).optional(),
})

export const actionSchema = z.object({
  note: z.string().trim().max(500).optional(),
  validDays: z.number().int().min(1).max(365).optional(),
})

export const changePlanSchema = z.object({
  planId: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
})

export const listQuerySchema = z.object({
  status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  customerId: id.optional(),
  search: z.string().trim().min(1).optional(),
  page: id.default(1),
  pageSize: id.max(100).default(20),
})

import { z } from 'zod'

const amount = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount'))

const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  attribute: z.string().trim().min(1, 'Attribute is required').max(50),
  value: z.string().trim().min(1, 'Value is required').max(50),
  extraPrice: amount,
})

export const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(['SERVICE', 'GOODS']),
    salesPrice: amount,
    costPrice: amount.default('0'),
    notes: z.string().trim().max(500).nullish(),
    active: z.boolean().optional(),
    taxIds: z.array(z.number().int().positive()).default([]),
    variants: z.array(variantSchema).default([]),
  })
  .superRefine((product, ctx) => {
    const seen = new Set()
    product.variants.forEach((variant, i) => {
      const key = `${variant.attribute.toLowerCase()}:${variant.value.toLowerCase()}`
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['variants', i, 'value'], message: 'Duplicate variant' })
      }
      seen.add(key)
    })
  })

export const productListQuery = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  archived: z.enum(['true', 'false']).default('false'),
})

export const idParams = z.object({
  id: z.coerce.number({ error: 'Invalid id' }).int().positive('Invalid id'),
})

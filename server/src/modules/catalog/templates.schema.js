import { z } from 'zod'

const lineSchema = z.object({
  productId: z.number().int().positive('Choose a product'),
  variantId: z.number().int().positive().nullish(),
  quantity: z.coerce.number().int().min(1, 'Quantity is at least 1'),
})

export const templateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    planId: z.number().int().positive('Choose a plan'),
    validityDays: z.coerce.number().int().min(1, 'At least 1 day').max(365, 'At most 365 days').default(30),
    notes: z.string().trim().max(500).nullish(),
    lines: z.array(lineSchema).min(1, 'Add at least one product'),
  })
  .superRefine((template, ctx) => {
    const seen = new Set()
    template.lines.forEach((line, i) => {
      const key = `${line.productId}:${line.variantId ?? 0}`
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['lines', i, 'productId'], message: 'This product is already on the template' })
      }
      seen.add(key)
    })
  })
  .transform((template) => ({
    ...template,
    notes: template.notes || null,
    lines: template.lines.map((line) => ({ ...line, variantId: line.variantId ?? null })),
  }))

import { z } from 'zod'

const id = z.coerce.number().int().positive()

const cartLine = z.object({
  productId: id,
  variantId: id.nullish().transform((v) => v ?? null),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10000),
})

export const quoteSchema = z.object({
  planId: id,
  lines: z.array(cartLine).min(1, 'Add at least one product').max(50, 'A quotation can have at most 50 lines'),
})

export const quoteRequestSchema = quoteSchema.extend({
  notes: z.string().trim().max(500).optional(),
})

export const MAX_MESSAGE_LENGTH = 1000
export const MAX_HISTORY = 20

export const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1, 'Message is empty').max(MAX_MESSAGE_LENGTH, `Keep messages under ${MAX_MESSAGE_LENGTH} characters`),
      }),
    )
    .min(1)
    .max(MAX_HISTORY)
    .refine((messages) => messages.at(-1).role === 'user', 'The last message must come from the user'),
})

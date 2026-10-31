import { z } from 'zod'
import { paginationSchema } from '../../lib/pagination.js'
import { formatDate, utcToday } from '../../lib/dates.js'

export const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'CHEQUE']

const id = z.coerce.number().int().positive()
const isoDate = z.iso.date('Use the format YYYY-MM-DD')

// Money comes in as a string so it never passes through float arithmetic.
const money = z.coerce
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with at most 2 decimals')
  .refine((v) => Number(v) > 0, 'Amount must be more than 0')

export const recordPaymentSchema = z.object({
  invoiceId: id,
  method: z.enum(paymentMethods, 'Choose a payment method'),
  amount: money,
  paidAt: isoDate
    .optional()
    .refine((v) => !v || v <= formatDate(utcToday()), 'Payment date cannot be in the future'),
  note: z.string().trim().max(500).optional(),
})

export const idParamSchema = z.object({ id })

export const listPaymentsSchema = z.object({
  ...paginationSchema,
  method: z.enum(paymentMethods).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  customerId: id.optional(),
  invoiceId: id.optional(),
  search: z.string().trim().max(100).optional(),
})

export const listReceivablesSchema = z.object({
  ...paginationSchema,
  state: z.enum(['all', 'paid', 'outstanding', 'overdue']).default('all'),
  from: isoDate.optional(),
  to: isoDate.optional(),
  customerId: id.optional(),
  planId: id.optional(),
  search: z.string().trim().max(100).optional(),
})

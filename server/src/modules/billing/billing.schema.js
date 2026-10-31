import { z } from 'zod'

const id = z.coerce.number().int().positive()

export const idParamSchema = z.object({ id })

// date lets staff run billing "as of" another day, e.g. to show next month's invoices in a demo
export const runBillingSchema = z.object({
  date: z.iso.date('Use the format YYYY-MM-DD').transform((value) => new Date(value)).optional(),
})

export const invoiceListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  overdue: z.enum(['true', 'false']).optional(),
  customerId: id.optional(),
  subscriptionId: id.optional(),
  search: z.string().trim().min(1).optional(),
  page: id.default(1),
  pageSize: id.max(100).default(20),
})

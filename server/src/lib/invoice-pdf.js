import { prisma } from './prisma.js'
import { HttpError } from './http-error.js'
import { renderInvoicePdf as drawInvoicePdf } from '../modules/billing/invoice.pdf.js'

// PDF for an invoice id, used by the customer portal. Who may download it is checked by the caller.
export async function renderInvoicePdf(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      subscription: { select: { id: true, number: true } },
      lines: { orderBy: { id: 'asc' } },
    },
  })
  if (!invoice) throw new HttpError(404, 'Invoice not found')

  return drawInvoicePdf({ ...invoice, amountDue: invoice.total.minus(invoice.amountPaid) })
}

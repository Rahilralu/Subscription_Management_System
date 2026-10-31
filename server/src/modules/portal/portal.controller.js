import { HttpError } from '../../lib/http-error.js'
import * as portalService from './portal.service.js'

function customerIdOf(req) {
  if (!req.user.customerId) throw new HttpError(403, 'No customer profile linked to this account')
  return req.user.customerId
}

export async function subscriptions(req, res) {
  res.json({ data: await portalService.listSubscriptions(customerIdOf(req)) })
}

export async function subscription(req, res) {
  res.json({ data: await portalService.getSubscription(customerIdOf(req), req.valid.params.id) })
}

export async function invoices(req, res) {
  res.json({ data: await portalService.listInvoices(customerIdOf(req), req.valid.query) })
}

export async function invoice(req, res) {
  res.json({ data: await portalService.getInvoice(customerIdOf(req), req.valid.params.id) })
}

export async function invoicePdf(req, res) {
  const invoice = await portalService.getInvoice(customerIdOf(req), req.valid.params.id)

  // P4 owns the PDF generator (lib/invoice-pdf.js exporting renderInvoicePdf(invoiceId) -> Buffer)
  const pdfModule = await import('../../lib/invoice-pdf.js').catch(() => null)
  if (!pdfModule?.renderInvoicePdf) throw new HttpError(501, 'Invoice PDFs are not available yet')

  const pdf = await pdfModule.renderInvoicePdf(invoice.id)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.number.replaceAll('/', '-')}.pdf"`)
  res.send(pdf)
}

export async function createRequest(req, res) {
  const data = await portalService.createRequest(customerIdOf(req), req.user.sub, req.valid.params.id, req.valid.body)
  res.status(201).json({ data })
}

export async function plans(req, res) {
  res.json({ data: await portalService.listPlans() })
}

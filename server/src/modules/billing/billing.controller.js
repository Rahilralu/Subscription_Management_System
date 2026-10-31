import * as billing from './billing.service.js'

export async function run(req, res) {
  res.json({ data: await billing.runBilling(req.valid.body) })
}

export async function listInvoices(req, res) {
  const { items, meta } = await billing.listInvoices(req.valid.query, req.user)
  res.json({ data: items, meta })
}

export async function getInvoice(req, res) {
  res.json({ data: await billing.getInvoice(req.valid.params.id, req.user) })
}

export async function confirmInvoice(req, res) {
  res.json({ data: await billing.confirmInvoice(req.valid.params.id, req.user) })
}

export async function cancelInvoice(req, res) {
  res.json({ data: await billing.cancelInvoice(req.valid.params.id, req.user) })
}

export async function sendInvoice(req, res) {
  res.json({ data: await billing.sendInvoice(req.valid.params.id, req.user) })
}

export async function downloadPdf(req, res) {
  const { invoice, pdf } = await billing.getInvoicePdf(req.valid.params.id, req.user)
  res
    .type('application/pdf')
    .set('Content-Disposition', `attachment; filename="${invoice.number.replaceAll('/', '-')}.pdf"`)
    .send(pdf)
}

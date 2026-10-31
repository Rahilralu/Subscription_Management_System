import * as taxes from './taxes.service.js'

export async function list(req, res) {
  res.json({ data: await taxes.listTaxes(req.valid.query) })
}

export async function create(req, res) {
  res.status(201).json({ data: await taxes.createTax(req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await taxes.updateTax(req.valid.params.id, req.valid.body) })
}

export async function archive(req, res) {
  res.json({ data: await taxes.archiveTax(req.valid.params.id) })
}

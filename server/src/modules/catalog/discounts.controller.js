import * as discounts from './discounts.service.js'

export async function list(req, res) {
  res.json({ data: await discounts.listDiscounts(req.valid.query) })
}

export async function get(req, res) {
  res.json({ data: await discounts.getDiscount(req.valid.params.id) })
}

export async function create(req, res) {
  res.status(201).json({ data: await discounts.createDiscount(req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await discounts.updateDiscount(req.valid.params.id, req.valid.body) })
}

export async function archive(req, res) {
  res.json({ data: await discounts.archiveDiscount(req.valid.params.id) })
}

import * as customers from './customers.service.js'

export async function list(req, res) {
  const { items, meta } = await customers.listCustomers(req.valid.query)
  res.json({ data: items, meta })
}

export async function get(req, res) {
  res.json({ data: await customers.getCustomer(req.valid.params.id) })
}

export async function create(req, res) {
  res.status(201).json({ data: await customers.createCustomer(req.user.sub, req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await customers.updateCustomer(req.user.sub, req.valid.params.id, req.valid.body) })
}

import * as products from './products.service.js'

export async function list(req, res) {
  res.json({ data: await products.listProducts(req.valid.query) })
}

export async function get(req, res) {
  res.json({ data: await products.getProduct(req.valid.params.id) })
}

export async function create(req, res) {
  res.status(201).json({ data: await products.createProduct(req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await products.updateProduct(req.valid.params.id, req.valid.body) })
}

export async function archive(req, res) {
  res.json({ data: await products.archiveProduct(req.valid.params.id) })
}

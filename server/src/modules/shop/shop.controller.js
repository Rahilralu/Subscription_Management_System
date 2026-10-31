import * as shop from './shop.service.js'

export async function products(req, res) {
  res.json({ data: await shop.listProducts(req.valid.query) })
}

export async function packages(req, res) {
  res.json({ data: await shop.listPackages() })
}

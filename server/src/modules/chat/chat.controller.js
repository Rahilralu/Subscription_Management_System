import * as cart from './cart.service.js'

export async function quote(req, res) {
  res.json({ data: await cart.quoteCart(req.valid.body) })
}

export async function quoteRequest(req, res) {
  res.status(201).json({ data: await cart.requestQuotation(req.valid.body, req.user) })
}

import * as cart from './cart.service.js'
import * as assistant from './chat.service.js'

export async function message(req, res) {
  res.json({ data: await assistant.respond(req.valid.body.messages) })
}

export async function quote(req, res) {
  res.json({ data: await cart.quoteCart(req.valid.body) })
}

export async function quoteRequest(req, res) {
  res.status(201).json({ data: await cart.requestQuotation(req.valid.body, req.user) })
}

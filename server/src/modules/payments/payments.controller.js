import * as payments from './payments.service.js'
import * as reminders from './reminders.service.js'

export async function list(req, res) {
  res.json(await payments.listPayments(req.valid.query, req.user))
}

export async function receivables(req, res) {
  res.json(await payments.listReceivables(req.valid.query, req.user))
}

export async function invoicePayments(req, res) {
  res.json({ data: await payments.getInvoicePayments(req.valid.params.id, req.user) })
}

export async function record(req, res) {
  res.status(201).json({ data: await payments.recordPayment(req.valid.body, req.user.sub) })
}

export async function remove(req, res) {
  res.json({ data: await payments.voidPayment(req.valid.params.id, req.user.sub) })
}

export async function runReminders(req, res) {
  res.json({ data: await reminders.sendOverdueReminders({ userId: req.user.sub }) })
}

export async function remindInvoice(req, res) {
  res.json({ data: await reminders.remindOne(req.valid.params.id, req.user.sub) })
}

import * as dashboard from './dashboard.service.js'
import { listReceivables } from '../payments/payments.service.js'

export async function summary(req, res) {
  res.json({ data: await dashboard.getSummary(req.valid.query) })
}

export async function charts(req, res) {
  res.json({ data: await dashboard.getCharts(req.valid.query) })
}

export async function overdue(req, res) {
  res.json(await listReceivables({ ...req.valid.query, state: 'overdue' }, req.user))
}

export async function filterOptions(req, res) {
  res.json({ data: await dashboard.getFilterOptions(req.valid.query.search) })
}

export async function audit(req, res) {
  res.json(await dashboard.listAudit(req.valid.query))
}

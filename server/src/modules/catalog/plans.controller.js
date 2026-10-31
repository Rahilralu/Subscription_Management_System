import * as plans from './plans.service.js'

export async function list(req, res) {
  res.json({ data: await plans.listPlans(req.valid.query) })
}

export async function get(req, res) {
  res.json({ data: await plans.getPlan(req.valid.params.id) })
}

export async function create(req, res) {
  res.status(201).json({ data: await plans.createPlan(req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await plans.updatePlan(req.valid.params.id, req.valid.body) })
}

export async function archive(req, res) {
  res.json({ data: await plans.archivePlan(req.valid.params.id) })
}

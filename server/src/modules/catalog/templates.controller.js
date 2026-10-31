import * as templates from './templates.service.js'

export async function list(req, res) {
  res.json({ data: await templates.listTemplates() })
}

export async function get(req, res) {
  res.json({ data: await templates.getTemplate(req.valid.params.id) })
}

export async function create(req, res) {
  res.status(201).json({ data: await templates.createTemplate(req.valid.body) })
}

export async function update(req, res) {
  res.json({ data: await templates.updateTemplate(req.valid.params.id, req.valid.body) })
}

export async function remove(req, res) {
  res.json({ data: await templates.deleteTemplate(req.valid.params.id) })
}

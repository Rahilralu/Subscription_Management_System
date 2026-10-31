import * as requestsService from './requests.service.js'

export async function list(req, res) {
  res.json({ data: await requestsService.listRequests(req.valid.query) })
}

export async function approve(req, res) {
  res.json({ data: await requestsService.decide(req.user.sub, req.valid.params.id, true, req.valid.body) })
}

export async function reject(req, res) {
  res.json({ data: await requestsService.decide(req.user.sub, req.valid.params.id, false, req.valid.body) })
}

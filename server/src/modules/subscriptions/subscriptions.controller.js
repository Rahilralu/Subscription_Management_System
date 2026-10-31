import * as subscriptions from './subscriptions.service.js'
import * as billing from '../billing/billing.service.js'

export async function list(req, res) {
  const { items, meta } = await subscriptions.listSubscriptions(req.valid.query, req.user)
  res.json({ data: items, meta })
}

export async function options(req, res) {
  res.json({ data: await subscriptions.getFormOptions() })
}

export async function get(req, res) {
  res.json({ data: await subscriptions.getSubscription(req.valid.params.id, req.user) })
}

export async function create(req, res) {
  res.status(201).json({ data: await subscriptions.createSubscription(req.valid.body, req.user) })
}

export async function createFromTemplate(req, res) {
  res.status(201).json({ data: await subscriptions.createFromTemplate(req.valid.body, req.user) })
}

export async function update(req, res) {
  res.json({ data: await subscriptions.updateSubscription(req.valid.params.id, req.valid.body, req.user) })
}

export const runAction = (action) => async (req, res) => {
  const id = req.valid.params.id
  const result = await subscriptions.runAction(id, action, req.user, req.valid.body)
  if (action !== 'activate') return res.json({ data: result })

  // Activating starts billing, so the first invoice (a draft for staff to review) is made now. If it
  // fails the subscription is still active and the daily billing run will try again.
  const invoicesCreated = await billing.billDuePeriods(id).catch((err) => {
    console.error(`Could not create the first invoice for subscription ${id}:`, err.message)
    return []
  })
  res.json({ data: { ...(await subscriptions.getSubscription(id, req.user)), invoicesCreated } })
}

export async function changePlan(req, res) {
  const { planId, note } = req.valid.body
  res.json({ data: await subscriptions.changePlan(req.valid.params.id, planId, req.user, { note }) })
}

export async function renew(req, res) {
  res.status(201).json({ data: await subscriptions.renewSubscription(req.valid.params.id, req.user) })
}

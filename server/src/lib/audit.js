import { prisma } from './prisma.js'

// Record who did what. Pass `tx` when inside a transaction so the log rolls back with the change.
// usage: await audit(tx, { userId: req.user.sub, action: 'payment.recorded', entity: 'Invoice', entityId: 12, data: {...} })
export function audit(tx, { userId = null, action, entity, entityId = null, data }) {
  return (tx ?? prisma).auditLog.create({
    data: { userId, action, entity, entityId, data: data === undefined ? undefined : toJson(data) },
  })
}

// Decimal / Date values are not plain JSON, so normalise them before storing
function toJson(value) {
  return JSON.parse(JSON.stringify(value))
}

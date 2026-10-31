import { prisma } from './prisma.js'

// Pass `tx` when logging inside a transaction, so the log rolls back with the change it describes.
export function audit(tx, { userId = null, action, entity, entityId = null, data }) {
  return (tx ?? prisma).auditLog.create({
    data: { userId, action, entity, entityId, data: data === undefined ? undefined : toJson(data) },
  })
}

export function logAudit(userId, action, entity, entityId = null, data = undefined, tx = prisma) {
  return audit(tx, { userId, action, entity, entityId, data })
}

// Decimal and Date values are not plain JSON
function toJson(value) {
  return JSON.parse(JSON.stringify(value))
}

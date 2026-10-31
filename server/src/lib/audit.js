import { prisma } from './prisma.js'

// Pass `tx` when logging inside a transaction, so the log rolls back with the change it describes.
// action is a short verb like 'user.create', entity is the model name like 'User'.
export function logAudit(userId, action, entity, entityId = null, data = undefined, tx = prisma) {
  return tx.auditLog.create({ data: { userId, action, entity, entityId, data } })
}

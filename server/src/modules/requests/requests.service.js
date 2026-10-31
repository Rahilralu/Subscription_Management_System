import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { logAudit } from '../../lib/audit.js'

export function listRequests({ status }) {
  return prisma.subscriptionRequest.findMany({
    where: { status },
    include: {
      subscription: { select: { id: true, number: true, status: true, plan: { select: { id: true, name: true } } } },
      customer: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true } },
      decidedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function decide(userId, id, approve, { decisionNote }) {
  return prisma.$transaction(async (tx) => {
    // only flip PENDING requests, so two staff clicking at once can't both decide it
    const { count } = await tx.subscriptionRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: approve ? 'APPROVED' : 'REJECTED', decidedById: userId, decidedAt: new Date(), decisionNote },
    })
    if (count === 0) {
      const exists = await tx.subscriptionRequest.findUnique({ where: { id }, select: { id: true } })
      throw exists ? new HttpError(409, 'This request has already been decided') : new HttpError(404, 'Request not found')
    }

    // TODO(P3 integration): on approval, apply the change through the subscriptions service
    // (PAUSE -> transitionSubscription(tx, subscriptionId, 'PAUSED', userId, note), UPGRADE -> plan change).
    // Until that lands, staff apply the change from the subscription page.

    await logAudit(userId, approve ? 'request.approve' : 'request.reject', 'SubscriptionRequest', id, { decisionNote }, tx)
    return tx.subscriptionRequest.findUnique({ where: { id } })
  })
}

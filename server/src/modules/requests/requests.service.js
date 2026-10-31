import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { logAudit } from '../../lib/audit.js'
import { sendMail } from '../../lib/mailer.js'
import { escapeHtml } from '../../lib/format.js'
import { transitionSubscription } from '../subscriptions/subscriptions.service.js'

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

// Runs inside the approval's transaction. If the pause can't happen (say the subscription was already
// paused by hand, or invoices are still due) the approval is undone and staff see why.
async function applyPause(tx, request, userId) {
  try {
    await transitionSubscription(tx, request.subscriptionId, 'pause', userId, { note: `Customer request #${request.id}` })
  } catch (err) {
    if (!(err instanceof HttpError)) throw err
    throw new HttpError(409, `The pause could not be applied: ${err.message}. Reject the request if it no longer applies.`)
  }
}

export async function decide(userId, id, approve, { decisionNote }) {
  const request = await prisma.$transaction(async (tx) => {
    // only flip PENDING requests, so two staff clicking at once can't both decide it
    const { count } = await tx.subscriptionRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: approve ? 'APPROVED' : 'REJECTED', decidedById: userId, decidedAt: new Date(), decisionNote },
    })
    if (count === 0) {
      const exists = await tx.subscriptionRequest.findUnique({ where: { id }, select: { id: true } })
      throw exists ? new HttpError(409, 'This request has already been decided') : new HttpError(404, 'Request not found')
    }

    const request = await tx.subscriptionRequest.findUnique({ where: { id } })
    if (approve && request.type === 'PAUSE') await applyPause(tx, request, userId)
    // TODO(P3 integration): UPGRADE (plan change) is not applied automatically yet. Until the team decides
    // what a plan change means for pricing, staff change the plan from the subscription page.

    await logAudit(userId, approve ? 'request.approve' : 'request.reject', 'SubscriptionRequest', id, { decisionNote }, tx)
    return request
  })

  await emailDecision(id)
  return request
}

// sent after the decision is saved, so a mail problem is logged instead of failing the request
async function emailDecision(id) {
  try {
    const request = await prisma.subscriptionRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        subscription: { select: { number: true } },
        plan: { select: { name: true } },
      },
    })

    const what = request.type === 'PAUSE' ? 'pause your subscription' : `change to the ${request.plan?.name} plan`
    const note = request.decisionNote ? `<p>Note from our team: ${escapeHtml(request.decisionNote)}</p>` : ''
    let outcome
    if (request.status === 'REJECTED') {
      outcome = `<p>We could not go ahead with your request to ${what} (${escapeHtml(request.subscription.number)}).</p>${note}`
    } else if (request.type === 'PAUSE') {
      outcome = `<p>Your subscription ${escapeHtml(request.subscription.number)} is now paused and you will not be invoiced while it is paused.</p>
        <p>When you resume, your next invoice and end date move back by the number of days you were paused.
        You can resume any time from your account: ${env.appUrl}</p>${note}`
    } else {
      outcome = `<p>We approved your request to ${what} (${escapeHtml(request.subscription.number)}). Our team will confirm once the change is made.</p>${note}`
    }

    await sendMail({
      to: request.customer.email,
      subject: `Your request to ${what}`,
      html: `<p>Hello ${escapeHtml(request.customer.name)},</p>${outcome}`,
    })
  } catch (err) {
    console.error(`Could not email the decision on request ${id}:`, err.message)
  }
}

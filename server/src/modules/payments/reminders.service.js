import { prisma } from '../../lib/prisma.js'
import { sendMail } from '../../lib/mailer.js'
import { audit } from '../../lib/audit.js'
import { env } from '../../config/env.js'
import { HttpError } from '../../lib/http-error.js'
import { addDays, formatDate, utcToday } from '../../lib/dates.js'
import { balanceOf, daysOverdue, overdueWhere } from '../../lib/invoice-state.js'

const BATCH_SIZE = 100
const inr = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))

function reminderEmail(invoice, today) {
  const balance = inr(balanceOf(invoice))
  const days = daysOverdue(invoice, today)
  const due = formatDate(invoice.dueDate)
  const late = days > 0 ? `${days} day${days === 1 ? '' : 's'} overdue` : `due on ${due}`
  const portalUrl = `${env.appUrl}/portal/invoices`

  return {
    to: invoice.customer.email,
    subject: `Payment reminder: invoice ${invoice.number} (${balance} ${days > 0 ? 'overdue' : 'due'})`,
    text: [
      `Hello ${invoice.customer.name},`,
      '',
      `Our records show that invoice ${invoice.number} is ${late}.`,
      `Amount outstanding: ${balance} (invoice total ${inr(invoice.total)}, due ${due}).`,
      '',
      `You can review the invoice in your portal: ${portalUrl}`,
      'If you have already paid, please ignore this message.',
      '',
      'Thank you,',
      'Brightloop Billing',
    ].join('\n'),
    html: `
      <p>Hello ${escapeHtml(invoice.customer.name)},</p>
      <p>Our records show that invoice <strong>${invoice.number}</strong> is <strong>${late}</strong>.</p>
      <table cellpadding="4" style="border-collapse:collapse">
        <tr><td>Invoice total</td><td align="right">${inr(invoice.total)}</td></tr>
        <tr><td>Already paid</td><td align="right">${inr(invoice.amountPaid)}</td></tr>
        <tr><td><strong>Outstanding</strong></td><td align="right"><strong>${balance}</strong></td></tr>
        <tr><td>Due date</td><td align="right">${due}</td></tr>
      </table>
      <p><a href="${portalUrl}">View your invoices</a></p>
      <p>If you have already paid, please ignore this message.</p>
      <p>Thank you,<br>Brightloop Billing</p>`,
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

async function deliver(invoice, { userId, today, manual }) {
  await sendMail(reminderEmail(invoice, today))
  const sentAt = new Date()
  await prisma.$transaction([
    prisma.invoice.update({ where: { id: invoice.id }, data: { lastReminderAt: sentAt, reminderCount: { increment: 1 } } }),
    audit(prisma, {
      userId,
      action: 'invoice.reminder_sent',
      entity: 'Invoice',
      entityId: invoice.id,
      data: { invoiceNumber: invoice.number, to: invoice.customer.email, balance: balanceOf(invoice), daysOverdue: daysOverdue(invoice, today), manual },
    }),
  ])
}

let running = false

// Email every overdue invoice that hasn't been reminded recently. Safe to run repeatedly:
// an invoice is reminded at most once per REMINDER_INTERVAL_DAYS and at most REMINDER_MAX_COUNT times.
export async function sendOverdueReminders({ now = new Date(), userId = null } = {}) {
  if (running) throw new HttpError(409, 'A reminder run is already in progress')
  running = true
  try {
    const today = utcToday(now)
    const cutoff = addDays(now, -env.reminderIntervalDays)
    const where = {
      ...overdueWhere(today),
      reminderCount: { lt: env.reminderMaxCount },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: cutoff } }],
    }

    const result = { sent: 0, failed: 0, errors: [] }
    let lastId = 0
    for (;;) {
      const batch = await prisma.invoice.findMany({
        where: { ...where, id: { gt: lastId } },
        include: { customer: { select: { name: true, email: true } } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
      })
      if (!batch.length) break
      lastId = batch.at(-1).id

      for (const invoice of batch) {
        try {
          await deliver(invoice, { userId, today, manual: false })
          result.sent++
        } catch (err) {
          result.failed++
          if (result.errors.length < 10) result.errors.push({ invoice: invoice.number, message: err.message })
        }
      }
    }

    await audit(prisma, { userId, action: 'reminders.run', entity: 'Invoice', data: { sent: result.sent, failed: result.failed } })
    return result
  } finally {
    running = false
  }
}

// Manual "send reminder" button: works for any unpaid confirmed invoice and ignores the interval.
export async function remindOne(invoiceId, userId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: { select: { name: true, email: true } } },
  })
  if (!invoice) throw new HttpError(404, 'Invoice not found')
  if (invoice.status !== 'CONFIRMED') throw new HttpError(400, 'Only confirmed, unpaid invoices can be reminded')

  try {
    await deliver(invoice, { userId, today: utcToday(), manual: true })
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(502, `Could not send the email: ${err.message}`)
  }
  return { sent: 1, to: invoice.customer.email }
}

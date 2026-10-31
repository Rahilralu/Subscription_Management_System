import cron from 'node-cron'
import { env } from '../config/env.js'
import { sendOverdueReminders } from '../modules/payments/reminders.service.js'
import { scheduleBillingRun } from '../modules/billing/billing.cron.js'

// Background jobs. Started from server.js only, so tests and scripts that import app.js don't schedule anything.
export function startJobs() {
  if (!env.cronEnabled) return

  // creates the draft invoices that are due, at 01:00 business time by default (BILLING_CRON)
  scheduleBillingRun()

  // every day at 09:00 server time: email customers about overdue invoices
  cron.schedule('0 9 * * *', async () => {
    try {
      const result = await sendOverdueReminders()
      console.log(`[jobs] overdue reminders: ${result.sent} sent, ${result.failed} failed`)
    } catch (err) {
      console.error('[jobs] overdue reminders failed', err)
    }
  })
  console.log('[jobs] overdue reminder job scheduled for 09:00 daily')
}

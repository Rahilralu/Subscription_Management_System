import cron from 'node-cron'
import { env } from '../../config/env.js'
import { BUSINESS_TZ } from '../../lib/dates.js'
import { runBilling } from './billing.service.js'

// called from jobs/index.js, which decides whether background jobs run at all
export function scheduleBillingRun() {
  cron.schedule(
    env.billingCron,
    async () => {
      try {
        const result = await runBilling()
        console.log(`[jobs] billing run: ${result.invoices.length} invoices, ${result.closed.length} closed, ${result.errors.length} errors`)
        for (const error of result.errors) console.error(`[jobs]   ${error.number}: ${error.message}`)
      } catch (err) {
        console.error('[jobs] billing run failed', err)
      }
    },
    { timezone: BUSINESS_TZ },
  )
  console.log(`[jobs] billing run scheduled (${env.billingCron}, ${BUSINESS_TZ})`)
}

import cron from 'node-cron'
import { env } from '../../config/env.js'
import { BUSINESS_TZ } from '../../lib/dates.js'
import { runBilling } from './billing.service.js'

export function startBillingCron() {
  if (env.billingCron === 'off') return

  cron.schedule(
    env.billingCron,
    async () => {
      try {
        const result = await runBilling()
        console.log(`Billing run: ${result.invoices.length} invoices, ${result.closed.length} closed, ${result.errors.length} errors`)
        for (const error of result.errors) console.error(`  ${error.number}: ${error.message}`)
      } catch (err) {
        console.error('Billing run failed:', err)
      }
    },
    { timezone: BUSINESS_TZ },
  )
  console.log(`Billing run scheduled (${env.billingCron}, ${BUSINESS_TZ})`)
}

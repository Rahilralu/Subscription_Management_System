import { env } from './config/env.js'
import { app } from './app.js'
import { startBillingCron } from './modules/billing/billing.cron.js'

app.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`)
  startBillingCron()
})

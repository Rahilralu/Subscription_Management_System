for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`${key} is not set in server/.env`)
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  mailFrom: process.env.MAIL_FROM ?? 'Brightloop Billing <billing@brightloop.local>',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  // when the automatic billing run happens; set BILLING_CRON=off to disable it
  billingCron: process.env.BILLING_CRON ?? '0 1 * * *',
}

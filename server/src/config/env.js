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
  cronEnabled: process.env.CRON_ENABLED !== 'false',
  billingCron: process.env.BILLING_CRON ?? '0 1 * * *',
  reminderIntervalDays: Number(process.env.REMINDER_INTERVAL_DAYS ?? 7),
  reminderMaxCount: Number(process.env.REMINDER_MAX_COUNT ?? 3),

  // shopping assistant: optional, the chat falls back to plain catalog search without a key
  openaiApiKey: process.env.OPENAI_API_KEY || null,
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  chatRateLimitPerMin: Number(process.env.CHAT_RATE_LIMIT_PER_MIN ?? 20),
}

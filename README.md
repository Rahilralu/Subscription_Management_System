# Subscription Management System

Subscription billing platform for Brightloop Software: products, plans, quotations, subscriptions,
recurring invoices, taxes, discounts, payments and reports. Built for the Odoo x VIT Pune Hackathon 2026.

Runs fully offline: Nuxt + Express + PostgreSQL, with Mailpit as the local mail inbox.

## Setup

Requirements: Node 22+, Docker.

```bash
docker compose up -d

cd server
# get server/.env from the team lead
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

cd ../web
npm install
npm run dev
```

- App: http://localhost:3000
- API: http://localhost:4000/api
- Mail inbox: http://localhost:8025

## Demo logins

| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@brightloop.local | Admin@1234    |
| Staff    | staff@brightloop.local | Staff@1234    |
| Customer | asha@example.com       | Customer@1234 |
| Customer | ravi@example.com       | Customer@1234 |

## Team

- P1 - auth, users, customer portal
- P2 - catalog: products, plans, taxes, discounts, quotation templates
- P3 - subscriptions, billing run, invoices
- P4 - payments, dashboard, seed data

## P4 notes: payments, dashboard, seed data

After pulling, run `npx prisma migrate dev` in `server/` (adds `Invoice.lastReminderAt`, `Invoice.reminderCount` and two indexes), then `npx prisma db seed`.

### Seed data

- `npx prisma db seed` creates users, products, plans plus ~10 customers, 25 subscriptions, ~100 invoices (paid, partly paid, overdue, draft, cancelled) and ~90 payments. It only adds the demo block on an empty database, so it is safe to re-run.
- `npm run db:seed:large` adds 2,000 customers, 10,000 subscriptions, ~72k invoices and ~70k payments in about 30 s. Rows use `@seed.example` emails; `npm run db:seed:large -- --reset` removes them and rebuilds. Invoice/subscription numbers continue from the shared `Counter` table.
- `npm run perf` (API must be running) times the dashboard, payments and receivables endpoints and fails if any p95 is 2 s or more. On the large seed the slowest is about 130 ms.

### API

| Endpoint | Who | What |
|---|---|---|
| `POST /api/payments` | admin, staff | Record a payment `{ invoiceId, method, amount, paidAt?, note? }`. Blocks overpayment and draft/cancelled/paid invoices; marks the invoice PAID when the balance reaches 0 |
| `DELETE /api/payments/:id` | admin | Void a payment (reopens the invoice) |
| `GET /api/payments` | all (customers see only their own) | Payments list: `method, from, to, customerId, invoiceId, search, page` |
| `GET /api/payments/receivables` | all (customers scoped) | Invoices by `state=paid\|outstanding\|overdue\|all` |
| `GET /api/payments/invoices/:id` | all (customers scoped) | One invoice with its payments |
| `POST /api/payments/reminders/run` | admin, staff | Email all overdue invoices that are due a reminder |
| `POST /api/payments/invoices/:id/remind` | admin, staff | Email one reminder now |
| `GET /api/dashboard/summary`, `/charts`, `/overdue`, `/filter-options` | admin, staff | Finance dashboard; filters `from, to, planId, customerId` |
| `GET /api/dashboard/audit` | admin | Audit log |

"Overdue" is derived, not stored: a `CONFIRMED` invoice whose `dueDate` is before today (partly paid invoices count until fully paid). Use `overdueWhere()` from `server/src/lib/invoice-state.js` so everyone agrees on the definition.

### Reminder emails

A daily job (09:00 server time) emails overdue customers. Each invoice is reminded at most once per `REMINDER_INTERVAL_DAYS` (default 7) and at most `REMINDER_MAX_COUNT` times (default 3). Set `CRON_ENABLED=false` in `server/.env` to turn the schedule off. Sent mail shows up in Mailpit at http://localhost:8025.

### For P3 (invoices) and everyone else

- Record a payment from an invoice page: `<RecordPaymentModal v-model:open="open" :invoice="invoice" @recorded="refresh" />` (`invoice` needs `id`, `number`, `total`, `amountPaid`, `balance`).
- Confirming an invoice (DRAFT to CONFIRMED) is what makes it payable and eligible for reminders. Payments only update `amountPaid` and set `PAID`; they never touch other fields.
- Write to the audit log inside your transaction: `await audit(tx, { userId: req.user.sub, action: 'invoice.confirmed', entity: 'Invoice', entityId: id, data: {...} })` from `server/src/lib/audit.js`. Admins can browse it at `/admin/audit`.
- Dashboard MRR sums active subscription lines (`quantity x unitPrice`, falling back to the plan price) normalised to a month, before tax.

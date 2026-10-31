# Subscription Management System

Subscription billing platform for Brightloop Software: products, plans, quotations, subscriptions,
recurring invoices, taxes, discounts, payments and reports. Built for the Odoo x VIT Pune Hackathon 2026.

Runs fully offline: Nuxt + Express + PostgreSQL, with Mailpit as the local mail inbox. The only feature
that needs the internet is the optional AI shopping assistant, and it falls back to plain search without it.

## What it does

| Who | What they can do |
|---|---|
| **Customer** | Sign up, reset a forgotten password by email, see their own subscriptions and invoices, download invoice PDFs, ask to pause or change plan, resume a paused subscription, chat with the shopping assistant, build a cart and request a quotation |
| **Staff** | Create subscriptions (from scratch or a quotation template) and move them through their lifecycle, run billing, confirm / send / cancel invoices, record payments, chase overdue invoices, manage customers, answer customer requests, use the finance dashboard |
| **Admin** | Everything staff can do, plus products and variants, plans, taxes, discounts, quotation templates, adding staff, voiding payments and the audit log |

Everyone can switch between light and dark themes from the account menu.

## Setup

Requirements: Node 22+, Docker.

```bash
docker compose up -d

cd server
# create server/.env (see "Configuration" below, or get it from the team lead)
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

cd ../web
npm install
npm run dev
```

After pulling new commits, run `npm install` in both folders and `npx prisma migrate dev` in `server/`.

- App: http://localhost:3000 (Nuxt moves to the next free port, e.g. 3001, if 3000 is taken)
- API: http://localhost:4000/api
- Mail inbox (Mailpit): http://localhost:8025
- Postgres: localhost:5433

### Configuration

`server/.env` (git-ignored). Only the first two are required.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | none | e.g. `postgresql://submgr:submgr@localhost:5433/submgr` |
| `JWT_SECRET` | none | Signs login tokens |
| `PORT` | `4000` | API port |
| `JWT_EXPIRES_IN` | `8h` | Login lifetime |
| `SMTP_HOST`, `SMTP_PORT` | `localhost`, `1025` | Mail server (Mailpit locally) |
| `MAIL_FROM` | `Brightloop Billing <billing@brightloop.local>` | Sender |
| `APP_URL` | `http://localhost:3000` | Used for links in emails |
| `CRON_ENABLED` | `true` | Set to `false` to turn off the scheduled jobs |
| `BILLING_CRON` | `0 1 * * *` | When the daily billing run happens |
| `BUSINESS_TZ` | `Asia/Kolkata` | Time zone that decides what "today" is |
| `REMINDER_INTERVAL_DAYS` | `7` | Minimum days between reminders for one invoice |
| `REMINDER_MAX_COUNT` | `3` | Most reminders one invoice will ever get |
| `OPENAI_API_KEY` | none | Turns on the AI assistant (optional) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Any chat model that supports tool calling |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | For a proxy or compatible server |
| `CHAT_RATE_LIMIT_PER_MIN` | `20` | Assistant messages per customer per minute |

Keep the OpenAI key in `server/.env` only. It must never be committed.

## Demo logins

| Role     | Email                  | Password      |
|----------|------------------------|---------------|
| Admin    | admin@brightloop.local | Admin@1234    |
| Staff    | staff@brightloop.local | Staff@1234    |
| Customer | asha@example.com       | Customer@1234 |
| Customer | ravi@example.com       | Customer@1234 |

The login page has one-click buttons for the demo accounts. The other demo customers (`rohan@`, `priya@`,
`vikram@` and so on, all `@example.com`) use the same customer password.

Passwords need more than 8 characters with an uppercase letter, a lowercase letter and a special character,
and each email can belong to only one account. Only an admin can add staff.

## How it works

### Catalog (admin)

- **Products**: name, type, sales price, cost price, notes, and variants that add to the price (for example the Odoo brand adds 560). Products are archived, not deleted.
- **Plans**: price, billing period (daily, weekly, monthly, yearly), minimum quantity, available dates, and per-plan switches for auto-close at the end date, closing early, pausing and renewing.
- **Taxes**: percent or fixed amount, attached to products and applied automatically.
- **Discounts**: fixed or percent, with a minimum purchase or quantity, start and end dates and a usage limit. They apply to a product or to the whole subscription, show up on the next invoice by themselves and stop when they expire or run out.
- **Quotation templates**: a plan plus product lines and a validity in days, to start a subscription without building it from scratch.

### Subscriptions

Each subscription has its own number (`SUB/<year>/<n>`), a customer, a plan, a start and expiry date, payment terms and lines (product, option, quantity, unit price, tax, amount).

`Draft` → `Quotation` → `Confirmed` → `Active` → `Closed`, with `Paused` between active and closed for plans that allow it. Every move is recorded with who did it, and staff can renew a closed or expiring one. Sending a quotation emails the customer.

Customers can ask to pause or change plan from the portal. Staff approve or reject at `/staff/requests` and the customer gets an email either way.

- Approving a pause pauses the subscription in the same transaction; resuming moves the next invoice and end dates back by the days paused.
- Approving a plan change moves the subscription to the new plan, charged from the next invoice. It is refused, and the request stays pending, if the plan is inactive, a line is below the plan minimum, or invoices are still due.

### Billing and invoices

- A daily job (and the **Run billing** button) creates invoices from subscriptions that are due. It catches up missed periods and never bills the same period twice.
- Every invoice charges the plan's own price once (no tax), plus the subscription's product lines (`quantity x unit price`). Discounts come off first and tax is charged on the discounted amount. Totals are exact decimals rounded half-up.
- Invoice status: `Draft` → `Confirmed` → `Paid`, or `Cancelled`. Staff can confirm, send by email, cancel and download a PDF; customers can download theirs.
- Subscriptions on plans with auto-close are closed when they expire.

### Payments and overdue

- Staff record a payment against an invoice with method (cash, bank transfer, card, UPI, cheque), amount, date and note. Partial payments are fine; **paying more than the balance is blocked**, and so is paying a draft, cancelled or already paid invoice. When the balance reaches zero the invoice becomes `Paid`.
- Two staff recording at the same moment cannot overpay: the invoice row is locked while a payment is recorded.
- Only an admin can void a payment, which reopens the invoice.
- **Overdue** is derived, not stored: a `Confirmed` invoice whose due date has passed, including partly paid ones. `overdueWhere()` in `server/src/lib/invoice-state.js` is the one definition everyone should use.
- A daily job at 09:00 emails customers about overdue invoices, at most once per `REMINDER_INTERVAL_DAYS` and `REMINDER_MAX_COUNT` times per invoice. Staff can also send one reminder or the whole batch from the dashboard.

### Finance dashboard (staff and admin)

Active subscriptions, MRR and ARR, revenue collected, amount invoiced and collection rate, outstanding and overdue totals, with filters for date range, plan and customer. Charts show invoiced vs collected over 12 months, overdue by age, payments by method and subscriptions by status, plus an overdue table with reminder and record-payment actions. MRR is, per active subscription, the plan price plus its lines, normalised to a month, before tax.

### AI shopping assistant (customers)

Customers get a chat button in the portal. They describe their business ("20 staff, need stock tracking and GST accounting") and the assistant searches the real catalog, suggests products and recommended add-ons, and shows a menu inside the chat to tick items, change options and quantities and pick a plan, with the price updating live. **Add selected to cart** fills the cart at `/portal/cart`, where everything can be changed again and **Request quotation** creates a `Quotation` subscription for staff to follow up. Nothing is charged.

- The model can only call four read-only tools: `search_catalog`, `list_plans`, `list_discounts` and `propose_cart`. The server validates every suggested cart and prices it with the same rules as invoices, so the AI can never set a price.
- Only the customer's typed messages and customer-safe catalog fields (names, notes, prices, options) go to OpenAI. Never cost prices, names, emails or invoices.
- Without a key, or if OpenAI fails or times out, the reply falls back to keyword matching and is labelled "Basic mode".
- The cart lives in the browser (one per user) and holds only product, option and quantity; prices always come from the server. A customer can have at most 10 open quotations.
- Products have no category column, so an add-on is a product whose `notes` start with "Add-on", and `notes` is also what search reads.

## API

All routes are under `/api` and return `{ data }` or `{ error: { message, details? } }`. Everything except `/auth` needs `Authorization: Bearer <token>`.

| Area | Routes | Who |
|---|---|---|
| Auth | `POST /auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me` | public / logged in |
| Users | `GET /users`, `POST /users`, `PATCH /users/:id` | admin |
| Catalog | `/catalog/products`, `/taxes`, `/plans`, `/templates` (read: staff, write: admin), `/catalog/discounts` (admin) | see left |
| Customers | `GET /customers`, `GET /customers/:id`, `POST /customers`, `PUT /customers/:id` | staff, admin |
| Subscriptions | `GET /subscriptions`, `/subscriptions/options`, `/subscriptions/:id`; `POST /subscriptions`, `/from-template`, `/:id/renew`, `/:id/change-plan`, `/:id/<action>`; `PATCH /:id` | read: all (customers see their own non-draft), write: staff |
| Billing | `POST /billing/run`; `GET /billing/invoices`, `/invoices/:id`, `/invoices/:id/pdf`; `POST /invoices/:id/confirm`, `/cancel`, `/send` | read: all (customers scoped), write: staff |
| Payments | `POST /payments`, `DELETE /payments/:id` (admin), `GET /payments`, `/payments/receivables?state=paid\|outstanding\|overdue\|all`, `/payments/invoices/:id`, `POST /payments/reminders/run`, `/payments/invoices/:id/remind` | record and remind: staff; reads: all (customers scoped) |
| Dashboard | `GET /dashboard/summary`, `/charts`, `/overdue`, `/filter-options` (staff), `/dashboard/audit` (admin) | staff, admin |
| Portal | `GET /portal/subscriptions`, `/subscriptions/:id`, `/invoices`, `/invoices/:id`, `/invoices/:id/pdf`, `/plans`; `POST /portal/subscriptions/:id/requests`, `/subscriptions/:id/resume` | customer |
| Requests | `GET /subscription-requests`, `POST /subscription-requests/:id/approve`, `/reject` | staff, admin |
| Assistant | `POST /chat/message`, `/chat/quote`, `/chat/quote-request` | customer |

`<action>` is one of `send-quotation`, `confirm`, `activate`, `pause`, `resume`, `close`.

## Seed data and performance

- `npx prisma db seed` creates the demo users, 14 products (including add-ons), three plans, a volume discount, about 10 customers, 25 subscriptions, ~100 invoices (paid, partly paid, overdue, draft, cancelled) and ~90 payments, plus a few `DEMO/...` records for the portal. It only adds demo subscriptions to an empty database, so it is safe to re-run.
- `npm run db:seed:large` adds 2,000 customers, 10,000 subscriptions, ~72k invoices and ~70k payments in about 30 seconds. Its rows use `@seed.example` emails; `npm run db:seed:large -- --reset` removes them and rebuilds. Numbering continues from the shared `Counter` table.
- `npm run perf` (API running) times the dashboard, payments and receivables endpoints and fails if any p95 is 2 s or more. On the large seed the slowest is about 130 ms.
- The large seed has about 16,000 overdue invoices, so do not press "Send due reminders" on it unless you want thousands of emails in Mailpit.

## Tests

```bash
cd server
npm test        # node --test: billing maths, dates, catalog, customers, payments, assistant
```

## Project layout

```
server/
  prisma/            schema, migrations, seed.js, seed-large.js
  src/
    modules/         auth, users, catalog, customers, subscriptions, billing,
                     payments, dashboard, portal, requests, chat
    lib/             audit, dates, sequence (numbering), invoice-state, mailer, pdf
    jobs/ + billing.cron.js   scheduled jobs
  scripts/perf-check.js
web/app/
  pages/             landing, login/signup/reset, admin/, staff/, portal/
  components/        shared UI, finance/ (dashboard), chat/ (assistant)
  stores/            auth, cart
  composables/       useApi, useFormat, useChat, useQuote, ...
```

## For developers

- Write to the audit log inside your transaction: `await audit(tx, { userId: req.user.sub, action: 'invoice.confirmed', entity: 'Invoice', entityId: id, data: {...} })` from `server/src/lib/audit.js`. Admins browse it at `/admin/audit`.
- Record a payment from any invoice page with `<RecordPaymentModal v-model:open="open" :invoice="invoice" @recorded="refresh" />` (the invoice needs `id`, `number`, `total`, `amountPaid`, `balance`).
- Confirming an invoice is what makes it payable and eligible for reminders. Payments only change `amountPaid` and set `Paid`.
- Dates are date-only values handled as UTC midnight; use `server/src/lib/dates.js` (`businessToday`, `addMonths` with month-end clamping) rather than raw `Date` maths.
- Invoice and subscription numbers come from `nextNumber(tx, prefix)` in `server/src/lib/sequence.js`; call it inside the transaction that creates the record.

## Team

- P1 - auth, users, customer portal, UI design system
- P2 - catalog: products, plans, taxes, discounts, quotation templates
- P3 - subscriptions, billing run, invoices, customer requests, customers page
- P4 - payments, dashboard, seed data, shopping assistant and cart

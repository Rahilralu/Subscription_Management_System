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

## Team

- P1 - auth, users, customer portal
- P2 - catalog: products, plans, taxes, discounts, quotation templates
- P3 - subscriptions, billing run, invoices
- P4 - payments, dashboard, seed data

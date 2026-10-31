import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { nextNumber } from '../src/lib/sequence.js'

const prisma = new PrismaClient()

async function upsertUser(name, email, role, password) {
  const passwordHash = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, passwordHash },
  })
}

async function upsertCustomer(name, email, extra = {}) {
  const user = await upsertUser(name, email, 'CUSTOMER', 'Customer@1234')
  return prisma.customer.upsert({
    where: { email },
    update: {},
    create: { name, email, userId: user.id, ...extra },
  })
}

// ---------- small date / money helpers (seed only) ----------

const DAY = 24 * 60 * 60 * 1000
const round2 = (n) => Math.round(n * 100) / 100

function utcToday() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY)
}

function addPeriod(date, period, n = 1) {
  const d = new Date(date)
  if (period === 'DAILY') return addDays(d, n)
  if (period === 'WEEKLY') return addDays(d, 7 * n)
  if (period === 'MONTHLY') d.setUTCMonth(d.getUTCMonth() + n)
  if (period === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + n)
  return d
}

// deterministic random so every teammate gets the same demo data
let rngState = 42
function rand() {
  rngState = (rngState * 1103515245 + 12345) % 2147483648
  return rngState / 2147483648
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

// ---------- demo data: customers, subscriptions, invoices, payments ----------

const demoCustomers = [
  ['Rohan Mehta', 'rohan@example.com', 'Mehta Traders, Pune'],
  ['Priya Nair', 'priya@example.com', 'Nair Textiles, Kochi'],
  ['Vikram Singh', 'vikram@example.com', 'Singh Logistics, Delhi'],
  ['Neha Joshi', 'neha@example.com', 'Joshi Bakery, Nagpur'],
  ['Arjun Rao', 'arjun@example.com', 'Rao Engineering, Bengaluru'],
  ['Kavya Iyer', 'kavya@example.com', 'Iyer Clinics, Chennai'],
  ['Sameer Khan', 'sameer@example.com', 'Khan Retail, Hyderabad'],
  ['Ananya Desai', 'ananya@example.com', 'Desai Studios, Mumbai'],
  ['Ishaan Patil', 'ishaan@example.com', 'Patil Agro, Nashik'],
]

const statusPath = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE']
const methods = ['BANK_TRANSFER', 'UPI', 'CARD', 'CASH', 'CHEQUE']

function lineTotals(lines, productsById) {
  let subtotal = 0
  let taxTotal = 0
  const invoiceLines = lines.map((line) => {
    const product = productsById[line.productId]
    const base = round2(Number(line.unitPrice) * line.quantity)
    const tax = round2(
      product.taxes.reduce(
        (sum, t) => sum + (t.type === 'PERCENT' ? (base * Number(t.rate)) / 100 : Number(t.rate) * line.quantity),
        0,
      ),
    )
    subtotal += base
    taxTotal += tax
    return {
      productId: line.productId,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxAmount: tax,
      discountAmount: 0,
      amount: round2(base + tax),
    }
  })
  return { invoiceLines, subtotal: round2(subtotal), taxTotal: round2(taxTotal), total: round2(subtotal + taxTotal) }
}

// Decide how far along an invoice is, based on how old it is.
function invoiceOutcome(dueDate, today, isLatest) {
  if (isLatest && rand() < 0.15) return 'DRAFT'
  if (dueDate >= today) return rand() < 0.3 ? 'PARTIAL' : 'OPEN'
  const r = rand()
  if (r < 0.72) return 'PAID'
  if (r < 0.87) return 'OPEN' // overdue, nothing paid
  if (r < 0.97) return 'PARTIAL' // overdue, part paid
  return 'CANCELLED'
}

async function seedDemoData(adminId) {
  const today = utcToday()

  const customers = [await prisma.customer.findUniqueOrThrow({ where: { email: 'asha@example.com' } })]
  for (const [name, email, address] of demoCustomers) {
    customers.push(await upsertCustomer(name, email, { address, phone: `+91 98${String(customers.length).padStart(8, '0')}` }))
  }

  const plans = Object.fromEntries((await prisma.plan.findMany()).map((p) => [p.name, p]))
  const products = await prisma.product.findMany({ include: { taxes: true, variants: true } })
  const productsById = Object.fromEntries(products.map((p) => [p.id, p]))
  const byName = Object.fromEntries(products.map((p) => [p.name, p]))
  const erp = byName['ERP License']
  const odoo = erp.variants.find((v) => v.value === 'Odoo')

  const lineOptions = [
    [{ product: erp, variant: odoo, quantity: 5 }],
    [{ product: erp, quantity: 3 }, { product: byName['Cloud Hosting'], quantity: 1 }],
    [{ product: byName['Cloud Hosting'], quantity: 2 }],
    [{ product: erp, variant: odoo, quantity: 12 }, { product: byName['Support Hours'], quantity: 4 }],
    [{ product: byName['Support Hours'], quantity: 10 }],
    [{ product: erp, quantity: 1 }],
  ]

  // [plan, status, how many periods ago it started]
  const subSpecs = [
    ['Monthly', 'ACTIVE', 10], ['Monthly', 'ACTIVE', 8], ['Monthly', 'ACTIVE', 6], ['Monthly', 'ACTIVE', 5],
    ['Monthly', 'ACTIVE', 4], ['Monthly', 'ACTIVE', 3], ['Monthly', 'ACTIVE', 2], ['Monthly', 'ACTIVE', 1],
    ['Monthly', 'ACTIVE', 9], ['Monthly', 'ACTIVE', 7], ['Yearly', 'ACTIVE', 1], ['Yearly', 'ACTIVE', 1],
    ['Yearly', 'ACTIVE', 0], ['Weekly', 'ACTIVE', 6], ['Weekly', 'ACTIVE', 3], ['Monthly', 'PAUSED', 6],
    ['Monthly', 'CLOSED', 12], ['Yearly', 'CLOSED', 2], ['Monthly', 'CONFIRMED', 0], ['Monthly', 'QUOTATION', 0],
    ['Yearly', 'QUOTATION', 0], ['Monthly', 'DRAFT', 0], ['Weekly', 'DRAFT', 0], ['Monthly', 'ACTIVE', 11],
    ['Monthly', 'ACTIVE', 3],
  ]

  for (const [i, [planName, status, periodsAgo]] of subSpecs.entries()) {
    const plan = plans[planName]
    const customer = customers[i % customers.length]
    const lines = lineOptions[i % lineOptions.length].map(({ product, variant, quantity }) => ({
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity,
      unitPrice: round2(Number(product.salesPrice) + Number(variant?.extraPrice ?? 0)),
      description: variant ? `${product.name} (${variant.attribute}: ${variant.value})` : product.name,
    }))

    let startDate = addPeriod(today, plan.billingPeriod, -periodsAgo)
    if (periodsAgo === 0) startDate = addDays(today, 7) // not started yet
    const paymentTermDays = pick([7, 15, 30])

    // when billing stops: closed subs ended a while ago, paused subs stopped 2 periods ago
    let billUntil = today
    let expiryDate = addPeriod(startDate, plan.billingPeriod, plan.billingPeriod === 'YEARLY' ? 2 : 12)
    if (status === 'CLOSED') {
      expiryDate = addPeriod(today, plan.billingPeriod, -1)
      billUntil = expiryDate
    }
    if (status === 'PAUSED') billUntil = addPeriod(today, plan.billingPeriod, -2)

    await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, 'SUB', startDate)
      const path = status === 'PAUSED' || status === 'CLOSED' ? [...statusPath, status] : statusPath.slice(0, statusPath.indexOf(status) + 1)

      const billed = ['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)
      const periodStarts = []
      if (billed) {
        for (let p = startDate; p <= billUntil && p < expiryDate; p = addPeriod(p, plan.billingPeriod)) periodStarts.push(p)
      }
      const nextInvoiceDate = status === 'ACTIVE' && periodStarts.length
        ? addPeriod(periodStarts.at(-1), plan.billingPeriod)
        : null

      const sub = await tx.subscription.create({
        data: {
          number,
          customerId: customer.id,
          planId: plan.id,
          status,
          startDate,
          expiryDate,
          nextInvoiceDate,
          quotationValidUntil: status === 'QUOTATION' ? addDays(today, 30) : null,
          paymentTermDays,
          lines: { create: lines.map(({ description, ...l }) => l) },
          history: {
            create: path.map((to, idx) => ({ fromStatus: idx ? path[idx - 1] : null, toStatus: to, changedById: adminId })),
          },
        },
      })

      const { invoiceLines, subtotal, taxTotal, total } = lineTotals(lines, productsById)
      for (const [idx, periodStart] of periodStarts.entries()) {
        const issueDate = periodStart
        const dueDate = addDays(issueDate, paymentTermDays)
        const outcome = invoiceOutcome(dueDate, today, idx === periodStarts.length - 1)

        let amountPaid = 0
        if (outcome === 'PAID') amountPaid = total
        if (outcome === 'PARTIAL') amountPaid = round2(total * (0.3 + rand() * 0.4))

        const invoiceStatus = { PAID: 'PAID', OPEN: 'CONFIRMED', PARTIAL: 'CONFIRMED', DRAFT: 'DRAFT', CANCELLED: 'CANCELLED' }[outcome]
        const invoice = await tx.invoice.create({
          data: {
            number: await nextNumber(tx, 'INV', issueDate),
            subscriptionId: sub.id,
            customerId: customer.id,
            status: invoiceStatus,
            periodStart,
            periodEnd: addDays(addPeriod(periodStart, plan.billingPeriod), -1),
            issueDate,
            dueDate,
            subtotal,
            taxTotal,
            total,
            amountPaid,
            sentAt: invoiceStatus === 'DRAFT' ? null : issueDate,
            lines: { create: invoiceLines },
          },
        })

        if (amountPaid > 0) {
          // a fully paid invoice is sometimes settled in two instalments
          const split = outcome === 'PAID' && rand() < 0.25 ? [round2(total / 2), round2(total - round2(total / 2))] : [amountPaid]
          for (const [n, amount] of split.entries()) {
            let paidAt = addDays(issueDate, Math.floor(rand() * paymentTermDays) + n * 3)
            if (paidAt > today) paidAt = today
            await tx.payment.create({
              data: { invoiceId: invoice.id, method: pick(methods), amount, paidAt, note: n ? 'Second instalment' : null, recordedById: adminId },
            })
          }
        }
      }
    })
  }
}

async function main() {
  const admin = await upsertUser('Admin', 'admin@brightloop.local', 'ADMIN', 'Admin@1234')
  await upsertUser('Staff User', 'staff@brightloop.local', 'STAFF', 'Staff@1234')

  await upsertCustomer('Asha Kulkarni', 'asha@example.com')

  const gst = await prisma.tax.upsert({
    where: { name: 'GST 18%' },
    update: {},
    create: { name: 'GST 18%', type: 'PERCENT', rate: 18 },
  })

  if ((await prisma.product.count()) === 0) {
    await prisma.product.create({
      data: {
        name: 'ERP License',
        salesPrice: 1200,
        costPrice: 400,
        taxes: { connect: { id: gst.id } },
        variants: { create: [{ attribute: 'Brand', value: 'Odoo', extraPrice: 560 }] },
      },
    })
    await prisma.product.create({
      data: { name: 'Cloud Hosting', salesPrice: 800, costPrice: 300, taxes: { connect: { id: gst.id } } },
    })
    await prisma.product.create({
      data: { name: 'Support Hours', salesPrice: 500, notes: 'Billed per hour' },
    })
  }

  const startDate = new Date('2026-01-01')
  await prisma.plan.upsert({
    where: { name: 'Monthly' },
    update: {},
    create: { name: 'Monthly', price: 1000, billingPeriod: 'MONTHLY', startDate, pausable: true },
  })
  await prisma.plan.upsert({
    where: { name: 'Yearly' },
    update: {},
    create: { name: 'Yearly', price: 10000, billingPeriod: 'YEARLY', startDate },
  })
  await prisma.plan.upsert({
    where: { name: 'Weekly' },
    update: {},
    create: { name: 'Weekly', price: 300, billingPeriod: 'WEEKLY', startDate, autoClose: true },
  })

  if ((await prisma.discount.count()) === 0) {
    await prisma.discount.create({
      data: { name: 'Volume 10%', type: 'PERCENT', value: 10, minQuantity: 10, startDate, scope: 'SUBSCRIPTION', usageLimit: 100 },
    })
  }

  await seedExtraCatalog(gst)

  // demo subscriptions/invoices/payments only on an empty database, so re-running the seed is safe.
  // Runs before seedPortalDemo, which adds subscriptions of its own.
  if ((await prisma.subscription.count()) === 0) {
    await seedDemoData(admin.id)
    console.log('Seeded demo subscriptions, invoices and payments')
  }

  await seedPortalDemo()
}

// More products so the shopping assistant has something to recommend. Products have no description or
// category column, so `notes` carries the searchable text, and add-ons start with "Add-on:".
// Added by name, so running the seed again never duplicates them.
const extraCatalog = [
  {
    name: 'Inventory Management', salesPrice: 900, costPrice: 300,
    notes: 'Inventory and stock management: multi-warehouse stock tracking, reorder alerts, barcode scanning, purchase orders. Suits retail, wholesale and distribution businesses.',
    variants: [{ attribute: 'Edition', value: 'Standard', extraPrice: 0 }, { attribute: 'Edition', value: 'Pro', extraPrice: 400 }],
  },
  {
    name: 'Accounting & GST', salesPrice: 1100, costPrice: 350,
    notes: 'Accounting with GST invoicing and returns, bank reconciliation, expense tracking and financial reports for small and mid-size businesses.',
    variants: [{ attribute: 'Edition', value: 'Standard', extraPrice: 0 }, { attribute: 'Edition', value: 'Pro', extraPrice: 500 }],
  },
  {
    name: 'CRM', salesPrice: 700, costPrice: 200,
    notes: 'Customer relationship management: leads, sales pipeline, follow-up reminders, quotations and email integration for sales teams.',
  },
  {
    name: 'HR & Payroll', salesPrice: 1000, costPrice: 320,
    notes: 'HR and payroll: employee records, attendance, leave, salary slips, PF and ESI compliance for growing teams.',
  },
  {
    name: 'Point of Sale', salesPrice: 850, costPrice: 250,
    notes: 'Point of sale for shops, cafes and restaurants: billing counter, barcode scanning, receipts, discounts, works offline and syncs later.',
  },
  {
    name: 'E-commerce Store', salesPrice: 950, costPrice: 300,
    notes: 'Online store connected to your inventory: product catalogue, payment gateway, order tracking and shipping labels.',
  },
  {
    name: 'Extra User Pack (10 users)', salesPrice: 600, costPrice: 100,
    notes: 'Add-on: ten more user seats for any module. Choose it when your team is larger than the base licence.',
  },
  {
    name: 'Priority Support', salesPrice: 1500, costPrice: 500,
    notes: 'Add-on: 24x7 priority support with a one-hour response time and a dedicated account manager.',
  },
  {
    name: 'Daily Backup & Recovery', salesPrice: 400, costPrice: 80,
    notes: 'Add-on: automatic daily backups kept for 30 days, with one-click restore. Protects against data loss.',
  },
  {
    name: 'Custom Domain & Branding', salesPrice: 300, costPrice: 40,
    notes: 'Add-on: use your own domain, logo and colours on invoices, emails and the customer portal.',
  },
  {
    name: 'Onboarding & Data Migration', salesPrice: 2500, costPrice: 900,
    notes: 'Add-on: guided setup, data import from spreadsheets or your old software, and staff training sessions.',
  },
]

async function seedExtraCatalog(gst) {
  for (const { variants, ...product } of extraCatalog) {
    if (await prisma.product.findFirst({ where: { name: product.name } })) continue
    await prisma.product.create({
      data: {
        ...product,
        taxes: { connect: { id: gst.id } },
        ...(variants && { variants: { create: variants } }),
      },
    })
  }
}

// A few hand-made subscriptions and invoices so the customer portal has something to show
// before the billing engine exists. Numbers use a DEMO prefix so they never clash with real ones.
async function seedPortalDemo() {
  if (await prisma.subscription.findUnique({ where: { number: 'DEMO/SUB/1' } })) return

  const asha = await prisma.customer.findUniqueOrThrow({ where: { email: 'asha@example.com' } })
  const monthly = await prisma.plan.findUniqueOrThrow({ where: { name: 'Monthly' } })
  const yearly = await prisma.plan.findUniqueOrThrow({ where: { name: 'Yearly' } })
  const erp = await prisma.product.findFirstOrThrow({ where: { name: 'ERP License' }, include: { variants: true } })
  const hosting = await prisma.product.findFirstOrThrow({ where: { name: 'Cloud Hosting' } })

  const other = await upsertUser('Ravi Mehta', 'ravi@example.com', 'CUSTOMER', 'Customer@1234')
  const ravi = await prisma.customer.upsert({
    where: { email: other.email },
    update: {},
    create: { name: other.name, email: other.email, userId: other.id },
  })

  const subscription = (number, customerId, plan, status, lines) =>
    prisma.subscription.create({
      data: {
        number,
        customerId,
        planId: plan.id,
        status,
        startDate: new Date('2026-08-01'),
        nextInvoiceDate: status === 'ACTIVE' ? new Date('2026-11-01') : null,
        lines: { create: lines },
        history: { create: [{ toStatus: 'DRAFT' }, { fromStatus: 'DRAFT', toStatus: status }] },
      },
    })

  const odoo = erp.variants[0]
  const ashaMonthly = await subscription('DEMO/SUB/1', asha.id, monthly, 'ACTIVE', [
    { productId: erp.id, variantId: odoo.id, quantity: 5, unitPrice: 1760 },
    { productId: hosting.id, quantity: 1, unitPrice: 800 },
  ])
  await subscription('DEMO/SUB/2', asha.id, yearly, 'PAUSED', [{ productId: hosting.id, quantity: 2, unitPrice: 800 }])
  const raviSub = await subscription('DEMO/SUB/3', ravi.id, monthly, 'ACTIVE', [
    { productId: hosting.id, quantity: 3, unitPrice: 800 },
  ])

  // 5 x 1760 + 800 = 9600, plus 18% GST
  const invoice = (number, sub, customerId, month, status, amountPaid) =>
    prisma.invoice.create({
      data: {
        number,
        subscriptionId: sub.id,
        customerId,
        status,
        periodStart: new Date(`2026-${month}-01`),
        periodEnd: new Date(Date.UTC(2026, Number(month), 0)),
        issueDate: new Date(`2026-${month}-01`),
        dueDate: new Date(`2026-${month}-15`),
        subtotal: 9600,
        taxTotal: 1728,
        total: 11328,
        amountPaid,
        lines: {
          create: [
            { productId: erp.id, description: 'ERP License (Brand: Odoo)', quantity: 5, unitPrice: 1760, taxAmount: 1584, amount: 10384 },
            { productId: hosting.id, description: 'Cloud Hosting', quantity: 1, unitPrice: 800, taxAmount: 144, amount: 944 },
          ],
        },
      },
    })

  await invoice('DEMO/INV/1', ashaMonthly, asha.id, '08', 'PAID', 11328)
  await invoice('DEMO/INV/2', ashaMonthly, asha.id, '09', 'CONFIRMED', 0)
  await invoice('DEMO/INV/3', ashaMonthly, asha.id, '10', 'CONFIRMED', 5000)
  await invoice('DEMO/INV/4', raviSub, ravi.id, '10', 'CONFIRMED', 0)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

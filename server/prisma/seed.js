import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function upsertUser(name, email, role, password) {
  const passwordHash = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, role, passwordHash },
  })
}

async function main() {
  await upsertUser('Admin', 'admin@brightloop.local', 'ADMIN', 'Admin@1234')
  await upsertUser('Staff User', 'staff@brightloop.local', 'STAFF', 'Staff@1234')

  const customerUser = await upsertUser('Asha Kulkarni', 'asha@example.com', 'CUSTOMER', 'Customer@1234')
  await prisma.customer.upsert({
    where: { email: customerUser.email },
    update: {},
    create: { name: customerUser.name, email: customerUser.email, userId: customerUser.id },
  })

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

  await seedPortalDemo()
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

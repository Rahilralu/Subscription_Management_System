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
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

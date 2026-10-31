import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { logAudit } from '../../lib/audit.js'
import { isOverdue, overdueWhere } from '../../lib/invoice-state.js'
import { pageArgs, pageMeta } from '../../lib/pagination.js'

const ZERO = new Prisma.Decimal(0)

const contactFields = { id: true, name: true, email: true, phone: true, address: true, userId: true, createdAt: true }

// userId is internal, the screens only need to know whether the customer can log in
function toContact({ userId, ...customer }) {
  return { ...customer, hasLogin: userId != null }
}

// what the customer still owes on the invoices matching where
async function balance(where) {
  const { _sum } = await prisma.invoice.aggregate({ where, _sum: { total: true, amountPaid: true } })
  return (_sum.total ?? ZERO).minus(_sum.amountPaid ?? ZERO)
}

// the same, for many customers at once
async function balancesByCustomer(customerIds, where) {
  const rows = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds }, ...where },
    _sum: { total: true, amountPaid: true },
  })
  return new Map(rows.map((row) => [row.customerId, row._sum.total.minus(row._sum.amountPaid)]))
}

export async function listCustomers(query) {
  const where = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {}

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select: {
        ...contactFields,
        _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      ...pageArgs(query),
    }),
    prisma.customer.count({ where }),
  ])

  const ids = customers.map((customer) => customer.id)
  const [outstanding, overdue] = await Promise.all([
    balancesByCustomer(ids, { status: 'CONFIRMED' }),
    balancesByCustomer(ids, overdueWhere()),
  ])

  const items = customers.map(({ _count, ...customer }) => ({
    ...toContact(customer),
    activeSubscriptions: _count.subscriptions,
    outstanding: outstanding.get(customer.id) ?? ZERO,
    overdue: overdue.get(customer.id) ?? ZERO,
  }))
  return { items, meta: pageMeta(query, total) }
}

export async function getCustomer(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      ...contactFields,
      subscriptions: {
        select: { id: true, number: true, status: true, nextInvoiceDate: true, plan: { select: { id: true, name: true } } },
        orderBy: { id: 'desc' },
      },
    },
  })
  if (!customer) throw new HttpError(404, 'Customer not found')

  const { subscriptions, ...contact } = customer
  const [invoices, outstanding, overdue] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: id },
      select: { id: true, number: true, status: true, total: true, amountPaid: true, dueDate: true },
      orderBy: { id: 'desc' },
      take: 100,
    }),
    balance({ customerId: id, status: 'CONFIRMED' }),
    balance({ customerId: id, ...overdueWhere() }),
  ])

  return {
    ...toContact(contact),
    subscriptions,
    invoices: invoices.map((invoice) => ({ ...invoice, overdue: isOverdue(invoice) })),
    outstanding,
    overdue,
  }
}

async function assertEmailFree(db, email) {
  if (await db.customer.findUnique({ where: { email }, select: { id: true } })) {
    throw new HttpError(409, 'A customer with this email already exists')
  }
}

// Staff-added customers have no login. If they sign up later with the same email, auth.service links the two.
export async function createCustomer(userId, { name, email, phone, address }) {
  return prisma.$transaction(async (tx) => {
    await assertEmailFree(tx, email)
    const customer = await tx.customer.create({ data: { name, email, phone, address }, select: contactFields })
    await logAudit(userId, 'customer.create', 'Customer', customer.id, { name, email }, tx)
    return toContact(customer)
  })
}

export async function updateCustomer(userId, id, { name, email, phone, address }) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id }, select: contactFields })
    if (!customer) throw new HttpError(404, 'Customer not found')

    // the email is the customer's username once they have a login, so it stays as it is
    const emailChanged = email !== undefined && email !== customer.email
    if (emailChanged) {
      if (customer.userId != null) throw new HttpError(409, "This customer has a login, so their email can't be changed")
      await assertEmailFree(tx, email)
    }

    const updated = await tx.customer.update({
      where: { id },
      data: { name, phone, address, ...(emailChanged && { email }) },
      select: contactFields,
    })
    await logAudit(userId, 'customer.update', 'Customer', id, { name, phone, address, ...(emailChanged && { email }) }, tx)
    return toContact(updated)
  })
}

import express from 'express'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import catalogRoutes from './modules/catalog/catalog.routes.js'
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes.js'
import billingRoutes from './modules/billing/billing.routes.js'
import paymentsRoutes from './modules/payments/payments.routes.js'
import dashboardRoutes from './modules/dashboard/dashboard.routes.js'
import portalRoutes from './modules/portal/portal.routes.js'
import requestsRoutes from './modules/requests/requests.routes.js'
import customersRoutes from './modules/customers/customers.routes.js'
import { notFound, errorHandler } from './middleware/error.js'

export const app = express()

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => res.json({ data: { ok: true } }))
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/subscriptions', subscriptionsRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/portal', portalRoutes)
app.use('/api/subscription-requests', requestsRoutes)
app.use('/api/customers', customersRoutes)

app.use(notFound)
app.use(errorHandler)

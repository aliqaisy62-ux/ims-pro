import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { rateLimit } from 'express-rate-limit'
import { logger } from './utils/logger'
import authRouter from './routes/auth.routes'
import itemRouter from './routes/item.routes'
import customerRouter from './routes/customer.routes'
import supplierRouter from './routes/supplier.routes'
import salesRouter from './routes/sales.routes'
import purchaseRouter from './routes/purchase.routes'
import { expenseRouter, expenseCategoryRouter } from './routes/expense.routes'
import voucherRouter from './routes/voucher.routes'
import stockRouter from './routes/stock.routes'
import cashStatementRouter from './routes/cashStatement.routes'
import settingsRouter from './routes/settings.routes'
import reportsRouter from './routes/reports.routes'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(',')
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true)
    // Allow any LAN/private-network origin in development
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)
    ) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP',
}))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/items', itemRouter)
app.use('/api/customers', customerRouter)
app.use('/api/suppliers', supplierRouter)
app.use('/api/sales', salesRouter)
app.use('/api/purchases', purchaseRouter)
app.use('/api/expenses', expenseRouter)
app.use('/api/expense-categories', expenseCategoryRouter)
app.use('/api/vouchers', voucherRouter)
app.use('/api/stock', stockRouter)
app.use('/api/cash-statement', cashStatementRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/reports', reportsRouter)

app.listen(PORT, () => {
  logger.info(`IMS-Pro API running on port ${PORT}`)
})

export default app

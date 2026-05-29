import 'dotenv/config'
import { z } from 'zod'
import express, { NextFunction, Request, Response } from 'express'
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
import posRouter from './routes/pos.routes'
import systemRouter from './routes/system.routes'
import auditRouter from './routes/audit.routes'

// Fail fast on startup if required secrets are absent or obviously weak
const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})
try {
  envSchema.parse(process.env)
} catch (e) {
  console.error('[startup] FATAL — missing or invalid environment variables:', e)
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 4000
const isDev = process.env.NODE_ENV !== 'production'

// Trust Railway/Vercel/Heroku reverse proxy so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of crashing.
app.set('trust proxy', 1)

app.use(helmet())

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((s) => s.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    // LAN/private-network origins only in development — never in production with credentials
    if (isDev && /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
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
app.get('/api/health', (_req, res) => {
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
app.use('/api/pos', posRouter)
app.use('/api/system', systemRouter)
app.use('/api/audit', auditRouter)

// Global error handler — stack traces logged server-side only, never sent to client in production
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message, { stack: err.stack })
  res.status(500).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
  })
})

app.listen(PORT, () => {
  logger.info(`IMS-Pro API running on port ${PORT}`)
})

export default app

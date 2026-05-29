// Re-export real Decimal from Prisma runtime for unit tests.
// Prisma's Decimal is Decimal.js under the hood — same arithmetic in tests as in production.
export { Decimal } from '../../../../node_modules/@prisma/client/runtime/library'

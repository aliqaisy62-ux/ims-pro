import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// This script is for development/staging environments only.
// Never run in production without explicit intent.
if (process.env.NODE_ENV === 'production') {
  console.error('❌ seed-system-users.ts must not run in production. Exiting.')
  process.exit(1)
}

const prisma = new PrismaClient()

const adminPassword  = process.env.SEED_SYSTEM_ADMIN_PASSWORD
const cashierPassword = process.env.SEED_SYSTEM_CASHIER_PASSWORD

if (!adminPassword || !cashierPassword) {
  console.error('❌ SEED_SYSTEM_ADMIN_PASSWORD and SEED_SYSTEM_CASHIER_PASSWORD must be set.')
  console.error('   These are never hardcoded. Set them in your local .env file.')
  process.exit(1)
}

const users = [
  { username: 'admin@system.com',   name: 'System Admin',   password: adminPassword,   role: 'ADMIN'   },
  { username: 'cashier@system.com', name: 'System Cashier', password: cashierPassword, role: 'CASHIER' },
]

async function main() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12)
    const result = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, role: u.role, isActive: true, name: u.name },
      create: { username: u.username, name: u.name, passwordHash, role: u.role, language: 'ar' },
    })
    console.log(`✓ ${result.role.padEnd(7)} — ${result.username}  (id: ${result.id})`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

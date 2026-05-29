import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Development helper — seeds a single cashier user for local testing.
// Never run in production. Requires SEED_CASHIER_PASSWORD env var.
if (process.env.NODE_ENV === 'production') {
  console.error('❌ seed-cashier.ts must not run in production. Exiting.')
  process.exit(1)
}

const password = process.env.SEED_CASHIER_PASSWORD
if (!password) {
  console.error('❌ SEED_CASHIER_PASSWORD is not set.')
  console.error('   Set it in your local .env file before running this seed.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash(password!, 12)
  const user = await prisma.user.upsert({
    where: { username: 'cashier@test.com' },
    update: { passwordHash, role: 'CASHIER', isActive: true },
    create: {
      username: 'cashier@test.com',
      name: 'Test Cashier',
      passwordHash,
      role: 'CASHIER',
      language: 'ar',
    },
  })
  console.log(`✓ Cashier user ready — username: ${user.username}  id: ${user.id}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12)
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

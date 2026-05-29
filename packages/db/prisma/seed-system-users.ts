import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const users = [
  { username: 'admin@system.com',   name: 'System Admin',    password: 'Admin@12345',   role: 'ADMIN' },
  { username: 'cashier@system.com', name: 'System Cashier',  password: 'Cashier@12345', role: 'CASHIER' },
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

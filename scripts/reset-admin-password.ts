/**
 * Reset the admin user's password.
 * Usage:  ADMIN_PASSWORD=<new_password> npx tsx scripts/reset-admin-password.ts
 *         ADMIN_USERNAME=manager1 ADMIN_PASSWORD=<new_password> npx tsx scripts/reset-admin-password.ts
 *
 * WARNING: This script is for local / emergency use only.
 */

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const NEW_PASSWORD    = process.env.ADMIN_PASSWORD

if (!NEW_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required.')
  console.error('   Usage: ADMIN_PASSWORD=<new_password> npx tsx scripts/reset-admin-password.ts')
  process.exit(1)
}

if (NEW_PASSWORD.length < 12) {
  console.error('❌ ADMIN_PASSWORD must be at least 12 characters.')
  process.exit(1)
}

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD!, 12)

  const user = await prisma.user.findFirst({ where: { username: TARGET_USERNAME } })

  if (!user) {
    console.error(`❌ User "${TARGET_USERNAME}" not found. Run the seed first: npm run db:seed`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      tokenVersion: { increment: 1 },
      mustChangePassword: true,
    },
  })

  console.log(`✅ Password for "${TARGET_USERNAME}" has been reset.`)
  console.log(`   User will be required to change password on next login.`)
  console.log(`   All active sessions for this user have been invalidated.`)
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

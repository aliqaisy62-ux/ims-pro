/**
 * Reset the admin user's password.
 * Usage:  npx tsx scripts/reset-admin-password.ts
 *
 * WARNING: This script is for local / emergency use only.
 * Change the password to something strong immediately after logging in.
 */

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_USERNAME = 'admin'
const NEW_PASSWORD = '123456'

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 12)

  const user = await prisma.user.findFirst({ where: { username: TARGET_USERNAME } })

  if (!user) {
    console.error(`User "${TARGET_USERNAME}" not found. Run the seed first: npm run db:seed`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  })

  console.log(`Password for "${TARGET_USERNAME}" has been reset.`)
  console.log(`Login: ${TARGET_USERNAME} / ${NEW_PASSWORD}`)
  console.log(`IMPORTANT: Change this password after you log in.`)
}

main()
  .catch((e) => {
    console.error('Script failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

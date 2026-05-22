/**
 * seed-stress.js — Direct Prisma bulk seed (bypasses HTTP rate limiter)
 * Run from:  cd ims-pro/apps/api  &&  node seed-stress.js
 */
'use strict'

require('dotenv/config')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const BATCH_SIZE = 50
const TOTAL     = 1000

;(async () => {
  console.log('═'.repeat(56))
  console.log('  IMS-Pro Stress Seed — 1000 items via Prisma direct')
  console.log('═'.repeat(56))

  // Count existing stress items
  const existing = await prisma.item.count({ where: { name_en: { startsWith: 'Bulk Stress' } } })
  console.log(`\nExisting Bulk Stress items: ${existing}`)
  if (existing >= TOTAL) {
    console.log('Already seeded. Nothing to do.\n')
    await prisma.$disconnect()
    return
  }

  const toCreate = TOTAL - existing
  console.log(`Creating ${toCreate} items in batches of ${BATCH_SIZE}...\n`)

  let created = 0
  for (let i = 0; i < toCreate; i += BATCH_SIZE) {
    const batch = []
    for (let j = i; j < Math.min(i + BATCH_SIZE, toCreate); j++) {
      const n = existing + j + 1
      batch.push({
        name_ar:        `منتج ضغط ${n}`,
        name_en:        `Bulk Stress ${n}`,
        barcode:        null,               // null avoids unique constraint issues
        costPrice:      300 + (n % 100),
        retailPrice:    500 + (n % 200) * 50,
        wholesalePrice: 400 + (n % 150) * 40,
        specialPrice:   450 + (n % 180) * 45,
        dollarPrice:    0.5 + (n % 20) * 0.1,
        dinarPrice:     500 + (n % 200) * 50,
        stockQty:       10  + (n % 100),
        minimumStock:   5,
        unit:           'قطعة',
        isActive:       true,
      })
    }

    await prisma.item.createMany({ data: batch, skipDuplicates: true })
    created += batch.length
    process.stdout.write(`\r  Created: ${created}/${toCreate}`)
  }

  const finalCount = await prisma.item.count({ where: { isActive: true } })
  console.log(`\n\n✅ Done — total active items in DB: ${finalCount}`)
  await prisma.$disconnect()
})().catch(e => {
  console.error('\n❌ Seed failed:', e.message)
  prisma.$disconnect()
  process.exit(1)
})

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
      language: 'ar',
    },
  })

  // Test users for role comparison
  await prisma.user.upsert({
    where: { username: 'manager1' },
    update: {},
    create: {
      username: 'manager1',
      name: 'مدير تجريبي',
      passwordHash: await bcrypt.hash('manager123', 12),
      role: 'MANAGER',
      language: 'ar',
    },
  })

  await prisma.user.upsert({
    where: { username: 'cashier1' },
    update: {},
    create: {
      username: 'cashier1',
      name: 'كاشير تجريبي',
      passwordHash: await bcrypt.hash('cashier123', 12),
      role: 'CASHIER',
      language: 'ar',
    },
  })

  // Item categories
  const categories = [
    { name_ar: 'إلكترونيات', name_en: 'Electronics' },
    { name_ar: 'مواد غذائية', name_en: 'Food & Groceries' },
    { name_ar: 'ملابس', name_en: 'Clothing' },
    { name_ar: 'منزلية', name_en: 'Household' },
    { name_ar: 'عناية شخصية', name_en: 'Personal Care' },
    { name_ar: 'أخرى', name_en: 'Other' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: `cat-${cat.name_en.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `cat-${cat.name_en.toLowerCase().replace(/\s+/g, '-')}`,
        ...cat,
      },
    })
  }

  // Expense categories
  const expenseCategories = [
    { name_ar: 'إيجار', name_en: 'Rent' },
    { name_ar: 'خدمات', name_en: 'Utilities' },
    { name_ar: 'رواتب', name_en: 'Salaries' },
    { name_ar: 'نقل', name_en: 'Transport' },
    { name_ar: 'أخرى', name_en: 'Other' },
  ]

  for (const cat of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { id: `expcat-${cat.name_en.toLowerCase()}` },
      update: {},
      create: {
        id: `expcat-${cat.name_en.toLowerCase()}`,
        ...cat,
      },
    })
  }

  // Settings
  const settings = [
    { key: 'exchange_rate', value: '1480', description: 'IQD per 1 USD' },
    { key: 'business_name_ar', value: 'اسم المنشأة', description: 'Business name in Arabic' },
    { key: 'business_name_en', value: 'Business Name', description: 'Business name in English' },
    { key: 'business_address', value: '', description: 'Business address' },
    { key: 'business_phone', value: '', description: 'Business phone number' },
    { key: 'default_currency', value: 'IQD', description: 'Default currency (USD or IQD)' },
    { key: 'default_price_type', value: 'RETAIL', description: 'Default price type for sales' },
    { key: 'default_language', value: 'ar', description: 'Default UI language' },
    { key: 'tax_rate', value: '0', description: 'Tax rate percentage' },
    { key: 'invoice_footer_ar', value: '', description: 'Invoice footer text in Arabic' },
    { key: 'invoice_footer_en', value: '', description: 'Invoice footer text in English' },
    { key: 'minimum_stock_alert', value: 'true', description: 'Enable minimum stock alerts' },
    { key: 'paper_width', value: '80', description: 'Receipt printer paper width (mm): 58, 80, or A4' },
  ]

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  // First exchange rate history entry
  await prisma.exchangeRateHistory.create({
    data: {
      rateIQD: 1480,
      changedById: admin.id,
    },
  })

  console.log('✅ Seed complete')
  console.log(`   admin    / admin123   [ADMIN]`)
  console.log(`   manager1 / manager123 [MANAGER]`)
  console.log(`   cashier1 / cashier123 [CASHIER]`)
  console.log(`   Categories: ${categories.length} item + ${expenseCategories.length} expense`)
  console.log(`   Settings: ${settings.length} keys`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

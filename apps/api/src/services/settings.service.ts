import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Settings functions ───────────────────────────────────────────────────────

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.settings.findMany()
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value
    return acc
  }, {})
}

export async function updateSettings(data: Record<string, string>): Promise<Record<string, string>> {
  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  )
  return getAllSettings()
}

export async function updateExchangeRate(rate: number, userId: string) {
  return prisma.$transaction([
    prisma.settings.update({
      where: { key: 'exchange_rate' },
      data: { value: String(rate) },
    }),
    prisma.exchangeRateHistory.create({
      data: {
        rateIQD: rate,
        changedById: userId,
      },
    }),
  ])
}

export async function getExchangeRateHistory() {
  return prisma.exchangeRateHistory.findMany({
    include: {
      changedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

// ─── User management functions ────────────────────────────────────────────────

export async function getUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      language: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createUser(data: {
  name: string
  username: string
  password: string
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'ACCOUNTANT' | 'STAFF'
  language: 'ar' | 'en'
}) {
  const existing = await prisma.user.findFirst({ where: { username: data.username } })
  if (existing) {
    throw new Error('USERNAME_TAKEN')
  }

  const passwordHash = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      username: data.username,
      passwordHash,
      role: data.role,
      language: data.language,
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      language: true,
      isActive: true,
      createdAt: true,
    },
  })

  return user
}

export async function updateUser(
  id: string,
  data: {
    name?: string
    role?: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'ACCOUNTANT' | 'STAFF'
    language?: 'ar' | 'en'
    isActive?: boolean
  }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      language: true,
      isActive: true,
    },
  })
}

export async function resetPassword(id: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 12)
  return prisma.user.update({
    where: { id },
    data: { passwordHash: hash },
    select: { id: true },
  })
}

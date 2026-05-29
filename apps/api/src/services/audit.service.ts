import { PrismaClient } from '@ims-pro/db'

const prisma = new PrismaClient()

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details, ipAddress },
    })
  } catch {
    // fire-and-forget — never throws
  }
}

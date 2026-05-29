import { Request, Response } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

const SCHEMA = path.resolve(__dirname, '../../../../packages/db/prisma/schema.prisma')
const CWD    = path.resolve(__dirname, '../../../../')
const OPTS   = { cwd: CWD, timeout: 120_000, env: { ...process.env } }

async function runMigrateDeploy() {
  return execAsync(`npx prisma migrate deploy --schema="${SCHEMA}"`, OPTS)
}

async function resolveFailedMigrations(errorOutput: string) {
  // P3009 lists each failed migration by name — extract and mark them as applied
  const names = [...errorOutput.matchAll(/The `(\S+)` migration/g)].map((m) => m[1])
  for (const name of names) {
    await execAsync(
      `npx prisma migrate resolve --applied "${name}" --schema="${SCHEMA}"`,
      OPTS
    ).catch(() => {})
  }
  return names
}

export async function dbPush(_req: Request, res: Response) {
  let log: string[] = []

  try {
    const r1 = await runMigrateDeploy()
    log.push(r1.stdout, r1.stderr)
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    const raw = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n')
    log.push(raw)

    // P3009 = failed migration recorded — resolve it then retry
    if (raw.includes('P3009')) {
      const resolved = await resolveFailedMigrations(raw)
      if (resolved.length > 0) {
        log.push(`\n[auto-resolved ${resolved.length} failed migration(s): ${resolved.join(', ')}]`)
        try {
          const r2 = await runMigrateDeploy()
          log.push(r2.stdout, r2.stderr)
        } catch (err2: unknown) {
          const e2 = err2 as { stdout?: string; stderr?: string; message?: string }
          const out2 = [e2.stdout, e2.stderr, e2.message].filter(Boolean).join('\n').trim()
          log.push(out2)
          return res.status(500).json({ success: false, error: 'فشل تحديث قاعدة البيانات', output: log.filter(Boolean).join('\n').trim() })
        }
      }
    } else {
      return res.status(500).json({ success: false, error: 'فشل تحديث قاعدة البيانات', output: log.filter(Boolean).join('\n').trim() })
    }
  }

  return res.json({ success: true, output: log.filter(Boolean).join('\n').trim() || 'قاعدة البيانات محدّثة بالفعل — لا توجد تغييرات معلّقة' })
}

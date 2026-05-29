#!/bin/sh
set -e

echo "[IMS-Pro Dev] Applying migrations (prisma migrate deploy)..."
npx prisma migrate deploy \
  --schema=packages/db/prisma/schema.prisma \
  || echo "[IMS-Pro Dev] WARN: migrate deploy skipped (no pending migrations or schema already in sync)"

if [ "${SEED_DB:-false}" = "true" ]; then
  echo "[IMS-Pro Dev] Seeding database..."
  npx tsx packages/db/prisma/seed.ts \
    || echo "[IMS-Pro Dev] WARN: seed skipped (file missing or already complete)"
fi

echo "[IMS-Pro Dev] Starting API with hot-reload (tsx watch)..."
exec npx tsx watch apps/api/src/index.ts

#!/bin/sh
set -e

# Prisma requires DIRECT_URL for migrations; fall back to DATABASE_URL if unset.
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

echo "[IMS-Pro] Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./packages/db/prisma/schema.prisma || {
  echo "[IMS-Pro] WARNING: migrate deploy failed (schema may already be up-to-date, continuing...)"
}

if [ "$SEED_DB" = "true" ]; then
  echo "[IMS-Pro] Seeding database (first-time setup)..."
  ./node_modules/.bin/tsx packages/db/prisma/seed.ts
fi

echo "[IMS-Pro] Starting API server..."
exec node dist/index.js

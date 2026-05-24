#!/bin/sh
set -e

echo "[IMS-Pro] Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./packages/db/prisma/schema.prisma

if [ "$SEED_DB" = "true" ]; then
  echo "[IMS-Pro] Seeding database (first-time setup)..."
  ./node_modules/.bin/tsx packages/db/prisma/seed.ts
fi

echo "[IMS-Pro] Starting API server..."
exec node dist/index.js

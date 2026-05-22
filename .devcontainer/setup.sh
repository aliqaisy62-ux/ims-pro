#!/bin/bash
set -e

echo "==> Installing dependencies..."
npm install

echo "==> Generating Prisma client..."
npm run db:generate

echo "==> Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -U imspro -d ims_pro 2>/dev/null; do
  sleep 1
done
echo "    PostgreSQL is ready."

echo "==> Running database migrations..."
npm run db:migrate

echo "==> Seeding database..."
npm run db:seed || echo "    Seed skipped (may already be seeded)."

echo "==> Configuring API URL for this environment..."
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  API_URL="https://${CODESPACE_NAME}-4001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  WEB_URL="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  echo "    Codespaces detected. API URL: $API_URL"

  # Write env for the web app
  cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=${API_URL}
EOF

  # Write env for the API
  cat > apps/api/.env <<EOF
DATABASE_URL=postgresql://imspro:***REMOVED***@localhost:5432/ims_pro
NODE_ENV=development
PORT=4001
CORS_ORIGIN=${WEB_URL}
JWT_SECRET=***REMOVED***
JWT_REFRESH_SECRET=codespaces_dev_refresh_secret_change_in_production_min64chars_xx
EXCHANGE_RATE_IQD_USD=1480
EOF
else
  echo "    Local dev detected. Using localhost URLs."
  cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:4001
EOF
  cat > apps/api/.env <<EOF
DATABASE_URL=postgresql://imspro:***REMOVED***@localhost:5432/ims_pro
NODE_ENV=development
PORT=4001
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=***REMOVED***
JWT_REFRESH_SECRET=codespaces_dev_refresh_secret_change_in_production_min64chars_xx
EXCHANGE_RATE_IQD_USD=1480
EOF
fi

echo ""
echo "✅ Setup complete! The dev server will start automatically."
echo "   Web App  → port 3001"
echo "   API      → port 4001"
echo "   Login    → admin / admin123"

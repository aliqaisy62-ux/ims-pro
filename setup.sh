#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  IMS-Pro — First-Time Setup Script (Linux / macOS)
#  Usage:  bash setup.sh [SERVER_IP]
#  Example: bash setup.sh 192.168.1.100
# ═══════════════════════════════════════════════════════════
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERR]${NC}   $1"; exit 1; }
step()  { echo -e "\n${CYAN}▶ $1${NC}"; }

# ─── Detect server IP ────────────────────────────────────────
if [ -n "$1" ]; then
  SERVER_IP="$1"
else
  SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
fi
info "Server IP: ${SERVER_IP}"

# ─── 1. Prerequisites ────────────────────────────────────────
step "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker not installed. Visit https://docs.docker.com/get-docker/"
(docker compose version >/dev/null 2>&1 || docker-compose version >/dev/null 2>&1) || \
  error "Docker Compose not found."
info "Docker OK"

# ─── 2. Generate .env ────────────────────────────────────────
step "Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env

  # Generate secure JWT secrets (use openssl if node unavailable)
  if command -v node >/dev/null 2>&1; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    JWT_REFRESH=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
  else
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    JWT_REFRESH=$(openssl rand -base64 64 | tr -d '\n')
  fi

  sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|"                        .env
  sed -i.bak "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH}|"       .env
  sed -i.bak "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://${SERVER_IP}|"                .env
  sed -i.bak "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://${SERVER_IP}/api|" .env
  rm -f .env.bak
  info ".env created with secure auto-generated secrets."
else
  warn ".env already exists — skipping generation. Edit manually if needed."
fi

# ─── 3. Create required directories ──────────────────────────
step "Creating directories..."
mkdir -p backups uploads
info "backups/ and uploads/ ready."

# ─── 4. Build and start containers ───────────────────────────
step "Building and starting Docker containers (this may take a few minutes)..."
docker compose up -d --build

# ─── 5. Wait for PostgreSQL ───────────────────────────────────
step "Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U imspro >/dev/null 2>&1; then
    info "PostgreSQL is ready."
    break
  fi
  [ $i -eq 30 ] && error "PostgreSQL did not become ready in 60 seconds."
  printf "."
  sleep 2
done
echo

# ─── 6. Seed on first run ────────────────────────────────────
step "Seeding the database with initial data..."
docker compose exec -T -e SEED_DB=true api sh -c 'exit 0' 2>/dev/null || true
# Trigger seed via API container (entrypoint handles it when SEED_DB=true)
docker compose exec -T api ./node_modules/.bin/tsx packages/db/prisma/seed.ts && \
  info "Database seeded successfully." || \
  warn "Seed may have already run (safe to ignore if this is a re-install)."

# ─── 7. Set up daily backup cron ─────────────────────────────
step "Setting up daily backup (2:00 AM)..."
CRON_CMD="cd $(pwd) && bash scripts/backup.sh >> /var/log/ims-pro-backup.log 2>&1"
CRON_ENTRY="0 2 * * * $CRON_CMD"
if (crontab -l 2>/dev/null | grep -q "ims-pro-backup") ; then
  warn "Backup cron already exists — skipping."
else
  (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
  info "Daily backup cron set for 2:00 AM."
fi

# ─── 8. Done ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  IMS-Pro is ready!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "  Access from any device on the network:"
echo -e "    ${CYAN}http://${SERVER_IP}${NC}"
echo ""
echo -e "  Default login: ${YELLOW}admin${NC} / ${YELLOW}admin123${NC}"
echo ""
echo -e "${RED}  ⚠  Change the admin password immediately:${NC}"
echo -e "  Settings → User Management → Edit Admin"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"

#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  IMS-Pro — PostgreSQL Backup Script (Linux / macOS)
#
#  Run manually:   bash scripts/backup.sh
#  Cron (daily 2AM): 0 2 * * * cd /path/to/ims-pro && bash scripts/backup.sh >> /var/log/ims-pro-backup.log 2>&1
# ═══════════════════════════════════════════════════════════
set -euo pipefail

# Resolve project root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

# Load .env for retention setting
BACKUP_RETENTION_DAYS="30"
if [ -f .env ]; then
  RETENTION_LINE=$(grep -E '^BACKUP_RETENTION_DAYS=' .env 2>/dev/null || true)
  [ -n "$RETENTION_LINE" ] && BACKUP_RETENTION_DAYS="${RETENTION_LINE#*=}"
fi

DB_CONTAINER="${DB_CONTAINER:-ims-pro-db}"
DB_USER="${DB_USER:-imspro}"
DB_NAME="${DB_NAME:-ims_pro}"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup → $FILENAME"

# Use docker exec (no local pg_dump required)
docker exec "$DB_CONTAINER" \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" 2>/dev/null | cut -f1 || echo "?")
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Saved: $BACKUP_DIR/$FILENAME ($SIZE)"

# Remove backups older than retention period
DELETED_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -print -delete 2>/dev/null | wc -l || echo 0)
[ "$DELETED_COUNT" -gt 0 ] && \
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removed $DELETED_COUNT backup(s) older than ${BACKUP_RETENTION_DAYS} days."

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete."

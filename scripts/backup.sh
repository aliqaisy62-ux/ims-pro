#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup-${DATE}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "Starting backup: ${FILENAME}"

PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h localhost \
  -p 5434 \
  -U "${DB_USER}" \
  "${DB_NAME}" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "Backup saved: ${BACKUP_DIR}/${FILENAME}"

# Delete old backups
find "${BACKUP_DIR}" -name "backup-*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "Deleted backups older than ${RETENTION_DAYS} days"
echo "Done."

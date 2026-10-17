#!/usr/bin/env bash
# =====================================================================
# EduNexus ERP — PostgreSQL Automated Backup Script
# Usage: ./backup-db.sh [backup_dir] [database_name]
# Recommended Cron: 0 2 * * * /var/www/edunexus/scripts/backup-db.sh
# =====================================================================

set -eo pipefail

BACKUP_DIR="${1:-/var/backups/edunexus}"
DB_NAME="${2:-edunexus_erp}"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# Ensure backup directory exists with restricted permissions (owner read/write only)
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "=== Starting Database Backup: ${DB_NAME} at $(date) ==="
echo "Destination: ${BACKUP_FILE}"

# Execute consistent point-in-time custom format dump with high compression
pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --format=custom \
  --compress=9 \
  --blobs \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}" \
  "${DB_NAME}"

# Lock file permissions to prevent unauthorized access to sensitive tenant records
chmod 600 "${BACKUP_FILE}"

# Generate cryptographic integrity checksum
sha256sum "${BACKUP_FILE}" | awk '{print $1}' > "${CHECKSUM_FILE}"
chmod 600 "${CHECKSUM_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
CHECKSUM=$(cat "${CHECKSUM_FILE}")

echo "✔ Backup completed successfully!"
echo "Size: ${BACKUP_SIZE}"
echo "SHA-256: ${CHECKSUM}"

# Retention Policy:
# 1. Keep all daily backups for 7 days
# 2. Delete dumps older than 30 days
echo "Applying retention policy (pruning backups older than 30 days)..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump" -mtime +30 -exec rm -f {} \;
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump.sha256" -mtime +30 -exec rm -f {} \;

echo "=== Backup Process Finished at $(date) ==="

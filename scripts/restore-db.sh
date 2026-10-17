#!/usr/bin/env bash
# =====================================================================
# EduNexus ERP — PostgreSQL Disaster Recovery / Restore Script
# Usage: ./restore-db.sh <backup_file_path> <target_database_name>
# Example: ./restore-db.sh /var/backups/edunexus/edunexus_erp_20261017.dump edunexus_recovery_test
# =====================================================================

set -eo pipefail

BACKUP_FILE="$1"
TARGET_DB="$2"
DB_USER="${PGUSER:-postgres}"
DB_HOST="${PGHOST:-127.0.0.1}"
DB_PORT="${PGPORT:-5432}"

if [ -z "${BACKUP_FILE}" ] || [ -z "${TARGET_DB}" ]; then
  echo "Error: Usage: $0 <backup_file_path> <target_database_name>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file does not exist: ${BACKUP_FILE}"
  exit 1
fi

echo "=== Starting Database Restoration ==="
echo "Source Dump: ${BACKUP_FILE}"
echo "Target DB:   ${TARGET_DB}"

# 1. Verify SHA-256 Checksum if companion .sha256 file exists
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "Verifying backup integrity checksum..."
  EXPECTED_SUM=$(cat "${CHECKSUM_FILE}")
  ACTUAL_SUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  if [ "${EXPECTED_SUM}" != "${ACTUAL_SUM}" ]; then
    echo "FATAL: Checksum mismatch! Corrupted backup file."
    echo "Expected: ${EXPECTED_SUM}"
    echo "Actual:   ${ACTUAL_SUM}"
    exit 2
  fi
  echo "✔ Checksum verified successfully: ${ACTUAL_SUM}"
else
  echo "Warning: No companion .sha256 file found. Proceeding with restore."
fi

# 2. Provision Isolated Target Database
echo "Creating target database: ${TARGET_DB}..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};"
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TARGET_DB};"

# 3. Restore Data using pg_restore
START_TIME=$(date +%s%N)
echo "Restoring database contents with pg_restore..."
pg_restore \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${TARGET_DB}" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "${BACKUP_FILE}"

END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
echo "✔ pg_restore completed in ${ELAPSED_MS} ms"

# 4. CRITICAL SAFETY STEP: Disable Outbound Notifications in Restore Environment
# Prevents replaying stale or pending email/SMS queues upon staging/recovery boot
echo "Disabling outbound notification queues in restore environment..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" << 'EOF'
-- Cancel all queued or in-flight notification jobs
UPDATE notification_jobs 
SET status = 'CANCELLED', 
    last_error = 'Cancelled by restoration script to prevent replay in non-production environment'
WHERE status IN ('QUEUED', 'PROCESSING');

-- Inactivate pending recipient dispatches
UPDATE notification_recipients 
SET status = 'SKIPPED' 
WHERE status = 'PENDING';

-- Lock notification preference settings to disabled mode if present
UPDATE tenant_settings 
SET value = jsonb_set(COALESCE(value, '{}'::jsonb), '{emailDeliveryMode}', '"OFF"')
WHERE key = 'notifications';
EOF
echo "✔ Outbound notification queues disabled."

# 5. Sanity Verification of Representative Tables
echo "Validating representative records in restored database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" << 'EOF'
SELECT 
  (SELECT COUNT(*) FROM tenants) AS tenants_count,
  (SELECT COUNT(*) FROM students) AS students_count,
  (SELECT COUNT(*) FROM enrollments) AS enrollments_count,
  (SELECT COUNT(*) FROM fee_assignments) AS fee_assignments_count,
  (SELECT COUNT(*) FROM payments) AS payments_count,
  (SELECT COUNT(*) FROM journal_entries) AS journal_entries_count,
  (SELECT COUNT(*) FROM notification_jobs WHERE status IN ('QUEUED', 'PROCESSING')) AS active_jobs_count;
EOF

echo "=== Database Restoration Completed Successfully! ==="

# Database Backup & Restore Procedures

## Overview
This document outlines the backup and restore procedures for the EduNexus ERP PostgreSQL database. These procedures are critical for data safety, disaster recovery, and production readiness.

## 1. Automated Backups (Cron / Scheduled)

In a production VPS environment, database backups should be performed daily via a cron job and pushed to a secure offsite storage (e.g., AWS S3, Google Cloud Storage, or a separate backup server).

### Backup Script (`backup.sh`)
```bash
#!/bin/bash
# Backup Script for EduNexus ERP

BACKUP_DIR="/var/backups/edunexus"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="edunexus_erp"
DB_USER="postgres"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform pg_dump and compress
pg_dump -U "$DB_USER" -d "$DB_NAME" -F p | gzip > "$BACKUP_FILE"

# Optional: Upload to S3 (requires aws-cli)
# aws s3 cp "$BACKUP_FILE" s3://my-edunexus-backups/

# Cleanup backups older than 30 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;

echo "Backup completed: $BACKUP_FILE"
```

## 2. Manual Backup (On-Demand)

To take a manual snapshot before major updates or migrations:

**Standard SQL Dump (Compressed):**
```bash
pg_dump -U postgres -d edunexus_erp -F p | gzip > edunexus_erp_manual_$(date +"%Y%m%d").sql.gz
```

**Custom Format Dump (Recommended for `pg_restore`):**
```bash
pg_dump -U postgres -d edunexus_erp -F c -f edunexus_erp_manual_$(date +"%Y%m%d").dump
```

## 3. Restore Procedures

> [!WARNING]
> Restoring a backup OVERWRITES the existing database. Proceed with extreme caution. Ensure you are targeting the correct database.

### Restoring from a `.sql.gz` file (Standard SQL)
If restoring to an existing database (destructive):
```bash
# Drop connections and drop database
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'edunexus_erp';"
psql -U postgres -c "DROP DATABASE edunexus_erp;"
psql -U postgres -c "CREATE DATABASE edunexus_erp;"

# Unzip and restore
gunzip -c edunexus_erp_backup.sql.gz | psql -U postgres -d edunexus_erp
```

### Restoring from a `.dump` file (Custom Format)
Using `pg_restore` allows parallel restoration and selective table restore:
```bash
# Clean existing objects and restore
pg_restore -U postgres -d edunexus_erp --clean --if-exists --no-owner -1 edunexus_erp_manual.dump
```

## 4. Disaster Recovery Validation (Phase 12 Requirement)

A backup that has never been restored is not considered validated.
To validate your backups:
1. Spin up a separate local database instance (e.g. `edunexus_erp_recovery_test`).
2. Run the restore command targeting the test database.
3. Verify that the server can connect to it and that data is intact by running `npm test`.

```bash
# Test Restore Command Example
createdb -U postgres edunexus_erp_recovery_test
gunzip -c latest_backup.sql.gz | psql -U postgres -d edunexus_erp_recovery_test
```

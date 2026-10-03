# Production Backup Policy

Regular automated backups of the PostgreSQL database are critical for disaster recovery. 

## 1. Backup Strategy

*   **Frequency:** Daily at 02:00 AM (server time).
*   **Format:** PostgreSQL Custom format (`-Fc`), allowing for flexible restoration via `pg_restore`.
*   **Location:** Initial local dump to `/var/www/edunexus/backups/`.
*   **Retention Policy:** Keep 7 daily backups, 4 weekly backups locally. Older backups are rotated out.

## 2. Backup Script

Create a script at `/var/www/edunexus/scripts/backup.sh` (make executable with `chmod +x backup.sh`):

```bash
#!/bin/bash
# EduNexus Automated Backup Script
# Run via cron as the 'postgres' or 'edunexus' user depending on auth setup.

DB_NAME="edunexus_prod"
BACKUP_DIR="/var/www/edunexus/backups"
DATE=$(date +"%Y-%m-%d_%H%M")
FILE_NAME="edunexus_${DATE}.dump"

# Ensure directory exists
mkdir -p ${BACKUP_DIR}

# Execute dump using peer authentication or .pgpass
pg_dump -U postgres -Fc ${DB_NAME} > ${BACKUP_DIR}/${FILE_NAME}

# Compress if needed (custom format is already somewhat compressed, but this is optional)
# gzip ${BACKUP_DIR}/${FILE_NAME}

# Cleanup older than 7 days
find ${BACKUP_DIR} -type f -name "*.dump" -mtime +7 -exec rm {} \;

echo "Backup ${FILE_NAME} completed successfully."
```

## 3. Cron Job

Add the script to the crontab (`crontab -e`):
```cron
# Run backup every day at 2:00 AM
0 2 * * * /var/www/edunexus/scripts/backup.sh >> /var/log/edunexus_backup.log 2>&1
```

## 4. Off-Server Storage (Crucial)

Backups residing on the same disk as the database are NOT true backups. You must routinely move these files off the VPS.
**Options:**
1. **Hostinger Snapshots:** If your VPS plan includes daily automatic snapshots, this provides block-level offsite recovery.
2. **AWS S3 / R2 Sync:** Add an `aws s3 sync` command to the bottom of your `backup.sh` to push the `.dump` files to a secure cloud bucket.

## 5. Backup Restore Drill

Before declaring production ready, you must test the restoration process:
1. Trigger `backup.sh` manually.
2. Create a dummy database: `CREATE DATABASE edunexus_restore_test;`
3. Restore the dump: `pg_restore -U postgres -d edunexus_restore_test -1 /var/www/edunexus/backups/edunexus_...dump`
4. Run `node verify-db.mjs` against `edunexus_restore_test` to ensure schema integrity.
5. Drop `edunexus_restore_test`.

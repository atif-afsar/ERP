# Production Rollback Strategy

Deploying code and database schema can occasionally fail or introduce regressions. This document defines the distinction between Application Rollback and Database Recovery.

## 1. Code / Application Rollback

Code rollback is used when a new release introduces a bug but **does not corrupt or mutate database schema/data** in a destructive way.

**Procedure:**
1. SSH into the VPS as `edunexus`.
2. Navigate to the code directory: `cd /var/www/edunexus/current`
3. Identify the last known good commit: `git log --oneline`
4. Check out the specific stable commit: `git checkout <commit_sha>`
5. Rebuild the application:
   ```bash
   cd frontend && npm run build
   cd ../backend && npm run build
   ```
6. Restart the application: `pm2 reload all`

*Note: Do NOT run migrations if you are rolling back the codebase, unless the rollback specifically requires reversing a safe schema addition.*

## 2. Database Recovery (Destructive Failures)

If a migration fails destructively (e.g., dropping a required column, data corruption), you cannot simply `git checkout`. PostgreSQL migrations in this framework are mostly forward-only. **Do not attempt to write manual down-migrations in a panic.**

**Procedure (Restore from Backup):**
1. Stop the application to prevent further data mutation:
   ```bash
   pm2 stop all
   ```
2. Locate the most recent good backup in `/var/www/edunexus/backups/`.
3. Drop and recreate the production database (Requires postgres superuser):
   ```bash
   sudo -u postgres psql -c "DROP DATABASE edunexus_prod WITH (FORCE);"
   sudo -u postgres psql -c "CREATE DATABASE edunexus_prod;"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE edunexus_prod TO edunexus_app;"
   ```
4. Restore the backup (Assuming custom format pg_dump):
   ```bash
   pg_restore -U edunexus_app -d edunexus_prod -1 /var/www/edunexus/backups/edunexus_2026-10-03_1200.dump
   ```
5. Rollback the code to the commit that matches that database state (Section 1).
6. Start the application: `pm2 start all`

## 3. Verifying Rollbacks

After a rollback, always perform a **Production Smoke Test**:
1. Check `/api/v1/health`.
2. Ensure you can log into the Tenant Admin portal.
3. Verify that Nginx is routing correctly.
4. Verify PM2 logs show no immediate crashes.

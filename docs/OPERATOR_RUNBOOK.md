# EduNexus ERP — System Operator Runbook

## Overview
This runbook serves as the authoritative operational guide for system administrators, DevOps engineers, and on-call operators managing the EduNexus Multi-Tenant ERP platform in staging and production environments.

---

## 1. System Architecture & Components

| Component | Technology | Management | Port / Path | Purpose |
|---|---|---|---|---|
| **API Server** | Node.js 22 LTS / Express | PM2 (`edunexus-api`) | `127.0.0.1:5000` | REST API, Multi-Tenant Auth, Business Logic |
| **Notification Worker** | Node.js 22 LTS | PM2 (`edunexus-worker`) | Background Process | Idempotent email/in-app notification delivery |
| **Database** | PostgreSQL 16 | Systemd / Docker | `127.0.0.1:5432` | Tenant schemas, relational data, journals |
| **Reverse Proxy** | Nginx | Systemd (`nginx`) | `80`, `443` | SSL Termination, Rate Limiting, Static SPA |
| **Frontend Web** | Vite SPA / React | Nginx Static / Vercel | `/var/www/edunexus/frontend/dist` | Browser User Interface |

---

## 2. Service Management (Startup, Shutdown & Restart)

### Using PM2 (Production VPS)
All Node.js processes are managed via PM2 using [backend/deploy/ecosystem.config.cjs](file:///c:/Users/asus/Desktop/ERP/backend/deploy/ecosystem.config.cjs).

```bash
# Check status of all managed processes
pm2 status

# Start all services
pm2 start /var/www/edunexus/backend/deploy/ecosystem.config.cjs --env production

# Controlled graceful restart (zero-downtime cluster reload)
pm2 reload edunexus-api

# Restart background worker (drains in-flight jobs)
pm2 restart edunexus-worker

# Stop all services
pm2 stop all

# Persist current process list to survive OS reboot
pm2 save
```

### Systemd Services (PostgreSQL & Nginx)
```bash
# PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Nginx
sudo nginx -t                       # Test configuration syntax before reloading
sudo systemctl reload nginx          # Hot reload configuration
sudo systemctl restart nginx
```

---

## 3. Health & Readiness Monitoring

### Automated Health Endpoints
- **Liveness & DB Health**: `GET https://erp.edunexus.example.com/health` (or `http://127.0.0.1:5000/health`)
  ```json
  {
    "status": "healthy",
    "api": true,
    "database": {
      "connected": true,
      "latencyMs": 15,
      "error": null
    },
    "uptimeSeconds": 3600,
    "environment": "production"
  }
  ```
- **Readiness Probe**: `GET https://erp.edunexus.example.com/readiness` (returns HTTP 200 when ready to accept traffic; HTTP 503 during degraded states).

### Operational Database Queries
Run these queries in PostgreSQL to monitor system health:

```sql
-- 1. Worker Queue Backlog (Jobs ready to dispatch)
SELECT COUNT(*)::int AS backlog_count
FROM notification_jobs
WHERE status = 'QUEUED' AND next_attempt_at <= NOW();

-- 2. Failed Notification Jobs in Last 24 Hours
SELECT id, tenant_id, channel, last_error, attempts, updated_at
FROM notification_jobs
WHERE status = 'FAILED' AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- 3. Stale In-Flight Worker Claims (> 10 minutes)
SELECT id, locked_by, locked_at, channel, attempts
FROM notification_jobs
WHERE status = 'PROCESSING' AND locked_at < NOW() - INTERVAL '10 minutes';

-- 4. Active Database Connections
SELECT count(*), state, usename, client_addr 
FROM pg_stat_activity 
GROUP BY state, usename, client_addr;
```

---

## 4. Log Inspection & Privacy Auditing

### Log Locations
All logs are sanitized. Passwords, bearer tokens, cookies, and sensitive recipient email bodies are strictly redacted.

| Log Name | Path | Description |
|---|---|---|
| **API Output** | `/var/log/edunexus/api-out.log` | Structured JSON request logs (method, status, response time, request ID) |
| **API Errors** | `/var/log/edunexus/api-error.log` | Uncaught exceptions and stack traces |
| **Worker Output** | `/var/log/edunexus/worker-out.log` | Idempotent dispatch events, poll cycles, and simulation logs |
| **Worker Errors** | `/var/log/edunexus/worker-error.log` | Provider errors, transient retry notifications, permanent failures |
| **Nginx Access** | `/var/log/nginx/access.log` | Edge web traffic and upstream routing |
| **Nginx Error** | `/var/log/nginx/error.log` | Rate-limit violations, TLS handshakes, upstream connection errors |

### Real-Time Log Streaming
```bash
# Follow API logs
pm2 logs edunexus-api

# Follow Notification Worker logs
pm2 logs edunexus-worker

# Search for specific request by ID
grep "req-uuid-xyz" /var/log/edunexus/api-out.log
```

---

## 5. Backup & Disaster Recovery Procedures

### Automated Daily Backups
The automated backup script [scripts/backup-db.sh](file:///c:/Users/asus/Desktop/ERP/scripts/backup-db.sh) runs via cron every day at 02:00 AM UTC:
```bash
0 2 * * * /var/www/edunexus/scripts/backup-db.sh /var/backups/edunexus edunexus_erp >> /var/log/edunexus/backup.log 2>&1
```

### Manual Backup Execution
```bash
/var/www/edunexus/scripts/backup-db.sh /var/backups/edunexus edunexus_erp
```
Output produced:
- `edunexus_erp_YYYYMMDD_HHMMSS.dump` (PostgreSQL Custom Compressed Archive)
- `edunexus_erp_YYYYMMDD_HHMMSS.dump.sha256` (Integrity Checksum)
- Backups older than 30 days are automatically rotated and pruned.

### Disaster Recovery / Database Restoration
Use [scripts/restore-db.sh](file:///c:/Users/asus/Desktop/ERP/scripts/restore-db.sh) to restore into a new database or recover from failure:
```bash
# Syntax: ./restore-db.sh <backup_file> <target_database>
/var/www/edunexus/scripts/restore-db.sh \
  /var/backups/edunexus/edunexus_erp_20261017_020000.dump \
  edunexus_erp_recovered
```
**Safety Guarantee**: The script automatically cancels queued outbound notification jobs and sets `emailDeliveryMode=OFF` in the restored database, preventing unintended dispatch of stale notifications.

---

## 6. Deployment & Rollback Strategy

### Standard Release Procedure
1. **Pull Latest Changes**:
   ```bash
   cd /var/www/edunexus
   git pull origin main
   ```
2. **Install Workspace Dependencies**:
   ```bash
   npm ci
   ```
3. **Apply Database Migrations**:
   ```bash
   cd backend
   node migrate.mjs up
   node verify-db.mjs
   ```
4. **Compile Applications**:
   ```bash
   npm run build:backend
   npm run build:frontend
   ```
5. **Reload Production Services**:
   ```bash
   pm2 reload edunexus-api
   pm2 restart edunexus-worker
   ```
6. **Verify Health**:
   ```bash
   curl -f http://127.0.0.1:5000/health
   ```

### Rollback & Migration Compatibility
All database migrations in `backend/sql/migrations/` follow the **Expand/Contract Principle** and must remain backward-compatible with the immediately preceding release:
- New columns must have default values or allow NULL during the expansion phase.
- Table drops or destructive renames are deferred until older application instances have stopped running.
- If a deployment failure occurs:
  ```bash
  # 1. Rollback code to previous stable commit/tag
  git checkout <previous_git_tag_or_sha>
  npm ci
  npm run build:backend
  npm run build:frontend

  # 2. Reload PM2 services
  pm2 reload edunexus-api
  pm2 restart edunexus-worker

  # 3. If rollback migration is required
  cd backend
  node migrate.mjs down
  ```

---

## 7. Troubleshooting Guide

| Issue | Symptoms | Root Cause | Resolution |
|---|---|---|---|
| **API Returns 503** | `/health` shows `connected: false` | PostgreSQL service stopped or max connections exceeded | Check `sudo systemctl status postgresql`; inspect `pg_stat_activity`; restart PostgreSQL |
| **CORS Rejected (403)** | `CORS_FORBIDDEN` in browser console | Origin mismatch in `.env` | Ensure `FRONTEND_URL` in `backend/.env` matches the exact browser URL with HTTPS scheme |
| **Worker Queue Growth** | Backlog query count steadily increasing | Worker process stopped or crashing on invalid job | Check `pm2 status edunexus-worker`; check `/var/log/edunexus/worker-error.log` |
| **Email Blocked in Production** | Worker logs `RESEND_API_KEY is required` | Live credentials unconfigured | Obtain verified sender domain and set `RESEND_API_KEY` in `backend/.env` |
| **Upload Size Exceeded (413)** | Request Entity Too Large | Nginx and Express limits disagree | Verify `client_max_body_size 12M;` in Nginx and `limit: '12mb'` in Express |

# Phase 5 — Deployment & Recovery Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 5 is to establish production-ready operational procedures, root-level CI/CD pipelines, process supervision, environmental parameter alignment, and disaster recovery backup/restore routines.

### Included Scope:
1. **Production Process Supervision**:
   - Concurrent supervision of both the HTTP API server (`dist/server.js`) and background notification worker (`dist/worker.js`) via PM2 or systemd unit definitions.
2. **Environment & Security Alignment**:
   - Strict CORS origin whitelisting matching production frontend domain.
   - Synchronized upload payload limits across reverse proxy (Nginx `client_max_body_size 10M`), Express parser (`limit: '10mb'`), and frontend file selectors.
   - TLS termination configuration guidelines.
3. **Root CI Automation**:
   - GitHub Actions / local CI workflow running from repository root: installs dependencies with `npm ci`, provisions PostgreSQL service, applies all migrations, runs fixtures, compiles both workspaces, and executes backend and frontend test suites.
4. **Disaster Recovery & Out-of-Place Restoration**:
   - Automated database snapshot script using `pg_dump`.
   - Demonstration of non-destructive restore into an isolated recovery database (`edunexus_recovery_test`), verifying table counts, row counts, and referential integrity.
5. **Rollback Procedures**:
   - Documented step-by-step blue/green and version rollback strategies.

---

## 2. Dependencies
- Clean compiled outputs in `backend/dist` and `frontend/dist`.
- `pg_dump` and `pg_restore` / `psql` utilities available.
- System supervisor (systemd, PM2, or Docker Compose).

---

## 3. Actual Current File Paths to Inspect/Change
- **Supervision & Deployment Assets**:
  - `backend/deploy/` (systemd service configurations, Nginx reverse proxy templates)
  - `docker-compose.yml`
  - `backend/package.json` (scripts: `start`, `worker:notifications:start`)
- **Server Configuration**:
  - `backend/src/server.ts` (CORS options, reverse proxy trust, body parser limits)
  - `backend/src/config.ts`
- **CI/CD Workflow**:
  - `.github/workflows/ci.yml` (Root-level CI definition)
- **Backup & Recovery Scripts**:
  - `backend/deploy/backup-db.sh` or recovery verification scripts

---

## 4. Ordered Implementation Tasks
1. **Configure Process Supervision**:
   - Create systemd or PM2 ecosystem configuration defining:
     - `edunexus-api`: runs `node dist/server.js` on port 5000, restart on failure.
     - `edunexus-worker`: runs `node dist/worker.js`, restart on failure.
2. **Align Network & Proxy Headers**:
   - Verify `server.ts`:
     - `app.set('trust proxy', 1);` enables secure cookie and IP resolution behind reverse proxy.
     - `corsOptions` allows configured `FRONTEND_URL` and blocks unapproved origins.
     - `express.json({ limit: '10mb' })` aligns with Nginx `client_max_body_size 10m;`.
3. **Create Root CI Workflow (`.github/workflows/ci.yml`)**:
   - Define job:
     ```yaml
     name: CI Pipeline
     on: [push, pull_request]
     jobs:
       test:
         runs-on: ubuntu-latest
         services:
           postgres:
             image: postgres:16
             env:
               POSTGRES_USER: postgres
               POSTGRES_PASSWORD: postgres
               POSTGRES_DB: edunexus_erp
             ports: ['5432:5432']
         steps:
           - uses: actions/checkout@v4
           - uses: actions/setup-node@v4
             with: { node-version: 20, cache: 'npm' }
           - run: npm ci
           - run: npm run build
           - run: npm run db:migrate --workspace=backend
           - run: npm run db:verify --workspace=backend
           - run: npm run test:backend
     ```
4. **Execute Disaster Recovery Verification**:
   - Create snapshot:
     ```bash
     pg_dump -h 127.0.0.1 -U postgres -d edunexus_erp -F c -f /tmp/edunexus_backup.dump
     ```
   - Restore into fresh isolated recovery database:
     ```bash
     psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS edunexus_recovery_test;"
     psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE edunexus_recovery_test;"
     pg_restore -h 127.0.0.1 -U postgres -d edunexus_recovery_test /tmp/edunexus_backup.dump
     ```
   - Run `node verify-db.mjs` with `DATABASE_URL=.../edunexus_recovery_test` to confirm table count (67) and zero corrupted tables.

---

## 5. Required Database, API, and Frontend Changes
- **Database**:
  - Valid backup dump generated without errors or skipped tables.
- **API**:
  - Graceful shutdown handles `SIGTERM` and `SIGINT`, closing open HTTP sockets and ending the PostgreSQL pool cleanly within 10 seconds.
- **Frontend**:
  - Production build in `frontend/dist` serves clean static assets with hash versioning.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - Restarting `edunexus-api` process resumes accepting connections within 3 seconds.
  - Out-of-place database restoration recreates 100% of tables, rows, and foreign keys.
  - Root CI workflow runs and exits with status 0 on clean code.
- **Negative Tests**:
  - Requests with forged origin header receive HTTP 403 `CORS_FORBIDDEN`.
  - Database connection outage causes `/health` to immediately return HTTP 503 instead of crashing the process.
  - Restoring corrupted backup triggers fatal error and halts without corrupting live DB.

---

## 7. Completion Criteria
- [ ] API and Worker superviseable with independent lifecycles.
- [ ] Root CI definition validated against local runner or GitHub Actions schema.
- [ ] Backup and restoration successfully executed and verified on isolated test DB.
- [ ] Production documentation covers deployment, health inspection, and rollback.

---

## 8. Required Evidence and Next-Phase Handoff
- Demonstration log of `pg_dump` and successful `pg_restore` into `edunexus_recovery_test`.
- Verification of compiled build outputs.
- Proceed to **Phase 6 (Pilot Acceptance)**.

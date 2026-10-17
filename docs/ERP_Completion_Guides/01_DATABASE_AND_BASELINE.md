# Phase 1 — Database & Baseline Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 1 is to establish a verified, deterministic, and isolated local development and test environment for EduNexus ERP.
### Included Scope:
- Git status inspection and uncommitted change protection.
- Clean root and workspace dependency verification against `package-lock.json`.
- Isolated local PostgreSQL setup with automated schema baseline and native forward migrations.
- Execution of `migrate.mjs plan`, `migrate.mjs up`, and `verify-db.mjs`.
- Seeding deterministic synthetic accounts across two institutions (e.g., Tenant 1: Springdale Academy, Tenant 2: Oakridge Academy) covering all supported canonical roles (`SUPER_ADMIN`, `TENANT_ADMIN`, `ADMIN`, `TEACHER`, `ACCOUNTANT`, `PARENT`, `STUDENT`, `STAFF`).
- Clean compilation and bundle builds for both `frontend` and `backend` workspaces.
- Running the backend test suite (`node test-runner.mjs`) and frontend unit/e2e tests.
- Verification of database-connected health checks (`/health` HTTP 200).
- Real browser login execution via headless Playwright automation.
- Categorization of all findings into environment blockers, actual defects, and outdated tests.

---

## 2. Dependencies
- Node.js >= 20.x, npm >= 10.x.
- Isolated PostgreSQL 16 server listening at `127.0.0.1:5432` with credentials `postgres:postgres`.
- Playwright browser binaries (`npx playwright install chromium`).
- Environment configuration files:
  - `backend/.env` with `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp`
  - `frontend/.env` with `VITE_API_URL=http://localhost:5000/api/v1`

> [!CAUTION]
> The backend test runner (`backend/test-runner.mjs`) connects to the configured PostgreSQL host and automatically drops and recreates `edunexus_erp_test`. Never configure this against shared or production databases.

---

## 3. Actual Current File Paths to Inspect/Change
- **Environment & Configuration**:
  - `package.json` (Workspace configuration and root scripts)
  - `backend/package.json`
  - `frontend/package.json`
  - `backend/.env` & `backend/.env.example`
  - `frontend/.env`
- **Database Engine & Migration Scripts**:
  - `backend/sql/001_schema.sql` (Baseline native schema)
  - `backend/sql/migrations/` (40 forward migrations: `native_0002` through `native_0040`)
  - `backend/migrate.mjs` (AST-verified migration engine)
  - `backend/verify-db.mjs` (Table, constraint, and permissions verifier)
  - `backend/test-runner.mjs` (Automated test runner and test DB isolator)
- **Application Startup & Health**:
  - `backend/src/server.ts` (API routes and `/health` endpoint)
  - `backend/src/db.ts` (PostgreSQL connection pool & health checker)
  - `frontend/src/App.tsx` (Root router and provider tree)
- **Quality Assurance & Verification Fixtures**:
  - `qa/rc-local.mjs` (Isolated test orchestration)
  - `qa/training-accounts.mjs` (Multi-role login verification suite)

---

## 4. Ordered Implementation Tasks
1. **Repository & Workspace Audit**:
   - Run `git status -s` to catalogue modified or untracked files.
   - Run `npm ci --dry-run` or verify lockfile integrity.
2. **Database Provisioning & Isolation**:
   - Launch PostgreSQL 16 (via WSL daemon `backend/run_pg.sh` or local service).
   - Ensure target databases `edunexus_erp` and `edunexus_erp_test` can be created.
3. **Migration & Schema Verification**:
   - Run `node migrate.mjs plan` in `backend/` to verify migration checksums.
   - Run `node migrate.mjs up` to apply migrations `0001` through `0040`.
   - Run `node verify-db.mjs` to validate all 67 required tables and 70 permissions.
4. **Synthetic Multi-Tenant Fixture Generation**:
   - Seed two isolated institutions: Tenant A (`00000000-0000-0000-0000-000000000001`) and Tenant B (`00000000-0000-0000-0000-000000000002`).
   - Create deterministic test credentials for each role (`owner@tenant-a.com`, `teacher@tenant-a.com`, `parent@tenant-a.com`, `student@tenant-a.com`, etc.).
5. **Build Verification**:
   - Execute `npm run build:backend` (`tsc`).
   - Execute `npm run build:frontend` (`tsc && vite build`).
6. **Backend Test Suite Run**:
   - Execute `node test-runner.mjs` in `backend/`.
   - Record passing, failing, and skipped tests.
7. **Health Check & Browser Verification**:
   - Start backend server and frontend preview/dev server.
   - Query `GET http://127.0.0.1:5000/health` and verify HTTP 200 with `{ connected: true }`.
   - Execute headless browser login across core roles to verify token exchange and initial landing routes.

---

## 5. Required Database, API, and Frontend Changes
- **Database**:
  - Complete schema tables present: `tenants`, `users`, `roles`, `permissions`, `students`, `guardians`, `student_guardians`, `classes`, `sections`, `academic_years`, `fee_structures`, `fee_invoices`, `payments`, `examinations`, `exam_marks`, `timetables`, `attendance`.
- **API**:
  - `/health` and `/api/v1/health` must return `200 OK` with latency metrics when database is responsive.
- **Frontend**:
  - Vite dev server and production builds must compile without TypeScript errors.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - `POST /api/v1/auth/signin` with valid credentials returns HTTP 200 and signed JWT.
  - `GET /health` returns HTTP 200 with `status: 'healthy'` and `database.connected: true`.
  - Migration plan detects 0 unapplied migrations when up-to-date.
  - Browser login for `TENANT_ADMIN` successfully redirects to `#/app/dashboard`.
- **Negative Tests**:
  - `POST /api/v1/auth/signin` with wrong password returns HTTP 401 with standard error format.
  - Accessing `/api/v1/students` without `Authorization` bearer token returns HTTP 401.
  - Accessing tenant B resource with tenant A token returns HTTP 403 or 404.
  - Database down causes `/health` to return HTTP 503 `status: 'degraded'`.

---

## 7. Completion Criteria
- [ ] Working PostgreSQL server active and connected.
- [ ] 40/40 native migrations applied successfully.
- [ ] `verify-db.mjs` reports 0 missing tables and all permissions accounted for.
- [ ] Both `backend` and `frontend` workspaces compile with zero errors.
- [ ] Backend test suite executed and results categorized.
- [ ] Real browser login confirmed with real token issuance.

---

## 8. Required Evidence and Next-Phase Handoff
- Output of `node verify-db.mjs` showing 67 tables and active connection.
- Output of `npm run build` across workspaces.
- Test pass/fail/error tally from `test-runner.mjs`.
- Playwright browser login execution log.
- Hand off verified baseline state to **Phase 2 (Critical Fixes)**.

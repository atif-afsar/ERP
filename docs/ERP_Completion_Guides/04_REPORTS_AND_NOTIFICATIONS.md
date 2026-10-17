# Phase 4 — Reports & Notifications Implementation Guide

## 1. Goal and Included Scope
The goal of Phase 4 is to eliminate mock/demo export stubs, deliver authoritative institutional reporting directly aggregated from the PostgreSQL database, and verify the asynchronous background notification worker with delivery tracking and idempotency.

### Included Scope:
1. **Authoritative Institutional Reports**:
   - **Enrollment Report**: Total student count, class/section breakdown, gender distribution, active vs withdrawn status.
   - **Attendance Summary Report**: Class attendance rates, monthly trend lines, threshold alerts (<75% attendance).
   - **Collections & Aging Report**: Invoiced vs collected amounts, overdue aging buckets (0–30, 31–60, 61–90, 90+ days), fee structure reconciliation.
   - **Published Results Report**: Class rank lists, grade distributions, pass/fail metrics, subject performance variance.
2. **Export Engine**:
   - Real CSV/Excel and print-ready PDF export streams generated from query datasets.
   - Absolute prevention of mock CSV downloads.
3. **Background Notification Worker**:
   - Verification of `backend/src/worker.ts` notification daemon.
   - Email delivery modes: `LOG` (local inspection/testing) and `RESEND` (production provider).
   - Idempotent queue processing, retry backoff on delivery failure, and deduplication.
   - Status tracking across `QUEUED`, `PROCESSING`, `SENT`, `FAILED`.

---

## 2. Dependencies
- Phase 3 core workflows established with live student, attendance, payment, and examination records.
- Notification queue database tables (`notification_jobs`, `notification_templates`).
- Worker supervision via Node/tsx.

---

## 3. Actual Current File Paths to Inspect/Change
- **Backend Worker & Notification Service**:
  - `backend/src/worker.ts` (Notification queue worker)
  - `backend/src/routes/notifications.ts` & `backend/src/routes/communication.ts`
  - `backend/sql/migrations/native_0014_communications.sql`
  - `backend/sql/migrations/native_0015_notification_job_idempotency.sql`
- **Backend Reporting Services**:
  - `backend/src/routes/finance.ts` (Financial reports & trial balance)
  - `backend/src/routes/academicOperations.ts` (Class rosters & enrollment stats)
  - `backend/src/routes/examinationOperations.ts` (Broadsheets & result reports)
- **Frontend Reporting Blade**:
  - `frontend/src/modules/reports/ReportsModule.tsx`
  - `frontend/src/modules/communication/CommunicationCenterModule.tsx`

---

## 4. Ordered Implementation Tasks
1. **Connect Reporting Endpoints**:
   - In `backend/src/routes/`:
     - Add `GET /api/v1/reports/enrollment`: Aggregates active student counts grouped by class and section.
     - Add `GET /api/v1/reports/attendance`: Aggregates attendance records with present/absent percentage calculations.
     - Add `GET /api/v1/reports/collections`: Aggregates `fee_invoices` and `payments` grouped by fee category and aging buckets.
     - Add `GET /api/v1/reports/results`: Aggregates `exam_marks` grouped by examination, class, and grade.
   - Enforce tenant isolation in all queries: `WHERE tenant_id = req.tenantId`.
2. **Reconcile Totals with Fixtures**:
   - Ensure the total sum of payments in the Collections Report strictly matches the sum of `VERIFIED` records in `payments` and the debits in `journal_entries`.
3. **Frontend Reports Integration**:
   - Update `ReportsModule.tsx` to fetch directly from `/api/v1/reports/*`.
   - Remove any hardcoded synthetic tables or simulated CSV download timeouts.
4. **Notification Worker Verification**:
   - Start notification worker: `npm run worker:notifications` (`node dist/worker.js` or `tsx watch src/worker.ts`).
   - Create notification job: Insert into `notification_jobs` with status `QUEUED`.
   - Verify worker picks up the job, parses recipient details, processes via configured provider, and updates status to `SENT`.
   - Test worker crash/restart resilience: Ensure unacknowledged jobs in `PROCESSING` are reclaimed after timeout without duplicate delivery.
5. **Provider Mode Discipline**:
   - When `RESEND_API_KEY` is not provided, enforce `EMAIL_DELIVERY_MODE=LOG`. The worker must log the complete email payload to stdout/log file. Mark live provider tests as `BLOCKED (Missing Credentials)`, never fake-passed.

---

## 5. Required Database, API, and Frontend Changes
- **Database**:
  - Notification idempotency key index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_jobs_idempotency ON notification_jobs(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;`
- **API**:
  - Dedicated `/api/v1/reports/*` endpoints returning structured JSON and CSV streams (`Content-Type: text/csv`).
- **Frontend**:
  - Real-time data tables with dynamic date range, class, and fee category filters.

---

## 6. Positive and Negative Acceptance Tests
- **Positive Tests**:
  - Collections Report total exactly equals the sum of verified payments in the database.
  - Exporting Enrollment Report as CSV produces valid tabular file matching screen records.
  - Queued email in `LOG` mode writes delivery log and updates status to `SENT` with timestamp.
- **Negative Tests**:
  - Attempting to query reports without `reports.view` permission returns HTTP 403.
  - Submitting a duplicate notification job with the same `idempotency_key` returns existing job record without re-enqueueing.
  - Non-existent tenant cannot access another tenant's report aggregations.

---

## 7. Completion Criteria
- [ ] 4 core reports connected to database queries.
- [ ] Report totals reconciled to the cent against seed fixtures.
- [ ] All mock export generators removed from `ReportsModule.tsx`.
- [ ] Worker processes queue jobs idempotently with retry support.
- [ ] Worker crash recovery verified.

---

## 8. Required Evidence and Next-Phase Handoff
- CSV export sample files and SQL reconciliation query outputs.
- Worker log output showing job transition `QUEUED -> PROCESSING -> SENT`.
- Proceed to **Phase 5 (Deployment & Recovery)**.

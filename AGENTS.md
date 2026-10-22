# AGENTS.md — EduNexus ERP (Version 1)

Context for AI coding agents working in this repository. Read this before changing code.
Last updated: 2026-10-22, after the V1 scope reduction.

---

## 1. What this is

**EduNexus** is a multi-tenant SaaS ERP for **schools and coaching institutes**. It is India-focused: UPI and bank-transfer payments, CBSE-style report cards, prices in ₹.

- One platform owner (**Super Admin**) sells subscriptions to institutions (**tenants**). Each tenant has a type: `school`, `coaching` or `hybrid`.
- **Version 1 is deliberately small.** The owner chose these modules only:

| Sidebar item | What it does |
|---|---|
| Dashboard | Key numbers per role |
| Students | Admission, profile, parents, yearly enrollment, Excel (.xlsx)/CSV import with flexible headers (unmatched columns kept in notes), parent/student logins, documents |
| Attendance | Daily class roster, corrections with history, reports. **QR attendance for coaching plans only** (§7) |
| Examinations | Grade scales, exams, schedules, marks entry, results, report cards, publish |
| Timetable | Weekly slots with teacher/room clash check. Students see their own timetable |
| Homework | Teachers post; parents and students see their own class's homework |
| Fees | Structures, assignments, installments, concessions, UPI/bank settings, proof upload, approval, receipts, reminders |
| Notices | Templates, in-app + email delivery, delivery log |
| Staff & HR | Staff records, teaching assignments, teacher invitations, Excel/CSV staff import, **leave** (types, balances, request/approve/revoke), **staff attendance**, **payroll** (salary structures, monthly runs, payslips). Employees without `staff.view` see it as "My HR" (own leave + payslips) |
| Reports | Student, attendance, fee and exam reports with CSV export |
| School/Institute Setup | Profile, academic years, classes, sections, subjects, teacher assignments |
| Users & Access | Invite users, fixed roles, activate/suspend, activity log |
| Subscription | Plan, payment-proof upload, renew |

  The parent portal, student portal, teacher view, Super Admin console, and the public landing/pricing/sign-up pages are also in V1.
- **Staff & HR is back in V1 (owner's request, 2026-10-22):** leave and staff attendance were restored from the archive as `routes/hr.ts`; payroll was built new (migration 0048). The legacy `payroll_records` table is unused.
- **Removed from V1 (planned for V2):** finance/accounting screens, library, inventory, transport, hostel, mess, CRM, AI assistant, health records, custom roles, multiple branches, student ID card, and homework submissions/grading. Their code was **deleted from `main`**. The full pre-V1 code, including an unfinished Gemini AI assistant, is preserved on the local branch **`archive/full-erp-before-v1`** (commit `aaeea88`). Their **database tables still exist** (unused), so V2 can be restored without data migration.
- **Payments are manual by design.** Payers transfer by bank or UPI, upload proof (screenshot + UTR), and an admin approves. This applies to SaaS subscriptions (Super Admin approves; the subscription activates) and to school fees (accountant/owner approves; a payment, a receipt `REC-YYYY-XXXXXX` and balanced journal lines are created). There is no payment gateway. Do not add one unless asked.

## 2. Repository layout

```
ERP/                         npm workspaces root (frontend, backend)
├── backend/                 Express 4 + TypeScript (ESM) + PostgreSQL 16 (raw SQL via `pg`, no ORM)
│   ├── src/server.ts        middleware order and route mounting
│   ├── src/config.ts        zod-validated env (fails fast at startup)
│   ├── src/db.ts            pg Pool, query(), transaction()
│   ├── src/worker.ts        notification/email worker (separate process)
│   ├── src/middleware/      auth, tenantContext, permission, businessAccess, enforceSubscription, errorHandler…
│   ├── src/routes/          one router per V1 module (see §5)
│   ├── src/services/        domain logic (fees, exams, notifications, email, QR, plan entitlements…)
│   ├── sql/001_schema.sql   baseline = migration native_0001
│   ├── sql/migrations/native_00NN_*.sql|.mjs   ordered migrations (0002–0047)
│   ├── migrate.mjs          migration runner (checksums, advisory lock)
│   ├── test-runner.mjs      recreates edunexus_erp_test, migrates, runs all suites
│   └── tests/*.test.mjs     node:test integration suites (real Postgres)
├── frontend/                React 18 + Vite 6 + Tailwind 3 + lucide-react (no router lib, no state lib)
│   ├── src/App.tsx          hash router + module switch + permission/subscription gates
│   ├── src/context/         AuthContext (user + permissions), TenantContext (institution from /auth/me)
│   ├── src/modules/<area>/  one screen component per module
│   └── src/services/        API clients (all talk to the backend; there is no mock data layer)
├── qa/                      one-off verification scripts from earlier phases (many are stale)
├── docs/                    specs and guides (many are stale, see §10)
└── .github/workflows/ci.yml CI: migrate → verify → seed → backend tests → builds → acceptance
```

The frontend deploys to Vercel. The backend and Postgres run on one Linux VPS (PM2 `edunexus-api` cluster plus a single `edunexus-worker`, behind Nginx). See `docs/DEPLOYMENT.md`.

## 3. Running it locally

```bash
# Database. On this machine Postgres lives in the docker-desktop WSL distro (data in C:\Users\asus\pg_data.img).
# Run from PowerShell, not Git Bash (Git Bash rewrites the /mnt path):
wsl -d docker-desktop -e sh /mnt/host/c/Users/asus/Desktop/ERP/backend/run_pg.sh
# Alternative: npm run db:up   (docker compose, fresh volume)

cd backend && npm run db:migrate   # apply migrations (needs backend/.env)
npm run dev:backend                # http://localhost:5000  (health: /health, API: /api/v1)
npm run dev:frontend               # http://localhost:5173  (login: /#login)
npm run test:backend               # drops/recreates edunexus_erp_test, migrates, runs all suites
npm run build                      # tsc + vite build for both
```

- `start-all.ps1` starts all three in separate windows.
- Required backend env: `DATABASE_URL`, `JWT_SECRET` (≥32 chars), `FRONTEND_URL`. Optional: `CORS_ORIGIN`, `EMAIL_DELIVERY_MODE=LOG|LIVE`, `RESEND_API_KEY`. The only frontend env is `VITE_API_URL`. Never put secrets in `VITE_*`.
- The camera-based QR scanner needs a secure context: `localhost` or HTTPS. A phone opening the LAN IP over plain HTTP cannot use the camera; it falls back to the 6-digit code.
- Test logins are in `LOGINS.md`. Don't copy them into code or new docs.

## 4. Backend architecture: the request pipeline

`server.ts` order:

1. `helmet` → `globalLimiter` → CORS allow-list → `express.json({limit:'12mb'})` (proof uploads are base64) → `requestId` → JSON logs.
2. Public: `/health`, `/api/v1/auth/*`, `/api/v1/billing/*` (plans and onboarding are public; the rest checks auth inside), `/api/v1/admin/billing/*` (Super Admin).
3. `/notifications`: `requireAuth` only. It stays reachable when the subscription has lapsed.
4. Everything else: `requireAuth` → `businessAccess` → `enforceSubscription` → module router. Every router is mounted on both `/api/v1` and `/api`.

### Auth
- JWT HS256 (issuer + audience). `requireAuth` re-reads user status, membership, role, tenant status and `auth_version` from the DB on every request. Bumping `auth_version` revokes all of a user's tokens.
- One JWT = one tenant membership.
- Fixed roles: `SUPER_ADMIN, TENANT_ADMIN, TEACHER, ACCOUNTANT, STAFF, PARENT, STUDENT`. Custom roles are V2.
- `GET /auth/me` returns `{ user (with permissions[]), institution: { id, name, type, entitlements[] } }`. The frontend gets the institution type and plan entitlements from here.

### Tenancy
- **Isolation is enforced in application code.** Every query filters `WHERE tenant_id = $n` with `req.tenantId`. Joins also match `tenant_id` on both sides. Keep that pattern.
- `tenantContext(true)` resolves `req.tenantId` from `X-Tenant-ID`, `?tenantId` or `body.tenantId`, falling back to the JWT tenant. Cross-tenant access → 403.

### Authorization
1. **`businessAccess`** is a default-deny **allow-list of V1 modules** (first path segment). Anything not listed returns 404. A new top-level module must be added there.
2. **`requirePermission('module.action')`** checks DB permissions (`memberships → role_permissions → permissions.key`). Use it on every route. Seed new keys in a migration with `ON CONFLICT(key) DO UPDATE` and grant them to roles in the same migration.
3. **Teaching scope:** `services/teachingAccess.ts → requireTeachingScope` limits teachers to their assigned class/section/subject.
4. **Plan entitlements:** `services/institutionFeatures.ts → requireEntitlement(tenantId, 'qr_attendance')` checks the institution type plus the active plan's `subscription_plans.entitlements`.

### Subscription gate
`enforceSubscription` returns 402 `SUBSCRIPTION_REQUIRED` when the subscription is inactive. A lapsed owner can only open the Subscription screen.

### Conventions
- Responses: `{ data, meta?, requestId, timestamp }`. Errors: `throw new AppError(message, status, CODE, details?)`. Unique violations map to friendly 409s in `errorHandler.KNOWN_UNIQUE_CONSTRAINTS`.
- zod + `validateBody`. Wrap handlers in `asyncHandler`.
- Money and state changes go in `transaction(...)` with row locks and `writeAudit(...)`.
- Fee approval auto-creates the school's default ledger accounts (`feeAccountingService.ensureDefaultFeeAccounts`). There is no Finance UI in V1, but journals are still written.
- Notifications: `enqueueNotification` → `notification_jobs` → `worker.ts` (LOG or Resend).
- **Code style is mixed.** Many route files are dense one-liners; newer files are formatted normally. Match the file you edit, and don't reformat whole files.

## 5. Route map (mounted in `server.ts`)

| Mount | File | Notes |
|---|---|---|
| `/auth` | `auth.ts` | signin, me (+ institution), password, signout, onboarding/accept, forgot/reset-password |
| `/billing` | `billing.ts` | plans (`?institutionType=` filter), payment settings/QR, onboard-institute, subscription, proof. A plan can only be bought by its `institution_types` |
| `/admin/billing` | `adminBilling.ts` | Super Admin: plans (incl. `entitlements`, `institutionTypes`), payment settings, proofs, subscriptions |
| `/notifications` | `notifications.ts` | own in-app notifications |
| `/dashboard` | `dashboard.ts` | role-aware summary |
| `/tenants` | `tenants.ts` | institution profile; Super Admin tenant management |
| `/students` | `studentLifecycle.ts` | admissions, guardians, enrollments, documents, invitations, `self/results` |
| `/parents` | `parents.ts` | parent portal: children, results |
| `/staff` | `academicOperations.ts` | staff, teaching assignments, `teaching-context` (misleading filename) |
| `/hr` | `hr.ts` | leave types/balances/requests, staff attendance (`PUT /attendance/bulk`), payroll (`/payroll/salaries`, `/payroll/runs` Draft→Finalized→Paid, `/payroll/my-payslips`). Permissions `hr.*`; loss of pay = ABSENT days + approved unpaid leave |
| `/attendance/qr` | `qrAttendance.ts` | QR attendance v2, coaching plans only (§7). Mounted before `/attendance` |
| `/attendance` | `attendanceOperations.ts` | roster, bulk mark, corrections, history, self/children, reports |
| `/timetable` | `timetableOperations.ts` | CRUD with clash detection; `GET /self` for students |
| `/exams` | `examinationOperations.ts` | exams, schedules, marks, grade scales, publish, report cards |
| `/homework` | `homework.ts` | list (role-scoped), post, delete. Permissions `homework.view` / `homework.manage` |
| `/fees` | `feeManagement.ts` | structures, assignments, proofs, verify, receipts, settings, reports |
| `/communication` | `communication.ts` | templates, deliveries, fee reminders |
| `/reports`, `/audit`, `/organization`, `/master-data` | same names | organization: users, invitations, memberships, `GET /roles` only |

## 6. Frontend architecture

- **Routing:** a hand-written hash router in `App.tsx` (`#/app/<module>`). Public routes are `''`, `landing`, `features`, `solutions`, `pricing`, `how-it-works`, `signup`, `onboarding`, `login`. The old `#/super-admin` link redirects to `#/app/superadmin-dashboard`.
- **Access:** `services/auth/permissionPolicy.ts → MODULE_ACCESS` + `canOpenModule` drive both the sidebar and route guards. `useTenant().hasEntitlement('qr_attendance')` shows or hides QR features.
- **Institution data:** `TenantContext` is filled from `/auth/me` (`activateAuthenticatedTenant(institution)`). Labels switch for coaching (Course/Batch/Test). There is **no** localStorage mock layer any more.
- **API:** `services/api/apiClient.ts` (Bearer token from `localStorage.edunexus_auth_token`, `X-Tenant-ID`, 10s timeout, 401 → session-expired modal). Thrown errors carry `code`, `status` and `details`.
- **Screens:** `modules/` contains only V1 screens. `AcademicOperationsModule` serves the Staff, Attendance and Timetable routes via `initialTab`. `modules/qrAttendance/` holds the QR teacher and student screens. `modules/timetable/StudentTimetable.tsx` is the student timetable.
- **Design:** white + green (emerald accents, slate neutrals). UI primitives are in `components/ui/` (`Button`, `Badge`, `Modal`, `StatCard`, …).
- `types/index.ts` still contains many legacy types from the mock era. They're harmless, and pruning is a cleanup task.

## 7. QR attendance v2 (coaching only)

- **Who gets it:** an institution with `tenant_type` of `coaching` or `hybrid` **and** an active plan whose `entitlements` include `qr_attendance`. Seeded plan: `COACHING_QR_MONTHLY` ("Coaching Plan", buyable only by coaching/hybrid). Schools never see it; the server returns 403 `FEATURE_NOT_IN_PLAN`.
- **How it works:**
  - The teacher picks a batch (class + section) and starts a session for today, in the institute's timezone. The server stores a per-session `signing_secret` (migration 0047).
  - The displayed QR payload is `ENX-QR2.<sessionId>.<window>.<HMAC>`. The window is 15 seconds, and one previous window is accepted for network delay. A 6-digit code is derived the same way, as a fallback when the camera can't be used.
  - The teacher screen polls `GET /sessions/:id/live` every 2s and renders the QR with `qrcode`. It has a full-screen projector mode.
  - The student taps Scan QR. The camera decodes with the native `BarcodeDetector` when available, otherwise `jsqr`, and calls `POST /attendance/qr/check-in` with `{payload}` or `{code}`.
  - The server checks the signature and window, that the session is active, that the user is a STUDENT linked to a student record, and their enrollment in that batch. It then upserts `attendance_records` (PRESENT) and inserts `attendance_qr_checkins`, which is unique per session and student. Check-ins are rate-limited (12/min per user).
  - Closing a session can mark everyone who didn't scan as ABSENT. Existing records are never overwritten.
- **Files:** `backend/src/services/qrAttendanceService.ts`, `services/institutionFeatures.ts`, `routes/qrAttendance.ts`, `frontend/src/modules/qrAttendance/*`, `services/qrAttendanceService.ts`. Tests: `backend/tests/qr-attendance-v2.test.mjs`.
- **Limits:** attendance is one record per student per day, so one QR session per batch per day. A code relayed live to someone outside the room still works within its window; adding location checks would be a V2 hardening step.

## 8. Database

- PostgreSQL 16, UUID PKs, `tenant_id` on business tables. Tables for V2 modules still exist but are unused.
- Student model: a permanent `students` identity + yearly `enrollments` (class and section live on the enrollment) + `parents`/`parent_students`.
- **Adding a migration:** create `backend/sql/migrations/native_00NN_snake_name.sql`. The next number is **0049**. Make it idempotent. **Never edit or delete an applied migration**: the runner stores checksums and refuses to start if one is missing (that's why `native_0046_ai_rag_assistant.sql` stays even though AI was removed).

## 9. Testing & QA

- `npm run test:backend` runs all suites against a recreated `edunexus_erp_test` (localhost only). Status 2026-10-22: **180/180 passing** with `--test-concurrency=1` (incl. `staff-hr-payroll.test.mjs`). `resend-provider`'s "two competing workers" test can fail intermittently when other suites enqueue emails at the same time; CI runs with `--test-concurrency=1`.
- CI runs an explicit list of suites in `.github/workflows/ci.yml`. Add new suites there.
- Frontend: `tsc` + `vite build` both pass. Playwright specs live in `frontend/e2e` and `frontend/tests` and may reference removed screens.
- `qa/` scripts are one-offs from earlier phases. Several still target V2 modules; treat them as stale.

## 10. Documentation: trust order

1. Code — the source of truth.
2. This file, `docs/DEPLOYMENT.md`, `COMMANDS.md`.
3. Everything else in `docs/` is largely aspirational or stale (Supabase, Razorpay, client-side AI, V2 modules). Module docs for removed features were deleted; the rest still describes more than V1 ships.

## 11. Known issues / next steps

- `LOGINS.md` is committed with plaintext passwords. Rotate them before any real deployment and untrack the file.
- `start-all.*`, `COMMANDS.md` and `run_pg.sh` hard-code the owner's Windows paths.
- PM2 cluster mode with in-memory rate limits means the limits apply per process.
- JWT is kept in `localStorage`, and the CSP allows `'unsafe-inline'` scripts.
- Planned V1.1 additions agreed with the owner: WhatsApp/SMS alerts (absence, fee due, results) and certificates (TC, bonafide, fee certificate).
- Coaching institutes reuse class + section as course + batch. A proper batch model is V2.

## 12. Rules of engagement for agents

- **Stay inside V1 scope.** Don't re-add a V2 module unless the owner asks; restore it from `archive/full-erp-before-v1` when they do.
- Every query is tenant-scoped. Every route needs `tenantContext(true)` + `requirePermission(...)`, and new top-level modules must be added to `businessAccess`.
- Paid features are gated by plan entitlements on the server (`requireEntitlement`), never only in the UI.
- No secrets in the frontend. Don't commit `.env` files or credentials.
- Schema changes go in a new numbered migration.
- Run `npm run build` and `npm run test:backend` before declaring a change done.
- Git: the owner works on `main`. Ask before committing or pushing.

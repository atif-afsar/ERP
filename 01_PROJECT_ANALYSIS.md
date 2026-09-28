# 01 — Project Analysis: EduNexus Multi-Tenant ERP SaaS

This document is the authoritative architectural reference. Antigravity must read it before testing so it understands *what* each feature is and *how* it works.

---

## 1. What EduNexus Is

EduNexus is a **multi-tenant Educational Resource Planning SaaS** for K-12 Schools, Competitive Coaching Institutes, and Hybrid Campuses. It dynamically adapts UI terminology and feature sets per institution type (School = Classes/Sections/CBSE Report Cards; Coaching = Batches/Test Series/DPPs/Rank Ledgers).

**Business proposition:** one platform, many institutions, strict tenant data isolation, offline-resilient frontend, idempotent payments, granular RBAC across 9 personas.

---

## 2. Repository Layout

```
ERP/
├── frontend/                 React 18 + Vite SPA (Vercel)
│   ├── src/
│   │   ├── App.tsx           Hash-router + route→permission map + module switch
│   │   ├── main.tsx          Boot + Tailwind CSS entry
│   │   ├── index.css         Tailwind layers + design tokens
│   │   ├── context/
│   │   │   ├── AuthContext.tsx   9-role state machine + can(permission)
│   │   │   └── TenantContext.tsx tenant switch + feature flags + labels
│   │   ├── components/
│   │   │   ├── auth/         LoginView, ForgotPasswordModal, PermissionGuard, SessionExpiredModal, UserInviteModal
│   │   │   ├── layout/       AppShell, Header, Sidebar, InteractiveDemoBar
│   │   │   ├── navigation/   Breadcrumbs
│   │   │   ├── ui/           Badge, Button, Modal, StatCard, Tabs, ErrorBoundary, NetworkStatusBanner, DataStateWrapper, ResourceState, hero components
│   │   │   └── ai/            GlobalAiAssistantBot
│   │   ├── modules/          24 feature modules (see §5)
│   │   ├── services/
│   │   │   ├── api/           apiClient, endpoints, apiTypes, errorHandler, resilience (retry + circuit breaker)
│   │   │   ├── auth/          authService, rbacService, accessEvaluator
│   │   │   ├── rag/           ragEngine, defaultCampusDocs (Gemini embedding)
│   │   │   ├── ai/            embeddedBrain (offline fallback)
│   │   │   ├── storageService.ts   localStorage-backed offline store
│   │   │   ├── backendClient.ts   health ping + latency display
│   │   │   └── .../index.ts       domain services (students, staff, fees, finance, exams, payroll, attendance, academic)
│   │   ├── repositories/      baseRepository, classRepository, studentRepository, tenantRepository
│   │   ├── lib/utils.ts      cn() tailwind-merge helper
│   │   └── types/index.ts    130+ permission keys, 9 roles, all domain entities
│   ├── dist/                  pre-built production bundle
│   └── package.json
├── backend/                   Node + Express + TypeScript (VPS / PM2)
│   ├── src/
│   │   ├── server.ts          Express app, helmet, CORS, health, route mounting (/api + /api/v1)
│   │   ├── config.ts          env-driven config (port, JWT, DB URL, CORS)
│   │   ├── db.ts              pg.Pool (max 20), query(), transaction(), checkDbHealth()
│   │   ├── middleware/
│   │   │   ├── auth.ts        requireAuth, optionalAuth, requireRole (JWT verify)
│   │   │   ├── tenantContext.ts   X-Tenant-ID resolution + cross-tenant denial
│   │   │   ├── errorHandler.ts    AppError + RFC-7807 JSON error envelope
│   │   │   ├── validation.ts     Zod validateBody / validateQuery
│   │   │   └── requestId.ts      X-Request-ID injection
│   │   ├── routes/            15 route files (see §4)
│   │   └── types/index.ts     Express augmentation (req.user, req.tenantId)
│   ├── sql/
│   │   ├── 001_schema.sql     30+ tables, UUID PKs, CASCADE, composite indexes
│   │   ├── 002_seed.sql       7 system roles, 38 permissions, demo tenant
│   │   └── migrations/       rls_policies.sql, schema.sql, seed.sql
│   ├── tests/api.test.mjs     node:test — bcrypt, JWT, tenant isolation, idempotency
│   ├── create-admin.mjs       CLI: provision SUPER_ADMIN
│   ├── deploy/                ecosystem.config.cjs (PM2), nginx.conf, setup-vps.sh
│   └── package.json
├── docs/                      80+ design/PRD/architecture markdown files
├── FEATURES_AND_WORKINGS.md   24-module feature catalog
└── package.json               npm workspace root (dev:frontend, dev:backend, build, test:backend)
```

---

## 3. Technical Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Vercel)  React 18 + Vite + TS + Tailwind + Motion │
│  • Hash-router (App.tsx) → ROUTE_PERMISSIONS → module switch │
│  • AuthContext: 9-role state machine, can(permission)        │
│  • TenantContext: switch tenant, feature flags, label engine│
│  • apiClient: Bearer JWT + X-Tenant-ID + Idempotency-Key     │
│  • Resilience: retry+backoff, circuit breaker, offline store  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS REST /api/v1
┌────────────────────────▼────────────────────────────────────┐
│ BACKEND (VPS)  Express + TS + PM2                            │
│  • helmet + strict CORS (Vercel origins)                      │
│  • requestId → morgan logs → JSON body parse (10mb)         │
│  • requireAuth (JWT) → tenantContext (X-Tenant-ID match)     │
│  • Zod validateBody/Query → route handler → AppError→RFC7807 │
└────────────────────────┬────────────────────────────────────┘
                         │ pg.Pool (max 20)
┌────────────────────────▼────────────────────────────────────┐
│ POSTGRESQL  127.0.0.1:5432  (native, RLS-ready)             │
│  • Every tenant-scoped table has tenant_id + composite index│
│  • RLS policies (sql/migrations/rls_policies.sql)            │
│  • Seed: 7 roles, 38 permissions, demo tenant "Delhi Public │
│    Academy" + 4 classes + 3 sections                         │
└─────────────────────────────────────────────────────────────┘
```

### Auth flow
1. `POST /api/v1/auth/signin` → bcrypt verify → sign JWT `{id,email,role,tenantId,isSuperAdmin}` (7d) → store token in `localStorage.edunexus_auth_token`.
2. Subsequent requests: `Authorization: Bearer <token>` + `X-Tenant-ID: <id>`.
3. `requireAuth` decodes JWT; `tenantContext` resolves tenant (super-admin bypass; cross-tenant → `memberships` check → 403).
4. Frontend `authService.signIn()` tries VPS first, falls back to local user store if offline. `restoreSession()` calls `GET /auth/me`.

### Offline-resilience flow
- `apiClient.execute(endpoint, config, fallbackHandler)` — tries live fetch; on network failure runs `fallbackHandler` (reads/writes `storageService` localStorage) and tags response `meta.offlineFallback = true`.
- `backendClient.checkConnection()` pings `/health` periodically → `NetworkStatusBanner` shows latency/status.
- `resilience.ts` — `withRetry` (exponential backoff + 30% jitter, max 3) and `CircuitBreaker` (CLOSED/OPEN/HALF_OPEN) for payment/SMS/email gateways.

### Payment idempotency flow
- Frontend generates `Idempotency-Key` per mutating request, caches response in localStorage.
- Backend `POST /payments` checks `idempotency_key` in `payments` table; if exists returns the original with `meta.idempotentReplay=true`. Otherwise inserts payment + updates `fee_assignments` (paid/balance/status) + writes `audit_logs` in one transaction.

---

## 4. Backend API Surface (15 modules, 50+ endpoints)

Base paths: `/api/v1` and `/api` (both mounted). Health: `GET /health`.

| Module | Endpoints | Key validation / RBAC |
|--------|-----------|------------------------|
| **auth** | `POST /signin` (Zod: email+password), `POST /signup` (email,min6,name,role?,tenantId?), `GET /me` (requireAuth), `POST /password` (requireAuth; oldPassword+newPassword min6), `POST /signout` | bcrypt compare; JWT sign; status ACTIVE check |
| **tenants** | `GET /` (optionalAuth; non-super sees only own), `GET /:id`, `POST /` (requireAuth; name+slug unique), `PATCH /:id` (requireAuth; allowlist fields) | slug uniqueness → 409 SLUG_EXISTS |
| **students** | `GET /` (paginate, search, classId, status), `GET /:id`, `POST /` (firstName+admissionNo; admission unique per tenant), `PATCH /:id`, `DELETE /:id` (soft → status ARCHIVED) | tenant filter always; STUDENT_EXISTS 409 |
| **staff** | `GET /` (department, status), `GET /:id`, `POST /` (name+employeeId+designation; upsert ON CONFLICT), `PATCH /:id` | employeeId unique per tenant |
| **academics** | `GET /classes` (with sections), `POST /classes` (upsert class+sections in tx), `DELETE /classes/:id`, `GET /subjects` | name required |
| **attendance** | `GET /` (date or startDate/endDate, studentId), `POST /` (array or single; upsert ON CONFLICT tenant+student+date) | status enum: PRESENT/ABSENT/LATE/EXCUSED/HALF_DAY |
| **fees** | `GET /structures`, `POST /structures` (name+totalAmount; breakdown JSON), `GET /assignments` (studentId filter), `POST /assignments` (studentId+totalAmount; starts UNPAID) | — |
| **payments** | `GET /` (studentId), `POST /` (studentId+amount>0; idempotency replay; tx: insert payment + update fee_assignment + audit log) | idempotency_key unique; payment_method enum |
| **finance** | `GET /expenses`, `POST /expenses` (title+amount>0; voucher auto), `GET /payroll` (joins staff) | category default OPERATIONAL |
| **exams** | `GET /`, `POST /` (name+startDate+endDate), `GET /results` (examId, studentId), `POST /results` (examId+studentId+totalMarks+obtainedMarks; upsert; auto percentage) | results unique per tenant+exam+student |
| **homework** | `GET /` (joins class+subject), `POST /` (classId+title+dueDate) | — |
| **timetable** | `GET /` (joins class+section+subject; order day+time), `POST /` (classId+sectionId+subjectId+dayOfWeek1-7+times) | day_of_week CHECK 1-7 |
| **communication** | `GET /announcements`, `POST /announcements` (title+content; targetRole default ALL), `GET /notifications` (scoped to user_id) | — |
| **auxiliary** | `GET/POST /inventory`, `GET/POST /library`, `GET /hostel`, `GET /mess`, `GET /transport`, `GET /health-records` (joins student) | all tenant-scoped |
| **audit** | `GET /logs` (last 100, joins user+profile), `POST /logs` (action+module; captures IP from x-forwarded-for) | — |

### Error envelope (RFC-7807 style)
```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...], "requestId": "req_..." },
  "requestId": "req_...",
  "timestamp": "2026-..."
}
```
Status codes: 200/201 (success), 400 BAD_REQUEST, 401 UNAUTHENTICATED/TOKEN_EXPIRED/INVALID_TOKEN, 403 FORBIDDEN/CROSS_TENANT_ACCESS_DENIED/CORS_FORBIDDEN, 404 NOT_FOUND, 409 *_EXISTS, 422 VALIDATION_ERROR, 500 INTERNAL.

---

## 5. Frontend Modules (24) & Screens

| Module (route) | File | Role visibility | Key features |
|----------------|------|-----------------|--------------|
| Dashboard (`dashboard`) | DashboardModule | All (super-admin→SuperAdminModule) | Stat cards, quick actions, AI launch |
| Students (`students`) | StudentsModule | !student,!parent | Directory, search, pagination, add/edit/archive, QR pass |
| Staff (`staff`) | StaffModule | admin,branch-mgr,accountant | Directory, departments, add/edit, payroll link |
| Academics (`academics`) | AcademicsModule | !student,!parent,!accountant | Classes/batches, sections, subjects, upsert |
| Attendance (`attendance`) | AttendanceModule | !accountant (feature-flagged) | Bulk mark, QR scanner, period-wise, analytics |
| Fees (`fees`) | FeesModule | admin,accountant,staff,parent,student | Structures, ledgers, invoices, dues |
| Payments — inside Fees | — | — | Multi-mode, idempotent, receipt |
| Finance (`finance`) | FinanceModule | admin,accountant,super-admin | Expenses, income, payroll, balance sheet |
| Inventory (`inventory`) | InventoryModule | admin,accountant,staff,super | Items, SKU, stock alerts, allocations |
| Library (`library`) | LibraryModule | admin,staff,teacher,student,parent | Catalog, issue/return, overdue fines |
| Transport (`transport`) | TransportModule | admin,staff,super,student,parent | Routes, vehicles, stops, drivers |
| Hostel (`hostel`) | HostelModule | admin,staff,super,student,parent | Blocks, rooms, capacity, wardens |
| Mess (`mess`) | MessModule | admin,staff,super,student,parent | Weekly menu, dietary, consumption |
| Health (`health`) | HealthModule | admin,staff,super,student,parent | Medical dossier, clinic log, emergency |
| Exams (`exams`,`results`) | ExamsModule | !accountant (feature-flagged) | Schedule, hall ticket, mark entry, report cards |
| Timetable (`timetable`) | TimetableModule | !accountant (feature-flagged) | Period grid, conflict check, room map |
| Homework (`homework`) | HomeworkModule | !accountant (feature-flagged) | Assign, target, submission tracking |
| Communication (`communication`) | CommunicationModule | !accountant (feature-flagged) | Notices, categories, priorities, read ack |
| CRM (`crm`) | CrmModule | admin,super,staff (feature inquiryCrm) | Lead pipeline, stages, follow-ups |
| Reports (`reports`) | ReportsModule | admin,super,branch-mgr | Analytics, financial/academic, exports |
| Super-Admin (`super-admin`,`superadmin-*`) | SuperAdminModule/Shell | super-admin only | Tenants, plans, feature catalog, switcher |
| Settings (`settings`,`superadmin-features`) | SettingsModule | admin,super | Institution config, feature toggles, labels |
| API Explorer (`api-docs`) | ApiExplorerModule | settings.view | Endpoint catalog, try-it |
| Schema Explorer (`schema`) | SchemaExplorerModule | settings.view | Tables/columns viewer |
| Roles Matrix (`roles-matrix`) | RolesMatrixModule | roles.manage | Role↔permission matrix |
| Onboarding (`signup`,`onboarding`) | OnboardingWizard | public | Self-serve tenant creation wizard |
| Public (`landing`,`features`,...) | LandingPage | public | Marketing site, hero, CTAs |

### Navigation (Sidebar.tsx)
Sections: **OVERVIEW** (dashboard) · **ACADEMICS** (students, academics, attendance, exams, timetable, homework) · **FINANCE & HR** (fees, finance, staff) · **OPERATIONS** (inventory, library, transport, hostel, mess, health) · **ADMINISTRATION** (communication, crm, reports, settings). Super-admin gets its own console (4 navs). Items hide via role + `isFeatureEnabled()`.

### Route→Permission map (App.tsx ROUTE_PERMISSIONS)
`students`→`students.view`, `staff`→`staff.read`, `attendance`→`attendance.view`, `fees`→`fees.view`, `finance`→`fees.view`, `library`→`library.view`, `transport`→`transport.view`, `hostel`→`hostel.view`, `mess`→`mess.view`, `health`→`health.view`, `exams`→`exams.view`, `timetable`→`timetable.view`, `homework`→`homework.view`, `communication`→`communication.send`, `crm`→`students.create`, `reports`→`reports.view`, `settings`→`settings.view`, `api-docs`/`schema`→`settings.view`, `roles-matrix`→`roles.manage`, `superadmin-*`→`tenants.manage`/`subscriptions.manage`.

---

## 6. RBAC Permission Matrix (AuthContext ROLE_PERMISSIONS)

> ✅ = granted. Blank = denied (frontend hides; backend enforces via requireRole + tenantContext).

| Permission | SUPER_ADMIN | TENANT_ADMIN | BRANCH_MGR | TEACHER | ACCOUNTANT | RECEPTIONIST | STAFF | PARENT | STUDENT |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| tenants.manage | ✅ | | | | | | | | |
| subscriptions.manage | ✅ | | | | | | | | |
| users.manage | ✅ | ✅ | | | | | | | |
| roles.manage | ✅ | ✅ | | | | | | | |
| settings.view/update | ✅ | ✅ | | | | | | | |
| students.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| students.create | ✅ | ✅ | ✅ | | | ✅ | ✅ | | |
| students.update | ✅ | ✅ | ✅ | | | ✅ | | | |
| students.delete | ✅ | ✅ | ✅ | | | | | | |
| attendance.view | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ |
| attendance.mark | ✅ | ✅ | ✅ | ✅ | | | ✅ | | |
| exams.view | ✅ | ✅ | ✅ | ✅ | | | | ✅ | ✅ |
| results.view | ✅ | ✅ | ✅ | ✅ | | | | ✅ | ✅ |
| results.create | ✅ | ✅ | ✅ | ✅ | | | | | |
| fees.view | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ | ✅ |
| payments.record | ✅ | ✅ | ✅ | | ✅ | ✅ | ✅ | ✅ | |
| homework.view/create/update | ✅ | ✅ | ✅ | ✅ | | | | | ✅(view) |
| timetable.view | ✅ | ✅ | ✅ | ✅ | | | | ✅ | ✅ |
| communication.send | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ | | |
| reports.view | ✅ | ✅ | ✅ | | ✅ | | | | |
| audit.view | ✅ | ✅ | | | | | | | |

(Full 130+ key list in `frontend/src/types/index.ts`.)

---

## 7. Database Schema Summary (30+ tables)

**Platform layer:** `tenants`, `tenant_settings`, `tenant_features`, `tenant_labels`.
**Auth/RBAC:** `users` (email, password_hash, status), `profiles`, `roles`, `permissions`, `role_permissions`, `memberships` (user↔tenant↔role).
**Academic:** `academic_years`, `classes`, `sections`, `subjects`.
**People:** `students` (admission_no unique per tenant, qr_code, status lifecycle), `parents`, `parent_students`, `enrollments`.
**HR:** `staff` (employee_id unique per tenant), `payroll_records`.
**Attendance:** `attendance_records` (unique tenant+student+date).
**Finance:** `fee_structures`, `fee_assignments` (paid/balance/status), `payments` (idempotency_key, receipt_no unique), `refunds`, `expenses`.
**Exams:** `exams`, `exam_subjects`, `results` (unique tenant+exam+student).
**LMS:** `homework`, `homework_submissions`, `timetable_entries`.
**Communication:** `announcements`, `notifications`, `audit_logs`.
**Auxiliary:** `inventory_items`, `library_books`, `hostel_rooms`, `mess_menus`, `transport_routes`, `health_records`.

All tenant-scoped tables carry `tenant_id UUID` + a composite index (see §12 of `001_schema.sql`). RLS policies in `sql/migrations/rls_policies.sql`.

---

## 8. Test Infrastructure That Already Exists

- **Backend unit tests:** `backend/tests/api.test.mjs` — 4 tests (bcrypt verify, JWT sign/verify, expired JWT, tenant-isolation logic, idempotency dedup). Run: `npm run test:backend` (node:test runner).
- **Pre-built artifacts:** `backend/dist/` (compiled JS) and `frontend/dist/` (production bundle) exist — so the project currently builds.
- **No frontend test runner** is configured (no Jest/Vitest in `frontend/package.json`) — visual/render testing must be done via build + browser.

---

## 9. Known Design Intent (test these specifically)

1. **Dual API base** (`/api` and `/api/v1`) — both must work identically.
2. **Soft delete** — `DELETE /students/:id` sets status `ARCHIVED`, not a row delete.
3. **Upserts** — classes, sections, staff, attendance, results use `ON CONFLICT ... DO UPDATE`.
4. **Super-admin tenant bypass** — can pass any `X-Tenant-ID`; normal users cross-checked against `memberships`.
5. **Tenant-suspended state** — frontend `SuspendedTenantView` blocks non-super-admins.
6. **School vs Coaching** — `TenantContext.getLabel()` swaps labels (Class↔Batch, Section↔Subgroup, Exam↔Test).
7. **Feature flags** — `isFeatureEnabled()` hides attendance/fees/exams/timetable/homework/communication/crm per tenant; disabled module → `UnauthorizedCard`.
8. **Anti-enumeration** — `forgotPassword` always returns the same generic success message.
9. **Rate limiting** — `storageService.getFailedAttempts()` locks after repeated failures (frontend layer).
10. **Idempotency** — both frontend (localStorage cache) and backend (DB unique key) layers.

---

## 10. Risks / Gaps To Verify

- ❓ No automated frontend tests — must verify rendering manually/headless.
- ❓ `optionalAuth` is used on most data routes (not `requireAuth`) — confirm data is still tenant-scoped (it is, via `tenantContext(true)`), but anonymous calls with an `X-Tenant-ID` could expose data. Verify this is intended for demo mode.
- ❓ `createToken` hardcodes `expiresIn: '7d'` ignoring `config.jwtExpiresIn` — verify behavior.
- ❓ Production `JWT_SECRET` empty → backend warns but may still start; verify it fails closed.
- ❓ CORS allows `no-origin` (server-to-server) and Vercel preview suffixes — verify no wildcard leak.
- ❓ SQL is parameterized everywhere (good) but verify no raw string concatenation in dynamic `WHERE`/`SET` builders (students/staff PATCH use allowlist maps — safe).

# EduNexus ERP — Acceptance Test Matrix

This matrix governs the qualification of features and workflows across all 8 phases.

| Test ID | Phase | Category | Module | Role / Persona | Type | Description | Expected Outcome | Status |
|---|---|---|---|---|---|---|---|---|
| **ATM-P1-01** | Phase 1 | Baseline | Database | Operator | Positive | Apply all 40 native migrations via `migrate.mjs up` | All migrations applied with checksum integrity | VERIFIED |
| **ATM-P1-02** | Phase 1 | Baseline | Database | Operator | Positive | Verify database structure via `verify-db.mjs` | 67 tables verified, 0 missing, 70 permissions active | VERIFIED |
| **ATM-P1-03** | Phase 1 | Baseline | Build | Developer | Positive | Compile backend TypeScript workspace (`tsc`) | Clean compilation with zero type errors | VERIFIED |
| **ATM-P1-04** | Phase 1 | Baseline | Build | Developer | Positive | Compile frontend Vite workspace (`vite build`) | Clean production bundle generated in `frontend/dist` | VERIFIED |
| **ATM-P1-05** | Phase 1 | Baseline | API | Anonymous | Positive | Query `GET /health` with active DB | Returns HTTP 200 with `{ status: 'healthy', database: { connected: true } }` | VERIFIED |
| **ATM-P1-06** | Phase 1 | Baseline | Auth | Tenant Admin | Positive | Headless browser login via Playwright | Returns HTTP 200, JWT token, redirects to `#/app/dashboard` | VERIFIED |
| **ATM-P1-07** | Phase 1 | Baseline | Test Runner | CI | Positive | Execute `node test-runner.mjs` in `backend/` | Test DB `edunexus_erp_test` created, suites run | VERIFIED |
| **ATM-P2-01** | Phase 2 | Security | RBAC | Student | Negative | Access `finance` module with `STUDENT` role | `canOpenModule` returns `false` (no unauthorized fall-through) | VERIFIED |
| **ATM-P2-02** | Phase 2 | Security | RBAC | Student | Negative | Access `saas-billing` module with `STUDENT` role | `canOpenModule` returns `false` | VERIFIED |
| **ATM-P2-03** | Phase 2 | Security | Attendance | Student | Positive | Query `GET /api/v1/attendance?studentId={self}` | Returns student's personal attendance history | VERIFIED |
| **ATM-P2-04** | Phase 2 | Security | Attendance | Student | Negative | Submit `POST /api/v1/attendance/mark` as `STUDENT` | Returns HTTP 403 Forbidden | VERIFIED |
| **ATM-P2-05** | Phase 2 | Uploads | Payments | Parent | Positive | Upload 4.8MB base64 receipt proof document | Returns HTTP 200/201, file accepted and stored | VERIFIED |
| **ATM-P2-06** | Phase 2 | Uploads | Payments | Parent | Negative | Upload 12MB payload | Returns HTTP 413 Payload Too Large with clear message | VERIFIED |
| **ATM-P2-07** | Phase 2 | Navigation | Prototype | User | Positive | Inspect prototype routes in `App.tsx` | Read-only banner clearly displayed, mutations disabled | VERIFIED |
| **ATM-P2-08** | Phase 2 | Security | AI / RAG | Client | Negative | Inspect client bundle for `VITE_GEMINI_API_KEY` | Zero API key occurrences found in client assets | VERIFIED |
| **ATM-P3-01** | Phase 3 | Core Flow | Admissions | Admin | Positive | Full student admission with guardian linking | Record created in `students`, activation link generated | VERIFIED |
| **ATM-P3-02** | Phase 3 | Core Flow | Auth | Parent | Positive | Activate parent account and log in | Password hashed, status active, child profile visible | VERIFIED |
| **ATM-P3-03** | Phase 3 | Core Flow | Attendance | Teacher | Positive | Teacher marks daily attendance for assigned section | Attendance records stored, student view updated | VERIFIED |
| **ATM-P3-04** | Phase 3 | Core Flow | Timetable | Admin | Negative | Assign teacher to two classes in the same period | Returns HTTP 409 Conflict with schedule error | VERIFIED |
| **ATM-P3-05** | Phase 3 | Core Flow | Fees | Accountant | Positive | Verify offline payment proof and issue receipt | Balance decremented, sequential receipt generated | VERIFIED |
| **ATM-P3-06** | Phase 3 | Concurrency | Fees | Accountant | Negative | Parallel double-approval of same invoice | Second approval rejected, balance does not go negative | VERIFIED |
| **ATM-P3-07** | Phase 3 | Multi-Tenant | Core | Parent | Negative | Parent queries student from different tenant | Returns HTTP 404/403 (Cross-tenant data inaccessible) | VERIFIED |
| **ATM-P3-08** | Phase 3 | Multi-Tenant | Core | Parent | Negative | Parent queries unrelated student in same tenant | Returns HTTP 403 Forbidden | VERIFIED |
| **ATM-P3-09** | Phase 3 | Core Flow | Exams | Teacher/Admin | Positive | Enter marks, publish exam, view in parent portal | Marks visible only after status changes to `PUBLISHED` | VERIFIED |
| **ATM-P4-01** | Phase 4 | Reports | Enrollment | Admin | Positive | Generate Enrollment Summary Report | Returns accurate student counts by grade and gender | NOT_STARTED |
| **ATM-P4-02** | Phase 4 | Reports | Finance | Accountant | Positive | Generate Collections Report | Total equals sum of verified payments in ledger | NOT_STARTED |
| **ATM-P4-03** | Phase 4 | Notification | Queue | Worker | Positive | Background worker processes queued email in LOG mode | Delivery status updated to `SENT`, log written | NOT_STARTED |
| **ATM-P4-04** | Phase 4 | Notification | Queue | Worker | Positive | Re-enqueue job with same `idempotency_key` | Returns existing job without duplicate processing | NOT_STARTED |
| **ATM-P5-01** | Phase 5 | Operations | Supervision | System | Positive | Start API and Worker under supervisor | Both processes run stably and recover after crash | NOT_STARTED |
| **ATM-P5-02** | Phase 5 | Operations | Recovery | Operator | Positive | Restore backup into `edunexus_recovery_test` | All 67 tables and record counts restored cleanly | NOT_STARTED |
| **ATM-P5-03** | Phase 5 | CI | Pipeline | Git Runner | Positive | Run root-level CI workflow | Migrations, builds, and tests exit code 0 | NOT_STARTED |
| **ATM-P6-01** | Phase 6 | Acceptance | Pilot | 5 Personas | Positive | Execute full workflow for each canonical role | All 5 journeys succeed with no UI breakages | NOT_STARTED |
| **ATM-P6-02** | Phase 6 | Usability | UI | Mobile | Positive | Navigate all core screens at 375px width | Layout responsive, zero horizontal document scrolling | NOT_STARTED |
| **ATM-P6-03** | Phase 6 | Resilience | UI | User | Negative | Click mutation button rapidly multiple times | Button disabled with spinner, exactly 1 request sent | NOT_STARTED |
| **ATM-P6-04** | Phase 6 | Resilience | Auth | User | Negative | Expire user JWT during active session | `SessionExpiredModal` displays, prompts re-login | NOT_STARTED |
| **ATM-P7-01** | Phase 7 | Modules | Homework | Student | Positive | Submit homework assignment before deadline | Submission record created with attachment | NOT_STARTED |
| **ATM-P7-02** | Phase 7 | Modules | CRM | Counselor | Positive | Convert CRM inquiry to student admission | Student record created, inquiry marked `CONVERTED` | NOT_STARTED |
| **ATM-P7-03** | Phase 7 | Modules | Library | Librarian | Positive | Issue book copy to student | Copy status updated to `ISSUED`, copies count decremented | NOT_STARTED |
| **ATM-P8-01** | Phase 8 | Integration | Payments | Gateway | Positive | Process valid signed Razorpay webhook | Invoice marked paid, receipt generated idempotently | NOT_STARTED |
| **ATM-P8-02** | Phase 8 | Integration | Payments | Attacker | Negative | Send webhook with forged HMAC signature | Returns HTTP 400 Invalid Webhook Signature | NOT_STARTED |
| **ATM-P8-03** | Phase 8 | Integration | Storage | User | Positive | Upload document via S3 presigned URL | Upload completes, file accessible only within tenant | NOT_STARTED |
| **ATM-P8-04** | Phase 8 | Integration | AI | User | Positive | Query server-side AI assistant | Query answered without client-side API key | NOT_STARTED |

# EduNexus ERP — API Status Report

Date: 2026-09-29  
Scope: backend route registration/SQL/middleware and frontend callers. No live database mutations or external integrations performed.

## Summary

backend/src/server.ts mounts 15 route modules beneath both /api and /api/v1. There are 57 router handlers representing 59 method/path combinations (attendance and fee-ledger aliases account for the difference), plus health endpoints.

"Implemented" means a handler exists, not that its workflow is production-complete. Almost every business handler uses optionalAuth + tenantContext(true), so a tenant header is accepted without authentication. All data-backed endpoints remain integration-unverified on a populated native database.

## Complete registered endpoint inventory

Paths below are relative to /api/v1; the same paths also exist under /api. GET /health additionally exists outside the API prefix.

Auth codes: PUBLIC = no required login; REQUIRED = JWT required; OPTIONAL/TENANT = invalid/missing token tolerated and tenant can be caller-supplied.

| Module/source | Method and path | Authentication | Implemented behavior / caveat |
|---|---|---|---|
| server.ts | GET /health | PUBLIC | DB health result, 200/503 |
| auth.ts:40 | POST /auth/signin | PUBLIC | Validates credentials, bcrypt, JWT; async failures escape |
| auth.ts:105 | POST /auth/signup | PUBLIC | Inserts user/profile/membership; caller chooses tenant and non-admin role |
| auth.ts:186 | GET /auth/me | REQUIRED | Current user/profile/membership |
| auth.ts:229 | POST /auth/password | REQUIRED | Verifies old password and updates hash |
| auth.ts:255 | POST /auth/signout | PUBLIC | Acknowledgment only; no JWT revocation |
| tenants.ts:9 | GET /tenants | OPTIONAL | Anonymous requests can list all tenants |
| tenants.ts:31 | GET /tenants/:id | OPTIONAL | No membership check on tenant detail |
| tenants.ts:45 | POST /tenants | REQUIRED | Explicit Super Admin check |
| tenants.ts:76 | PATCH /tenants/:id | REQUIRED | Super Admin or matching tenant; no admin-role requirement |
| students.ts:37 | GET /students | OPTIONAL/TENANT | Search/class/status and page/pageSize; default 20, maximum 100 |
| students.ts:93 | GET /students/:id | OPTIONAL/TENANT | Tenant-filtered detail |
| students.ts:111 | POST /students | OPTIONAL/TENANT | Creates server UUID; validates name/admission minimally |
| students.ts:166 | PATCH /students/:id | OPTIONAL/TENANT | Allowlisted field updates |
| students.ts:222 | DELETE /students/:id | OPTIONAL/TENANT | Soft archive, not deletion |
| students.ts:240 | POST /students/:id/archive | OPTIONAL/TENANT | Soft archive |
| staff.ts:28 | GET /staff | OPTIONAL/TENANT | Department/status filtering |
| staff.ts:61 | GET /staff/:id | OPTIONAL/TENANT | Detail |
| staff.ts:79 | POST /staff | OPTIONAL/TENANT | Create/upsert by tenant+employee ID; not all fields updated on conflict |
| staff.ts:121 | PATCH /staff/:id | OPTIONAL/TENANT | Limited field update |
| academics.ts:10 | GET /academics/classes | OPTIONAL/TENANT | Classes with sections |
| academics.ts:53 | POST /academics/classes | OPTIONAL/TENANT | Transactional class/section upsert; unsafe global ID conflict |
| academics.ts:134 | DELETE /academics/classes/:id | OPTIONAL/TENANT | Physical delete with SQL cascades |
| academics.ts:152 | GET /academics/subjects | OPTIONAL/TENANT | Raw subject rows |
| attendance.ts:22 | GET /attendance | OPTIONAL/TENANT | Date/range/student filters |
| attendance.ts:68 | POST /attendance; POST /attendance/bulk | OPTIONAL/TENANT | Transactional daily upsert; skips incomplete entries |
| fees.ts:26 | GET /fees/structures | OPTIONAL/TENANT | Basic structures |
| fees.ts:51 | POST /fees/structures | OPTIONAL/TENANT | Creates structure |
| fees.ts:81 | GET /fees/assignments; GET /fees/ledgers | OPTIONAL/TENANT | Basic assignment balances |
| fees.ts:105 | POST /fees/assignments | OPTIONAL/TENANT | Creates individual assignment |
| payments.ts:29 | GET /payments | OPTIONAL/TENANT | Optional student filter |
| payments.ts:53 | POST /payments | OPTIONAL/TENANT | Transactional payment, balance update and audit; unsafe retry/linkage semantics |
| finance.ts:10 | GET /finance/expenses | OPTIONAL/TENANT | Lists expenses |
| finance.ts:37 | POST /finance/expenses | OPTIONAL/TENANT | Creates expense immediately APPROVED |
| finance.ts:72 | GET /finance/payroll | OPTIONAL/TENANT | Reads payroll aggregate records |
| exams.ts:10 | GET /exams | OPTIONAL/TENANT | Basic exam list |
| exams.ts:36 | POST /exams | OPTIONAL/TENANT | Creates basic exam |
| exams.ts:68 | GET /exams/results | OPTIONAL/TENANT | Exam/student filtering; no learner/parent ownership or published-only scope |
| exams.ts:124 | POST /exams/results | OPTIONAL/TENANT | Upserts result immediately PUBLISHED |
| exams.ts:158 | POST /exams/:examId/publish | OPTIONAL/TENANT | Changes exam status; no approval workflow |
| homework.ts:10 | GET /homework | OPTIONAL/TENANT | Lists class homework |
| homework.ts:43 | POST /homework | OPTIONAL/TENANT | Creates homework |
| timetable.ts:9 | GET /timetable | OPTIONAL/TENANT | Joins class/section/subject |
| timetable.ts:46 | POST /timetable | OPTIONAL/TENANT | Inserts slot without collision validation |
| communication.ts:10 | GET /communication/announcements | OPTIONAL/TENANT | Tenant feed, no target-role filtering |
| communication.ts:34 | POST /communication/announcements | OPTIONAL/TENANT | Creates notice |
| communication.ts:57 | GET /communication/notifications | OPTIONAL/TENANT | User-scoped only if authenticated; otherwise tenant-wide |
| audit.ts:9 | GET /audit/logs | OPTIONAL/TENANT | Latest 100 events |
| audit.ts:42 | POST /audit/logs | OPTIONAL/TENANT | Client supplies action/module/details |
| auxiliary.ts:11 | GET /inventory | OPTIONAL/TENANT | Aggregate items |
| auxiliary.ts:30 | POST /inventory | OPTIONAL/TENANT | Creates item |
| auxiliary.ts:43 | GET /library | OPTIONAL/TENANT | Aggregate catalog |
| auxiliary.ts:61 | POST /library | OPTIONAL/TENANT | Creates book title/aggregate copies |
| auxiliary.ts:74 | GET /hostel | OPTIONAL/TENANT | Room summary only |
| auxiliary.ts:94 | GET /mess | OPTIONAL/TENANT | Menu only |
| auxiliary.ts:111 | GET /transport | OPTIONAL/TENANT | Route summary only |
| auxiliary.ts:132 | GET /health-records | OPTIONAL/TENANT | Basic health profiles only |
| auxiliary.ts:160 | POST /reports/export | OPTIONAL/TENANT | Stub: completed job with Demo Export Data text |

## Confirmed defects and frontend/backend mismatches

### API-01 — Critical: optional authentication is the business-route default

middleware/auth.ts ignores token failures in optionalAuth. middleware/tenantContext.ts accepts X-Tenant-ID, query tenantId or body tenantId for anonymous callers. Supplying an invalid JWT does not prevent access; authorization is absent independently of UI guards.

requireRole exists but is not applied to business routers. No server permission lookup against role_permissions is used. Student, parent and teacher self/child/assigned-resource scopes are not enforced by tenant filtering alone.

### API-02 — Critical: tenant membership and status controls are insufficient

Public signup accepts tenantId and creates an active membership without invitation/ownership verification. It blocks only two exact privileged role strings; role selection is not a controlled enrollment workflow. If tenantId is absent it selects the first tenant. Tenant PATCH permits any authenticated user of that tenant, regardless of administrative role.

Sign-in checks user status but not tenant suspension. Tenant membership is encoded into a JWT; subsequent requests do not consistently revalidate active membership/status. Authenticated users with multiple tenants do not receive a clear active membership/role selection flow.

Evidence: auth.ts:105, tenants.ts:76, middleware/tenantContext.ts.

### API-03 — High: Express async errors bypass error middleware

Backend package uses Express 4. Routes register async handlers directly with no rejection wrapper or general next(error) forwarding. Synchronous middleware errors are handled, but an awaited query failure escapes.

Reproduction: import existing backend source through in-memory TypeScript transpilation; set NODE_ENV=test and deliberately unreachable DB port 1; start ephemeral localhost listener; submit syntactically valid sign-in. Observed unhandled ECONNREFUSED and client TimeoutError after 1.8 seconds. Harness listener prevented process exit. No real account/database was accessed.

Consequence: DB errors and AppErrors thrown inside async route handlers may hang or crash instead of returning the documented JSON error.

### API-04 — High: request wrappers omit POST payloads

frontend/src/services/api/endpoints.ts:
- studentsApi.create accepts data but does not pass body.
- attendanceApi.recordBulk accepts records but does not pass body.
- financeApi.recordPayment accepts paymentData but does not pass body.
- reportsApi.createExportJob accepts resourceType but does not pass body.

Intercepted apiClient.request configs confirmed all four have method and tenantId but no body. The local fallback closures still receive data, making demos appear successful. Attendance can even return an empty successful response because missing student/date entries are skipped.

studentsApi.list does not transmit pagination/search params; attendanceApi.list does not transmit date. Backend supports those query parameters, but these wrappers apply them only locally.

### API-05 — High: student repository updates create instead

repositories/studentRepository.ts:save always POSTs /students. studentService.updateStudent and archiveStudent call save. Existing admission numbers encounter the create conflict rather than PATCH; broad fallback then marks the local operation successful.

Deletion is also inconsistent: server DELETE archives while local delete removes the row. Server list defaults to all statuses, so a refresh can show the archived row again.

### API-06 — High: generated IDs break associated records

StudentsModule.handleCreateStudent generates student-* and builds guardian/enrollment references from that ID. POST /students ignores supplied ID and returns a UUID. The UI does not adopt the returned ID for those relationships. Local classes/tenants also use non-UUID IDs unsuitable for native foreign keys.

### API-07 — High: successful empty data and pagination are mishandled

StudentRepository returns live rows only when length > 0; empty results become mock/cache rows. Isolated probe of an empty successful response returned four seeded students with isOffline:true.

getAll sends no page controls and discards response metadata; the student screen filters its fetched array rather than fetching all server pages. The backend's default 20-row page can be presented as the entire list.

### API-08 — High: fallback converts denial/failure to success

apiClient.execute catches any request failure, including 401/403/409/422, and invokes local handlers. Repositories/services similarly swallow errors. There is no outbox or synchronization guarantee. Server values are not consistently copied into local datasets.

The idempotency cache in apiClient is keyed only by the supplied key, not tenant/user/endpoint/payload, and no expiry enforcement is present. This is separate from the missing server unique idempotency constraint.

### API-09 — High: payment contract and ledger logic differ

Frontend PaymentTransaction uses modes such as RAZORPAY_UPI and status SUCCESS. Native payments CHECK accepts CASH/UPI/CARD/NET_BANKING/CHEQUE/ONLINE and backend reports COMPLETED. Unmapped modes fail at SQL.

fees/ledgers returns totalAmount/balanceAmount, while the direct typed wrapper claims StudentFeeLedger with totalFee/netPayable/dueAmount. A separate feeService maps these fields but supplies placeholders (including 50000 for a legitimate zero total via ||). The FeesModule itself uses local storage.

Server retry checks are not concurrency-safe. Explicit assignment/student matching and amount limits are missing. Auto-selected assignment is not linked back to the inserted payment. No live gateway order/verify/webhook/refund flow exists.

### API-10 — Medium: attendance result shape differs

recordBulk wrapper promises {processed, successful, records}, while backend returns a data array plus meta.total. API response lacks UI fields such as studentName, groupId, groupName, method and markedBy; service fills placeholders. marked_by column is not populated by the write route. No subject/period or audited correction API exists.

### API-11 — High: exam approval semantics conflict

UI separates calculation, approval, publication, grace marks and revisions. POST /exams/results publishes directly, accepts client totals/percentage/grade and does not validate ranges or nonzero totalMarks. Publish endpoint updates exam status only. Raw snake_case mutation responses differ from mapped GET results.

### API-12 — Medium: timetable, homework and notice DTOs differ

Timetable UI uses string dayOfWeek, groupId/groupName, subject text and roomNo; server requires numeric weekday, classId/sectionId/subjectId and room.

Homework UI uses groupId/groupName, subject text, teacherName, assignedDate and submission counts; server uses classId/subjectId and does not return the full UI model.

Notice UI model carries audience/priority metadata not represented by the basic announcements response. GET does not enforce targetRole visibility.

### API-13 — Medium: tenant configuration save/read is lossy

TenantRepository constructs branding, features, academic year, plan and renewal defaults rather than loading configuration tables. Suspended/inactive statuses map to trial; hybrid maps to SCHOOL.

save only PATCHes an existing tenant and backend's allowlist omits currency/timezone/slug/labels/features/payment config. TenantContext and onboarding do not use this repository, so actual UI configuration remains local.

### API-14 — High: diagnostic success can be synthetic

Backend reports/export returns a data URL containing demo text with status completed. It does not query data or enqueue work. healthApi fallback asserts database connected and gateway online after failure; actual /health has a different schema. These cannot be used as deployment acceptance signals.

## Missing API capabilities

Existing list/create handlers should be extended rather than duplicated.

| Domain | Missing operations |
|---|---|
| Identity/RBAC | Password reset request/verify/complete; invitations/acceptance; user/membership management; role-permission CRUD; server session revoke/logout-all; appropriate rate limits |
| Tenant/platform | Atomic tenant+owner onboarding; branches; settings/features/labels persistence; subscription/billing/entitlement lifecycle |
| Master data | Academic year CRUD/current-year selection; course/batch/subject mappings; subject mutations; standalone section management; teacher assignments |
| Students | Guardian relationships, enrollment history/promotion, document upload/download, real bulk import with validation/errors |
| Staff/payroll | Staff archive/delete contract, assignments, salary structures, runs, approvals, disbursement records, payslips/advances |
| Attendance | Period/session tracking, correction history, secure scan verification, attendance alerts |
| Fees | Installments, class/batch bulk assignment, concession approvals, refunds, receipt delivery; gateway order/verify/webhooks/reconciliation |
| Finance | Expense review/payment transitions; vendors/bills; bank/cash accounts; transfers; budgets; journals/reconciliation |
| Exams | Exam subjects/schedules; grade scales; draft marks, calculation, approval, revisions/grace, controlled publish/unpublish, report-card generation |
| Homework | Submission/upload/grading, update/delete and recipient scope |
| Timetable | Update/delete, overlap validation, teacher/room/group views |
| Communication | Notification creation/read-state, delivery jobs/providers, audience targeting, acknowledgments |
| CRM | Lead creation/update, pipeline transitions, counselor tasks/follow-ups |
| Library | Copies/members, issue/return/renew, reservation/fines |
| Inventory | Stock movements/warehouses/assets/maintenance |
| Hostel | Hostels/rooms/beds mutation, allocation/checkout, passes/attendance/complaints |
| Mess | Plans/subscriptions/menu mutation, consumption/feedback |
| Transport | Vehicles/drivers/stops/enrollment/trips/fuel mutations |
| Health | Profile mutation, visits/allergies/vaccines/screenings/clinics |
| Reports/AI | Real exports/job status/download, server aggregates, tenant-scoped AI document ingest/query |

## Validation, observability and errors

Positive foundations: parameterized SQL, selected field allowlists, pg transactions, Helmet, CORS, request IDs, centralized error envelope and auth Zod schemas.

Gaps: most inputs lack complete schemas/UUID checks/enum/date/range validation; missing row-level authorization; unbounded list responses in many modules; generic raw error messages; no consistent SQL error-to-HTTP mapping; no complete mutation audit; no backend application-level auth throttling; no strict idempotency payload verification.

The error JSON is an application envelope, not a full RFC-7807 Problem Details implementation despite documentation claims. Request IDs and logging do not establish business correctness.

## Verification scope

9 existing tests pass but do not start Express or use PostgreSQL; several define their own security/payment functions. Frontend security suites principally test local helpers, not native RLS.

Runtime observed: unknown route 404, protected /auth/me 401, missing-tenant 400, DB-unavailable health 503, sign-in DB failure unhandled/hanging. Successful authenticated CRUD, actual schema constraints, concurrency, roles and two-tenant isolation require integration tests against a disposable real native database.

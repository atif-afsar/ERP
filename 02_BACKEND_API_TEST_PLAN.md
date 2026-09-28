# 02 — Backend API Test Plan

> Every endpoint across all 15 route modules. Base URL: `http://127.0.0.1:5000`. Both `/api/v1` and `/api` prefixes must behave identically — **run each test against both**.
>
> **Conventions**
> - `TOKEN_X` = Bearer JWT for role X. `TENANT_A` = demo tenant UUID `a1b2c3d4-...`. `TENANT_B` = a second tenant you create.
> - Headers for tenant-scoped calls: `Authorization: Bearer <token>` + `X-Tenant-ID: <uuid>`.
> - Expected success envelope: `{ data, meta?, requestId, timestamp }`. Error: `{ error:{code,message,details,requestId}, requestId, timestamp }`.
>
> **Test ID format:** `API-<MODULE>-<NNN>`.

---

## 0. Health & Infrastructure

### `API-SYS-001` — Health endpoint returns healthy
- **Req:** `GET /health`
- **Expect:** 200; body `status:"healthy"`, `api:true`, `database.connected:true`, `uptimeSeconds`>0, `environment` matches `NODE_ENV`.

### `API-SYS-002` — Health degrades when DB down
- Stop PostgreSQL (`sudo systemctl stop postgresql`). `GET /health`.
- **Expect:** 503; `status:"degraded"`, `database.connected:false`, `error` populated.
- Restart DB after.

### `API-SYS-003` — 404 catch-all
- `GET /api/v1/this-does-not-exist`
- **Expect:** 404; `error.code:"NOT_FOUND"`, message contains method+URL.

### `API-SYS-004` — RFC-7807 error shape on uncaught throw
- Send malformed JSON to `POST /api/v1/auth/signin` with `Content-Type: application/json` body `{bad json`.
- **Expect:** 400; envelope contains `error.code`, `error.message`, `requestId`.

### `API-SYS-005` — Helmet security headers present
- `GET /health` → inspect headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.
- **Expect:** all helmet defaults present.

### `API-SYS-006` — CORS allows Vercel, blocks others (production)
- Production mode, `FRONTEND_URL=https://app.vercel.app`. Preflight `OPTIONS /api/v1/auth/signin` from `Origin: https://evil.com`.
- **Expect:** 403 `CORS_FORBIDDEN`.
- From `Origin: https://app.vercel.app` → `Access-Control-Allow-Origin` echoed.

### `API-SYS-007` — X-Request-ID echoed
- Send `X-Request-ID: my-test-id-123` on any request.
- **Expect:** response `requestId === "my-test-id-123"`.

---

## 1. Auth (`/api/v1/auth`)

### `API-AUTH-001` — Sign in with valid super-admin credentials
- **Req:** `POST /auth/signin` body `{ "email":"superadmin@edunexus.io", "password":"Admin@123" }` (from `create-admin.mjs`).
- **Expect:** 200; `data.user` (id,email,name,role="SUPER_ADMIN",tenantId), `data.token` (JWT), `data.expiresAt`. Decode JWT → claims `{id,email,role,tenantId,isSuperAdmin:true}`.

### `API-AUTH-002` — Sign in wrong password
- Same email, password `"wrong"`.
- **Expect:** 401 `INVALID_CREDENTIALS` (identical message to non-existent user — anti-enumeration).

### `API-AUTH-003` — Sign in non-existent email
- `email:"nobody@nowhere.com"`.
- **Expect:** 401 `INVALID_CREDENTIALS` (same message as AUTH-002).

### `API-AUTH-004` — Sign in inactive user
- DB-set a user `status='INACTIVE'`. Sign in with correct password.
- **Expect:** 403 `ACCOUNT_INACTIVE`.

### `API-AUTH-005` — Sign in validation (Zod)
- Body `{ "email":"not-an-email", "password":"" }`.
- **Expect:** 422 `VALIDATION_ERROR`; `details` array lists `email` + `password` field issues.

### `API-AUTH-006` — Signup creates user + profile + membership
- `POST /auth/signup` `{ email, password:"Pass123456", name:"Test Teacher", role:"TEACHER", tenantId:TENANT_A }`.
- **Expect:** 201; user created; DB `users`+`profiles`+`memberships` rows exist; returns token.

### `API-AUTH-007` — Signup duplicate email
- Repeat AUTH-006.
- **Expect:** 409 `USER_EXISTS`.

### `API-AUTH-008` — Signup password too short
- `password:"123"` (<6).
- **Expect:** 422 `VALIDATION_ERROR` on `password`.

### `API-AUTH-009` — GET /me with valid token
- `Authorization: Bearer TOKEN`. `GET /auth/me`.
- **Expect:** 200; returns full profile incl. `role`, `tenantId`, `tenantName`, `isSuperAdmin`.

### `API-AUTH-010` — GET /me without token
- No Authorization header.
- **Expect:** 401 `UNAUTHENTICATED`.

### `API-AUTH-011` — GET /me with expired token
- Sign JWT with past expiry. `GET /auth/me`.
- **Expect:** 401 `TOKEN_EXPIRED`.

### `API-AUTH-012` — GET /me with tampered token
- Change one char of a valid token.
- **Expect:** 401 `INVALID_TOKEN`.

### `API-AUTH-013` — Change password success
- `POST /auth/password` (with token) `{ oldPassword:"Admin@123", newPassword:"NewPass12345" }`.
- **Expect:** 200 `success:true`. Then sign in with new password works; old fails.

### `API-AUTH-014` — Change password wrong old
- `oldPassword:"wrong"`.
- **Expect:** 400 `INCORRECT_PASSWORD`.

### `API-AUTH-015` — Change password new too short
- `newPassword:"12"` (<6).
- **Expect:** 422 `VALIDATION_ERROR`.

### `API-AUTH-016` — Sign out
- `POST /auth/signout`.
- **Expect:** 200 `success:true` (stateless; token invalidated client-side).

---

## 2. Tenants (`/api/v1/tenants`)

### `API-TEN-001` — Super-admin lists all tenants
- `GET /tenants` with super-admin token.
- **Expect:** 200; array incl. demo tenant "Delhi Public Academy".

### `API-TEN-002` — Non-super sees only own tenant
- Tenant-admin token.
- **Expect:** 200; array length 1; `id === user.tenantId`.

### `API-TEN-003` — Get tenant by id
- `GET /tenants/a1b2c3d4-...`.
- **Expect:** 200; full tenant object.

### `API-TEN-004` — Get unknown tenant
- `GET /tenants/<random-uuid>`.
- **Expect:** 404 `NOT_FOUND`.

### `API-TEN-005` — Create tenant (requireAuth)
- `POST /tenants` (token) `{ name:"Test Coaching", slug:"test-coaching", tenantType:"coaching", status:"active", city:"Mumbai" }`.
- **Expect:** 201; returns tenant; DB row exists.

### `API-TEN-006` — Create tenant duplicate slug
- Repeat slug.
- **Expect:** 409 `SLUG_EXISTS`.

### `API-TEN-007` — Create tenant missing name/slug
- `{ city:"X" }`.
- **Expect:** 422 `VALIDATION_ERROR`.

### `API-TEN-008` — Create tenant no auth
- Remove token.
- **Expect:** 401 `UNAUTHENTICATED`.

### `API-TEN-009` — Patch tenant fields (allowlist)
- `PATCH /tenants/<id>` `{ name:"Renamed", email:"x@y.com" }`.
- **Expect:** 200; updated fields reflected.

### `API-TEN-010` — Patch tenant ignores disallowed fields
- `{ isAdmin:"true", randomField:"hack" }`.
- **Expect:** 400 `BAD_REQUEST` ("No valid fields") — allowlist enforced.

---

## 3. Students (`/api/v1/students`)

### `API-STU-001` — List with pagination
- `GET /students?page=1&pageSize=5` (+tenant header).
- **Expect:** 200; `data` array; `meta.page/pageSize/total/totalPages/hasNextPage/hasPrevPage`.

### `API-STU-002` — Search by name
- `GET /students?search=raj`.
- **Expect:** only rows where first/last name or admission_no matches (case-insensitive).

### `API-STU-003` — Filter by classId + status
- `GET /students?classId=<id>&status=ACTIVE`.
- **Expect:** filtered set; SQL uses parameterized `class_id=$X` and `UPPER(status)`.

### `API-STU-004` — pageSize clamped to 100
- `?pageSize=9999`.
- **Expect:** `meta.pageSize === 100`.

### `API-STU-005` — Get student by id
- `GET /students/<id>`.
- **Expect:** 200; mapped object (camelCase).

### `API-STU-006` — Get student wrong tenant → 404
- Use tenant B header, fetch a tenant-A student id.
- **Expect:** 404 (WHERE `tenant_id=$2` returns nothing).

### `API-STU-007` — Create student
- `POST /students` `{ firstName:"Aarav", lastName:"Sharma", admissionNo:"ADM-1001", gender:"MALE", dob:"2010-05-12", classId, sectionId, parentName, parentPhone }`.
- **Expect:** 201; `qr_code` auto-generated; returns full mapped object.

### `API-STU-008` — Create duplicate admission_no (per tenant)
- Same `admissionNo` again.
- **Expect:** 409 `STUDENT_EXISTS`.

### `API-STU-009` — Same admission_no different tenant → allowed
- Tenant B header, same admissionNo as STU-007.
- **Expect:** 201 (unique is `tenant_id+admission_no`).

### `API-STU-010` — Create missing firstName/admissionNo
- `{ lastName:"X" }`.
- **Expect:** 422 `VALIDATION_ERROR`.

### `API-STU-011` — Patch student (partial)
- `PATCH /students/<id>` `{ firstName:"Aarav2", status:"INACTIVE" }`.
- **Expect:** 200; only sent fields change; `updated_at` refreshed.

### `API-STU-012` — Patch with no updatable fields
- `{ unknownField:"x" }`.
- **Expect:** 400 `BAD_REQUEST`.

### `API-STU-013` — Soft delete (archive)
- `DELETE /students/<id>`.
- **Expect:** 200 `success:true`; DB `status='ARCHIVED'` (row NOT removed). Subsequent `GET` returns status `ARCHIVED`.

### `API-STU-014` — Delete unknown id
- `DELETE /students/<random>`.
- **Expect:** 404 `NOT_FOUND`.

---

## 4. Staff (`/api/v1/staff`)

### `API-STF-001` — List with department + status filters
- `GET /staff?department=Academics&status=ACTIVE`.
- **Expect:** filtered; mapped camelCase (employeeId, basicSalary, etc.).

### `API-STF-002` — Get by id
- `GET /staff/<id>`. **Expect:** 200; 404 if wrong tenant.

### `API-STF-003` — Create (upsert by employee_id)
- `POST /staff` `{ name:"Riya Mehta", employeeId:"EMP-001", designation:"Senior Lecturer", department:"Physics", basicSalary:55000 }`.
- **Expect:** 201. Repeat same employeeId with new name → 201 (upsert, name changed) — `ON CONFLICT DO UPDATE`.

### `API-STF-004` — Create missing required fields
- `{ name:"X" }` (no employeeId/designation).
- **Expect:** 422 `VALIDATION_ERROR`.

### `API-STF-005` — Patch staff
- `PATCH /staff/<id>` `{ designation:"Head of Dept" }`. **Expect:** 200.

### `API-STF-006` — Patch no updatable fields
- `{ unrelated:"x" }`. **Expect:** 400.

---

## 5. Academics (`/api/v1/academics`)

### `API-ACA-001` — List classes with nested sections
- `GET /academics/classes`. **Expect:** array; each class has `sections[]` nested; ordered by `numeric_level`.

### `API-ACA-002` — Create class with sections (transactional)
- `POST /academics/classes` `{ name:"Class 8", numericGrade:8, stream:"General", sections:[{name:"Section A",capacity:35}] }`.
- **Expect:** 201; class + section rows; rollback if any fails.

### `API-ACA-003` — Upsert class by id
- Send with `id` of existing class + new name. **Expect:** updated, not duplicated.

### `API-ACA-004` — Create class missing name
- `{}`. **Expect:** 422.

### `API-ACA-005` — Delete class
- `DELETE /academics/classes/<id>`. **Expect:** 200; cascade deletes sections; 404 if wrong tenant.

### `API-ACA-006` — List subjects
- `GET /academics/subjects`. **Expect:** array ordered by name.

---

## 6. Attendance (`/api/v1/attendance`)

### `API-ATT-001` — List by date
- `GET /attendance?date=2026-01-15`. **Expect:** only that date's records.

### `API-ATT-002` — List by date range + studentId
- `GET /attendance?startDate=2026-01-01&endDate=2026-01-31&studentId=<id>`. **Expect:** filtered.

### `API-ATT-003` — Mark bulk (array form)
- `POST /attendance` `[{studentId,date:"2026-01-16",status:"PRESENT"},{studentId2,date:"2026-01-16",status:"ABSENT",remarks:"sick"}]`.
- **Expect:** 201; array of saved records; `meta.total` = count.

### `API-ATT-004` — Mark bulk (`{records:[...]}` form)
- Same payload wrapped `{records:[...]}`. **Expect:** identical result (handler accepts both shapes).

### `API-ATT-005` — Upsert same student+date
- Mark student S on date D as PRESENT, then again as LATE.
- **Expect:** second call updates status to LATE (single row, `ON CONFLICT`); not a duplicate.

### `API-ATT-006` — Empty payload
- `POST /attendance` `{}`. **Expect:** 422 `VALIDATION_ERROR`.

### `API-ATT-007` — Invalid status enum
- DB CHECK rejects non-enum status; verify API surfaces a clean error (not 500 crash). Mark with `status:"PRESENTT"` → expect 500 or validation; **flag as gap** if raw PG error leaks.

---

## 7. Fees (`/api/v1/fees`)

### `API-FEE-001` — List structures
- `GET /fees/structures`. **Expect:** array; `breakdown` parsed as array; `totalAmount` numeric.

### `API-FEE-002` — Create structure
- `POST /fees/structures` `{ name:"Annual Fee 2026", classId, totalAmount:50000, breakdown:[{head:"Tuition",amount:40000},{head:"Lab",amount:10000}], dueDate:"2026-06-30" }`.
- **Expect:** 201; returns id.

### `API-FEE-003` — Create missing name/totalAmount
- `{}`. **Expect:** 422.

### `API-FEE-004` — List assignments (all)
- `GET /fees/assignments`. **Expect:** array; mapped with total/paid/balance/status.

### `API-FEE-005` — List assignments by student
- `GET /fees/assignments?studentId=<id>`. **Expect:** only that student's.

### `API-FEE-006` — Create assignment
- `POST /fees/assignments` `{ studentId, feeStructureId, totalAmount:50000, dueDate:"2026-06-30" }`.
- **Expect:** 201; `paid_amount:0`, `balance_amount:50000`, `status:"UNPAID"`.

### `API-FEE-007` — Create missing studentId/totalAmount
- `{}`. **Expect:** 422.

---

## 8. Payments (`/api/v1/payments`)

### `API-PAY-001` — List payments
- `GET /payments`. **Expect:** ordered by `paid_at DESC`; `receiptNo`, `transactionRef`, `idempotencyKey`.

### `API-PAY-002` — List by student
- `GET /payments?studentId=<id>`. **Expect:** filtered.

### `API-PAY-003` — Record payment (full)
- `POST /payments` with header `Idempotency-Key: pay-key-001`; body `{ studentId, amount:20000, paymentMode:"UPI", feeAssignmentId:<id>, feeHeadBreakdown:[{headName:"Tuition",amount:20000}] }`.
- **Expect:** 201; `status:"COMPLETED"`; `receipt_no` auto; `fee_assignments` row updated (`paid_amount +20000`, balance −20000, status `PARTIALLY_PAID`); `audit_logs` row `PAYMENT_RECORDED`.

### `API-PAY-004` — Idempotency replay (same key)
- Repeat PAY-003 with same `Idempotency-Key`.
- **Expect:** 200 (not 201); same `receipt_no`/`id`; `meta.idempotentReplay:true`; **no second payment row**; fee_assignment `paid_amount` unchanged.

### `API-PAY-005` — Payment auto-links earliest unpaid assignment
- Omit `feeAssignmentId`; student has unpaid assignments. **Expect:** payment applied to earliest-due unpaid assignment (ORDER BY due_date ASC).

### `API-PAY-006` — Payment fully settles assignment → status PAID
- Pay remaining balance of an assignment. **Expect:** `status` flips `PARTIALLY_PAID`→`PAID`; `balance_amount:0`.

### `API-PAY-007` — Invalid amount (zero/negative)
- `{ studentId, amount:0 }` and `{ amount:-5 }`. **Expect:** 422 `VALIDATION_ERROR`.

### `API-PAY-008` — Missing studentId
- `{ amount:100 }`. **Expect:** 422.

### `API-PAY-009` — Invalid payment_method enum
- `paymentMode:"BITCOIN"`. **Expect:** DB CHECK rejects; verify clean 422/400 (flag if 500 leaks PG error).

---

## 9. Finance (`/api/v1/finance`)

### `API-FIN-001` — List expenses
- `GET /finance/expenses`. **Expect:** ordered `date DESC`; `voucherNo`, `category`, numeric `amount`.

### `API-FIN-002` — Create expense
- `POST /finance/expenses` `{ title:"Lab supplies", category:"OPERATIONAL", amount:2500, date:"2026-01-20" }`.
- **Expect:** 201; `voucher_no` auto (`VCH-...`); `status:"APPROVED"`.

### `API-FIN-003` — Create missing title/amount
- `{}` and `{ amount:0 }`. **Expect:** 422.

### `API-FIN-004` — List payroll
- `GET /finance/payroll`. **Expect:** array joining staff (`staff_name`, `employee_id`, `designation`); `basicSalary/allowances/deductions/netSalary` numeric.

---

## 10. Exams (`/api/v1/exams`)

### `API-EXM-001` — List exams
- `GET /exams`. **Expect:** ordered `start_date DESC`; `status` enum.

### `API-EXM-002` — Create exam
- `POST /exams` `{ name:"Mid-Term 2026", academicSession:"2026-2027", term:"Term 1", startDate:"2026-09-01", endDate:"2026-09-15" }`.
- **Expect:** 201; `status:"SCHEDULED"` default.

### `API-EXM-003` — Create missing required
- `{ name:"X" }`. **Expect:** 422.

### `API-EXM-004` — List results (filters)
- `GET /exams/results?examId=<id>` and `?studentId=<id>`. **Expect:** joined `studentName`, `rollNo`, `subjectMarks` array, `percentage`, `grade`.

### `API-EXM-005` — Enter results (upsert)
- `POST /exams/results` `{ examId, studentId, subjectMarks:[{subject:"Maths",marks:88,max:100}], totalMarks:500, obtainedMarks:440 }`.
- **Expect:** 201; `percentage` auto-computed (88%); `status:"PUBLISHED"`; unique tenant+exam+student → re-submit updates.

### `API-EXM-006` — Results missing required
- `{ examId, studentId }`. **Expect:** 422.

---

## 11. Homework (`/api/v1/homework`)

### `API-HW-001` — List (joined)
- `GET /homework`. **Expect:** `className`, `subjectName` joined; ordered `due_date DESC`.

### `API-HW-002` — Create
- `POST /homework` `{ classId, sectionId, subjectId, title:"Algebra Ch.3", description:"Solve ex 3.1", dueDate:"2026-02-01" }`.
- **Expect:** 201.

### `API-HW-003` — Missing classId/title/dueDate
- `{ title:"X" }`. **Expect:** 422.

---

## 12. Timetable (`/api/v1/timetable`)

### `API-TT-001` — List (joined)
- `GET /timetable`. **Expect:** ordered `day_of_week ASC, start_time ASC`; `className/sectionName/subjectName/teacherId/room`.

### `API-TT-002` — Create entry
- `POST /timetable` `{ classId, sectionId, subjectId, teacherId, dayOfWeek:2, startTime:"09:00", endTime:"09:45", room:"101" }`.
- **Expect:** 201.

### `API-TT-003` — dayOfWeek out of range
- `dayOfWeek:9`. **Expect:** DB CHECK rejects; expect clean 400/422 (flag if 500).

---

## 13. Communication (`/api/v1/communication`)

### `API-COM-001` — List announcements
- `GET /communication/announcements`. **Expect:** ordered `created_at DESC`; `targetRole`.

### `API-COM-002` — Post announcement
- `POST /communication/announcements` `{ title:"Holiday Notice", content:"School closed 26 Jan", targetRole:"ALL" }`.
- **Expect:** 201; `published_by` = user id.

### `API-COM-003` — Missing title/content
- `{ title:"X" }`. **Expect:** 422.

### `API-COM-004` — List notifications (user-scoped)
- `GET /communication/notifications` (with token). **Expect:** only `user_id = req.user.id`; max 50; `isRead` boolean.

---

## 14. Auxiliary (`/api/v1/...`)

### `API-AUX-001..006` — GET list endpoints
- `GET /inventory`, `/library`, `/hostel`, `/mess`, `/transport`, `/health-records`.
- **Expect:** each returns tenant-scoped array; health-records joins student names.

### `API-AUX-007` — Create inventory item
- `POST /inventory` `{ name:"Projector", category:"IT", quantity:5, unit:"pcs", unitCost:25000 }`. **Expect:** 201; `sku` auto if absent.

### `API-AUX-008` — Create library book
- `POST /library` `{ title:"Physics Vol 1", author:"HC Verma", isbn:"978-...", category:"Science", totalCopies:10 }`.
- **Expect:** 201; `available_copies` equals `total_copies`.

---

## 15. Audit (`/api/v1/audit`)

### `API-AUD-001` — List logs
- `GET /audit/logs`. **Expect:** last 100; `userName`, `action`, `module`, `entityId`, `details`, `ipAddress`, ordered `created_at DESC`.

### `API-AUD-002` — Post a log
- `POST /audit/logs` `{ action:"USER_LOGIN", module:"AUTH", details:{ip:"1.2.3.4"} }`.
- **Expect:** 201; `ip_address` captured from `x-forwarded-for` or socket.

### `API-AUD-003` — Payment creates audit entry
- After PAY-003, `GET /audit/logs` must contain a `PAYMENT_RECORDED` row with the receipt details. **Verify end-to-end**.

---

## 16. Backend Unit Tests

### `API-UNIT-001` — Run existing suite
- `cd backend && npm run test:backend`.
- **Expect:** 4 tests pass (bcrypt, JWT sign/verify, expired JWT rejection, tenant-isolation logic, idempotency dedup).

### `API-UNIT-002` — TypeScript build
- `cd backend && npm run build`.
- **Expect:** `tsc` exits 0; `dist/` regenerated; zero TS errors.

---

## 17. Cross-Cutting Backend Checks

### `API-X-001` — Parameterized SQL (no injection)
- In `students` search send `search = "'; DROP TABLE students; --"`.
- **Expect:** treated as literal LIKE pattern; no table dropped; 200 with empty/matching results.

### `API-X-002` — Tenant isolation across all list endpoints
- Tenant A token+header against Tenant B data for: students, staff, attendance, fees, payments, finance, exams, homework, timetable, communication, auxiliary.
- **Expect:** every endpoint returns ONLY tenant-A rows (no leakage).

### `API-X-003` — Large body limit
- `POST /students` with >10MB body. **Expect:** 413 / payload error (express.json limit 10mb).

### `API-X-004` — Both `/api` and `/api/v1` parity
- Run AUTH-001, STU-001, PAY-003 against `/api/...` (no v1). **Expect:** identical results.

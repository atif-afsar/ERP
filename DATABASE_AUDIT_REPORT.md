# EduNexus ERP — Database Audit Report

Date: 2026-09-29  
Scope: SQL definitions, route queries, frontend data model and deployment instructions. No schema was applied and no live database was queried.

## Verdict

The native PostgreSQL baseline contains 41 tables. It supports basic school records but cannot persist the complete frontend ERP model. A separate legacy schema also contains 41 tables, with materially different columns and Supabase dependencies. These are alternative schema families, not a safe sequential migration chain.

"Missing" below means absent from the repository's native schema used by docs/DEPLOYMENT.md. It does not assert that a deployed database has never been extended.

## Schema sources

| File | Role | Compatibility |
|---|---|---|
| backend/sql/001_schema.sql | Native PostgreSQL baseline, users/password_hash, 41 tables | Current Express routes principally target this family |
| backend/sql/002_seed.sql | System roles, permission definitions, demo tenant/classes/sections | Does not populate role_permissions or provision a complete operational dataset |
| backend/sql/migrations/schema.sql | Legacy public.* schema, 41 tables | profiles references auth.users; requires Supabase-style auth schema |
| backend/sql/migrations/seed.sql | Legacy seed and public-read policies | Not interchangeable with native seed |
| backend/sql/migrations/rls_policies.sql | Legacy authorization functions/policies | Uses auth.uid(); targets tables omitted from native baseline |

The native schema creates uuid-ossp and pgcrypto and uses UUID primary keys with gen_random_uuid(). CREATE TABLE IF NOT EXISTS will not add missing columns or reconcile differently defined existing tables.

## Native table inventory

| Domain | Tables |
|---|---|
| Tenant configuration (4) | tenants, tenant_settings, tenant_features, tenant_labels |
| Identity and roles (6) | users, profiles, roles, permissions, role_permissions, memberships |
| Academic structure (4) | academic_years, classes, sections, subjects |
| Students and guardians (4) | students, parents, parent_students, enrollments |
| Staff/payroll (2) | staff, payroll_records |
| Attendance (1) | attendance_records |
| Fees/finance (5) | fee_structures, fee_assignments, payments, refunds, expenses |
| Exams (3) | exams, exam_subjects, results |
| Learning/scheduling (3) | homework, homework_submissions, timetable_entries |
| Communication/audit (3) | announcements, notifications, audit_logs |
| Auxiliary (6) | inventory_items, library_books, hostel_rooms, mess_menus, transport_routes, health_records |

There are no native views or trigger-based business workflows in this baseline. Audit immutability and automatic updated_at maintenance are not enforced by a trigger.

## Entities lost from the legacy schema

The following nine tables exist in backend/sql/migrations/schema.sql but not backend/sql/001_schema.sql:

| Legacy-only table | Missing native capability |
|---|---|
| courses | Coaching course catalog |
| batches | Coaching batch structure |
| batch_subjects | Batch curriculum mappings |
| payment_webhook_events | Durable gateway-event deduplication/history |
| tests | Coaching test-series definitions |
| test_results | Coaching test outcomes |
| notification_deliveries | Channel delivery attempts/status |
| leads | CRM persistence |
| documents | Uploaded document metadata |

Native-only tables relative to that legacy file are users, payroll_records, expenses, inventory_items, library_books, hostel_rooms, mess_menus, transport_routes, health_records. The equal table counts do not imply equal capability.

Do not execute both baseline scripts and assume their union works: overlapping tables have different contracts and legacy auth references remain unresolved on plain PostgreSQL.

## Additional persistence gaps

These are missing entity capabilities, not a demand to create one table per frontend interface. Names in this table describe proposed logical models and must be designed through migrations. Reuse existing tables where they can be extended safely.

| Frontend capability | Current database support | Needed persistence |
|---|---|---|
| Branch switching and branch roles | No branches/branch memberships | Tenant branches, scoped membership/assignment relationships |
| Sessions and invitations | users/memberships only | Revocable sessions or token-version strategy; invitation lifecycle; expiring reset/verification tokens |
| SaaS subscriptions | Tenant status only | Plans/prices, subscriptions, billing invoices/events, entitlements and payment linkage |
| Teacher/class/subject assignments | sections.class_teacher_id is bare UUID | Validated teacher assignment records; missing FK on class_teacher_id |
| Student documents | None native | Document metadata + object-storage integration, ownership/access rules |
| Coaching student enrollment | enrollments requires class_id and section_id | Course/batch enrollment relationships, history and status mapping |
| Period/subject attendance | One row per student/date | Attendance sessions/period identity, corrections and scan events if retained |
| Fee installments/concessions | Flat structure/assignment, refund table | Installment schedules, concession approval/history and fee-head allocation rules |
| Finance | Minimal expenses | Categories, vendors/bills, bank/cash accounts, transfers, budgets, reconciliations and journal records |
| Payroll | payroll_records aggregate | Structures/components, runs/line items, advances, approvals and payslips |
| Exam moderation | Aggregate results with JSON subject_marks | Grade scales, approvals, grace marks/revisions and controlled publication history |
| Inventory | Aggregate inventory_items | Warehouses, categories, stock movements, fixed assets and maintenance |
| Library | Aggregate library_books | Physical copies, members, loans/returns/renewals/reservations and fines |
| Hostel | Aggregate hostel_rooms | Hostels, beds, allocations, resident attendance, gate passes and complaints |
| Mess | Weekly menu text | Messes, meal plans, subscriptions, consumption and feedback |
| Transport | Combined route/vehicle/driver row | Vehicles, drivers, ordered stops, enrollments, trips and fuel logs |
| Health | One basic health_records model | Clinics, structured allergies, visits, screenings and vaccinations |
| Reports/export jobs | None | Only needed if real durable asynchronous exports are retained |
| AI knowledge | No native backing | Tenant-scoped document/chunk/index lifecycle if server RAG is implemented |

Evidence: frontend/src/types/index.ts; storageService.ts methods for all above entities; module handlers and backend/src/routes/auxiliary.ts.

## Security and tenant integrity

### DB-01 — Critical: native RLS is absent

No ENABLE ROW LEVEL SECURITY or native policy definitions exist in 001_schema.sql. backend/src/db.ts uses a generic pg Pool and does not establish a request-scoped tenant/user identity. Legacy auth.uid() functions do not become active merely because Express verifies a JWT.

Application-level tenant filters are useful but currently combined with optional authentication. RLS implementation must include runtime-role/owner behavior, transaction-scoped context and real tests; copying the legacy file is insufficient.

### DB-02 — Critical: foreign keys do not enforce same-tenant relationships

Examples: students.class_id, sections.class_id, attendance_records.student_id, fee_assignments.student_id, payments.student_id/fee_assignment_id and results.exam_id/student_id reference entity IDs alone.

A row can contain tenant A's tenant_id and tenant B's referenced entity ID while satisfying the current FK. Queries joining only on entity IDs can then expose or corrupt related data. The API must validate references and the schema should enforce tenant consistency where practical, e.g. composite candidate keys/FKs.

exam_subjects and homework_submissions have no tenant_id. Inferred tenancy is possible, but must be deliberately enforced through parent relationships and API authorization rather than assumed.

### DB-03 — High: global upsert identifiers bypass tenant ownership

academics.ts:53 performs ON CONFLICT(id) updates on classes and sections without matching existing tenant_id. Even adding mandatory login alone would not fix this row-ownership bug.

### DB-04 — High: payment idempotency is not a database invariant

payments.idempotency_key is nullable and has no UNIQUE(tenant_id,idempotency_key) or corresponding unique partial index. payments.ts:53 checks before starting its insert transaction. Concurrent retries can both pass the check and create duplicate receipts/payments when receipt numbers differ.

The receipt uniqueness constraint is valuable but is not a replacement for idempotency-key uniqueness or request-payload comparison.

### DB-05 — High: financial constraints are incomplete

Money fields generally lack nonnegative/positive CHECK constraints. No balance equation constraint enforces total_amount = paid_amount + balance_amount under a defined concession/refund policy. Payments can exceed an assignment balance; the route uses GREATEST(0, ...).

Explicit fee assignment and student links are not checked as a consistent pair. A payment without an explicit assignment selects one after insertion but does not update the payment's fee_assignment_id. Refunds exist as a table but have no API transaction reconciling payments, assignment balances and audit events.

### DB-06 — Medium: status and identifier contracts diverge

| Area | Native SQL/API | Frontend |
|---|---|---|
| IDs | UUID | Many demo/new IDs use tenant-*, student-*, cls-* and timestamps |
| Tenant type | school/coaching/hybrid | SCHOOL/COACHING only |
| Enrollment | class/section required; enrolled/completed/withdrawn/transferred | Optional class or batch; ACTIVE-style lifecycle; academicYearId often a year label |
| Payments | CASH/UPI/CARD/NET_BANKING/CHEQUE/ONLINE; COMPLETED/PENDING/FAILED/REFUNDED | Includes RAZORPAY_UPI and SUCCESS |
| Timetable | Integer weekday 1–7, foreign-key subject/class/section | String weekday, groupId, subject label, roomNo |
| Exam results | subject_marks plus aggregate totals; DRAFT/PUBLISHED/WITHHELD | Rich moderation/approval/publication/revision model |
| Fees | total_amount/balance_amount, breakdown | totalFee/netPayable/dueAmount, heads, concessions and installments |

These need explicit DTO mapping and lifecycle design, not type assertions or fallback placeholder values.

## Other integrity findings

- roles.key lacks uniqueness per global/tenant scope; role lookup uses key with LIMIT 1, so duplicates or tenant-specific collisions can yield ambiguous assignment.
- users.email uniqueness is case-sensitive while authentication lowercases email. API-created emails are normalized, but alternate writers could create case variants.
- academic_years lacks date-range validation and a one-current-year-per-tenant invariant.
- sections, class names, subject codes, inventory SKU and room numbers lack several natural-key uniqueness constraints expected by their workflows.
- Timetable has no start-before-end constraint or overlap prevention for teacher/room/class.
- Result totals lack range/nonzero validation, and percentage may be supplied by clients.
- Inventory quantities, library available/total copies and hostel occupancy lack nonnegative/capacity consistency constraints.
- updated_at defaults only apply on creation; selected routes set it manually, without comprehensive enforcement.
- Deletion cascades are broad, including student-linked financial records; retention policy needs deliberate review before exposing hard deletion.
- Audit rows are mutable ordinary table records, and tenant deletion cascades to logs; "immutable audit" is not implemented.
- Indexes exist for core tenant lists, attendance, students and result queries. Coverage is limited for auxiliary tenant queries and sort/filter patterns. No EXPLAIN/performance conclusion is possible without representative data.
- Some indexes overlap existing unique indexes (for example tenant/receipt); review redundant indexes rather than adding indiscriminately.

## Seed and migration readiness

002_seed.sql creates role and permission definitions but no role_permissions INSERT statements. It creates a demonstration tenant/classes/sections, not a complete privileged-user bootstrap. backend/create-admin.mjs is a separate administrative script and should be operationally reviewed, not treated as a migration.

No versioned migration ledger, migration command, rollback plan, drift verification or schema evolution runner is present in package scripts. The directory called migrations contains legacy bootstrap artifacts, not a native incremental history.

The deployment instructions mix postgres-owned initialization and dedicated-user initialization. Verify actual schema/table/sequence ownership and privileges; CREATE DATABASE or database-level GRANT alone does not establish all table rights.

## Recommended database work, not performed

1. Declare native PostgreSQL authoritative and separate/archive legacy initialization instructions conceptually.
2. Design an incremental migration baseline and version tracking.
3. Enforce tenant relationships and select a compatible RLS/request-context strategy.
4. Add unique payment idempotency and transactional financial invariants.
5. Implement branch/identity/master-data prerequisites before module-by-module migrations.
6. Reconcile UI models with server IDs and DTOs; preserve historical/financial records.
7. Test migrations against empty and representative existing databases, rollback/recovery and two-tenant access.

## Unverified operational items

Actual PostgreSQL version/extensions, installed tables/columns/policies, applied migrations, ownership/grants, backup schedules, restore capability, connection capacity, query plans and production data quality remain unknown. This report audits repository definitions, not a live database.

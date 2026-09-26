# Data Layer Audit & Mapping Matrix
## Phase 1 — Backend Foundation (Step 1)

This document maps all prototype localStorage operations from `storageService.ts` to their target PostgreSQL tables, operations, and security constraints.

| Domain / Entity | Frontend Method (`storageService.ts`) | Target Database Table | Operation / SQL Type | Tenant Isolation (`tenant_id`) | Database RLS & Security Policy |
|---|---|---|---|---|---|
| **Tenants** | `getTenants()` / `saveTenants()` | `public.tenants` | `SELECT` / `UPSERT` | Primary Key `id` | Super Admin full; tenant members read-only on own tenant |
| **Classes** | `getClasses(tenantId)` / `saveClasses()` | `public.classes` | `SELECT` / `INSERT` / `UPDATE` | `tenant_id` mandatory | `classes_tenant_isolation_policy` |
| **Sections** | (embedded in class object) | `public.sections` | `SELECT` / `INSERT` / `UPDATE` | `tenant_id` mandatory | Foreign key cascade to `classes` |
| **Students** | `getStudents(tenantId)` | `public.students` | `SELECT * WHERE tenant_id = :t` | `tenant_id` indexed | `students_tenant_isolation_policy` (staff read/write, parents isolated to children) |
| **Students** | `saveStudent(student)` | `public.students` | `INSERT` / `UPDATE` | `tenant_id` verified | Staff with `students.create` / `students.update` permission |
| **Students** | `deleteStudent(id)` | `public.students` | `UPDATE SET deleted_at = NOW(), status = 'archived'` | `tenant_id` verified | Staff with `students.delete` permission; soft-delete enforced |
| **Guardians** | `getGuardians(tenantId)` | `public.parents` | `SELECT * WHERE tenant_id = :t` | `tenant_id` indexed | `parents_tenant_isolation_policy` |
| **Parent-Student** | `getStudentGuardians()` | `public.parent_students` | `SELECT` / `INSERT` / `DELETE` | `tenant_id` indexed | Restricts parent logins to only their linked student IDs |
| **Attendance** | `getAttendance(tenantId)` | `public.attendance_logs` | `SELECT` / `INSERT` | `tenant_id` composite index | Daily roll call with session locking; immutable audit log |
| **Staff & HR** | `getStaff(tenantId)` | `public.staff` | `SELECT` / `UPSERT` | `tenant_id` indexed | Admin/HR manager permissions; salary protected |
| **Fees & Invoices**| `getFeeLedgers(tenantId)` | `public.fee_invoices` / `public.fee_allocations` | `SELECT` / `INSERT` | `tenant_id` indexed | Parents read-only on own children; accountants write |
| **Payments** | `recordPayment(payment)` | `public.payment_transactions` | `INSERT` with idempotency key | `tenant_id` indexed | Webhook / server verification before status is `SUCCESS` |
| **Exams** | `getExams(tenantId)` | `public.exams` | `SELECT` / `INSERT` | `tenant_id` indexed | Exam coordinators; published status filter for students |
| **Marks & Results**| `getExamResults(tenantId)` | `public.exam_results` / `public.student_marks` | `SELECT` / `UPSERT` | `tenant_id` indexed | Teachers enter draft marks; admin certifies/publishes |
| **Expenses** | `getExpenses(tenantId)` | `public.expense_vouchers` | `SELECT` / `INSERT` | `tenant_id` indexed | Finance manager & accountant access only |
| **Transport** | `getVehicles()`, `getRoutes()` | `public.transport_vehicles`, `public.transport_routes` | `SELECT` / `UPSERT` | `tenant_id` indexed | Transport manager; seat capacity limit enforced |
| **Library** | `getBooks()`, `getCirculation()` | `public.library_titles`, `public.book_circulation` | `SELECT` / `UPSERT` | `tenant_id` indexed | Librarian desk; loan duration and fine calculations |
| **Inventory** | `getItems()`, `getMovements()` | `public.inventory_items`, `public.stock_movements` | `SELECT` / `INSERT` | `tenant_id` indexed | Warehouse supervisor; stock balance verification |
| **Audit Logs** | `getAuditLogs()` | `public.audit_logs` | Append-only `INSERT` | `tenant_id` indexed | Immutable record; no `UPDATE` or `DELETE` permitted |

## Data Migration Principles
1. **Zero Data Loss**: Old `storageService.ts` remains functional as an offline cache/resilience fallback while services connect to PostgreSQL.
2. **Normalized Foreign Keys**: Local nested arrays (e.g. `classes[i].sections`) are mapped to relational tables (`public.classes` + `public.sections`).
3. **Audit Trail Preservation**: Any mutation executed through services records user identity, tenant ID, and timestamp.

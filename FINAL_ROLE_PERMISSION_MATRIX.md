# Final Role & UI Permission Matrix

**Certification Date:** 2026-10-05  
**Audit Baseline:** Release Candidate V1 Certification  
**Authoritative Source:** PostgreSQL `permissions`, `roles`, `role_permissions`, and Express Route Middleware.

---

## 1. Overview & RBAC Architecture

In EduNexus ERP, **server-side PostgreSQL database permissions are strictly authoritative**. Following the stabilization pass in Batch 3 (BUG-007), static role fallbacks in frontend `AuthContext` were eliminated. Navigation visibility and route protection are governed by:
1. `can(permissionKey)`: Exact evaluated grants returned by the backend session API.
2. Tenant Boundary: `m.tenant_id = req.tenantId` on all business resources.
3. System Admin Exemption: Canonical `SUPER_ADMIN` with `isSuperAdmin === true` retains platform-level privileges, with tenant-scoped business modules requiring valid tenant scope.

### Supported Roles Evaluated:
- **SUPER_ADMIN**: Global SaaS platform owner (tenant lifecycle, global plans, platform subscriptions).
- **TENANT_ADMIN**: School Owner / Principal (full tenant administrative and academic authority).
- **ADMIN**: Limited custom tenant administrator (in QA certification: granted only `master_data.view`).
- **TEACHER**: Academic instructor (assigned classes, timetable, marks entry, attendance).
- **ACCOUNTANT**: Financial officer (fee structures, fee dues, payment verification, double-entry finance, fee reminders).
- **PARENT**: Guardian portal account (linked children dues, UPI proof submissions, receipts).
- **STUDENT**: Enrolled student portal account (read-only attendance, timetable, notices).
- **STAFF**: Non-teaching or general school employee (personal leave requests, own notifications).

---

## 2. Master Role-by-Route Access Matrix

*Legend:*
- **ALLOWED**: Permitted by database permissions; renders functional UI and performs authorized actions.
- **RESTRICTED**: Visible in navigation or direct URL, but specific actions or sub-loaders are gated.
- **DENIED**: Direct route displays `Access Restricted` (HTTP 403) and route is excluded from navigation sidebar.
- **PROTOTYPE**: Mounted read-only legacy module displaying migration banner.
- **BLOCKED**: Normal path blocked by confirmed product defect.

| Route Target | Required Permission(s) | SUPER_ADMIN | TENANT_ADMIN | ADMIN (Custom QA) | TEACHER | ACCOUNTANT | PARENT | STUDENT | STAFF |
|---|---|---|---|---|---|---|---|---|---|
| `dashboard` | Authenticated session | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED | ALLOWED |
| `students` | `student_lifecycle.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `staff` | `staff.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `hr` | `hr.view` OR `hr.leave.request` | ALLOWED | ALLOWED | DENIED (403) | RESTRICTED (Leave request) | DENIED (403) | DENIED (403) | DENIED (403) | RESTRICTED (Self-service leave BLOCKED: RC-BUG-005) |
| `academics` | `master_data.view` | PROTOTYPE | PROTOTYPE | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `attendance` | `attendance.view` | ALLOWED | ALLOWED | DENIED (403) | ALLOWED (Assigned class) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403, BUG-019 verified) |
| `fees` | `fee_management.view` OR `payment_proofs.submit` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | ALLOWED (Manage & Verify) | ALLOWED (Own Children Portal) | DENIED (403) | DENIED (403) |
| `finance` | Role: `TENANT_ADMIN` or `ACCOUNTANT` | BLOCKED (500: RC-BUG-004) | ALLOWED | DENIED (403) | DENIED (403) | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) |
| `inventory` | `inventory.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `library` | `library.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `transport` | `transport.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `hostel` | `hostel.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `mess` | `mess.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `health` | `health.view` | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `exams` | `examinations.view` | BLOCKED (BUG-009) | BLOCKED (BUG-009) | DENIED (403) | BLOCKED (BUG-009) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `results` | `exam_marks.view` | BLOCKED (BUG-010) | BLOCKED (BUG-010) | DENIED (403) | BLOCKED (BUG-010) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `timetable` | `timetable.view` | ALLOWED | ALLOWED | DENIED (403) | ALLOWED (Assigned class) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `homework` | `homework.view` | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `communication`| `communications.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403, BUG-007) | ALLOWED (Send reminders) | DENIED (403) | DENIED (403) | DENIED (403) |
| `crm` | `students.create` | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `reports` | `reports.view` | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `settings` | `organization.update` | PROTOTYPE | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `organization` | `users.view` OR `roles.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `master-data` | `master_data.view` | ALLOWED | ALLOWED | RESTRICTED (Blank Profile: RC-BUG-007) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `saas-billing` | Role: `TENANT_ADMIN` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `superadmin-dashboard` | Role: `SUPER_ADMIN` | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `superadmin-tenants` | Role: `SUPER_ADMIN` | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `superadmin-plans` | Role: `SUPER_ADMIN` | BLOCKED (RC-BUG-001/002) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `superadmin-features` | Role: `SUPER_ADMIN` | PROTOTYPE | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| `api-docs` | Authenticated | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE |
| `schema` | Authenticated | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE | PROTOTYPE |
| `roles-matrix` | `roles.view` | ALLOWED | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |

---

## 3. Authoritative Action Capabilities & Granular Permissions

| Action Domain | Permission Key | Enforcing API Endpoint(s) | Roles Capable | Verified Behavior |
|---|---|---|---|---|
| **Admissions** | `student_lifecycle.manage` | `POST /api/v1/students/admissions` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 on valid admission; 500 on duplicate admission_no (RC-BUG-003) |
| **Yearly Enrollment** | `student_lifecycle.manage` | `POST /api/v1/students/:id/enrollments` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 on new enrollment; 500 on duplicate year enrollment (RC-BUG-003) |
| **Guardian Link** | `parent_accounts.invite` | `POST /api/v1/fees/parent-access/:id/invitation` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 on initial invite; 500 on duplicate user link (BUG-011) |
| **Attendance Mark** | `attendance.manage` | `POST /api/v1/attendance/records` | `TENANT_ADMIN`, `TEACHER`, `SUPER_ADMIN` | 200 on roster save; Teacher restricted to assigned section; Staff denied |
| **Fee Structure** | `fee_management.manage` | `POST /api/v1/fees/structures` | `TENANT_ADMIN`, `ACCOUNTANT`, `SUPER_ADMIN` | 201 created; validated against positive amounts |
| **Fee Assignment** | `fee_management.manage` | `POST /api/v1/fees/assignments` | `TENANT_ADMIN`, `ACCOUNTANT`, `SUPER_ADMIN` | 201 created in canonical `DUE` state; generates installments |
| **Proof Submit** | `payment_proofs.submit` | `POST /api/v1/fees/proofs` | `PARENT` | 201 uploaded; 500 on duplicate reference (RC-BUG-003); overpayment bug (BUG-018) |
| **Proof Verify** | `payment_proofs.verify` | `PATCH /api/v1/fees/proofs/:id/verify` | `TENANT_ADMIN`, `ACCOUNTANT`, `SUPER_ADMIN` | 200 approved; updates assignment balance; writes balanced journal; 409 on second attempt |
| **Expense Posting** | Server Role Gate | `POST /api/v1/finance/expenses` | `TENANT_ADMIN`, `ACCOUNTANT` | 201 created with status `APPROVED`; writes balanced posted journal entry |
| **Fee Reconcile** | Server Role Gate | `POST /api/v1/finance/reconcile-fees` | `TENANT_ADMIN`, `ACCOUNTANT` | 200 idempotent reconciliation; excludes SaaS records; avoids duplicate journals |
| **Staff Leave Request** | `hr.leave.request` | `POST /api/v1/hr/requests` | `STAFF`, `TEACHER`, `TENANT_ADMIN`, `SUPER_ADMIN` | 201 created; blocked with 403 `STAFF_PROFILE_REQUIRED` for unlinked accounts (RC-BUG-005) |
| **Staff Leave Approve** | `hr.leave.approve` | `POST /api/v1/hr/requests/:id/review` | `TENANT_ADMIN`, `SUPER_ADMIN` | 200 review recorded; deducts balance; updates status |
| **Book Issue** | `library.issue` | `POST /api/v1/library/loans` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 loan recorded; duplicate loan rejected 409 |
| **Stock Movement** | `inventory.transact` | `POST /api/v1/inventory/movements` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 recorded; negative stock transaction rejected with 422 |
| **Vehicle Assignment** | `transport.manage` | `POST /api/v1/transport/assignments` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 assigned; vehicle capacity strictly enforced against concurrent passengers |
| **Bed Allocation** | `hostel.manage` | `POST /api/v1/hostel/allocations` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 allocated; enforces one active bed per student; duplicate bed blocked |
| **Mess Assignment** | `mess.manage` | `POST /api/v1/mess/assignments` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 assigned; active assignment blocks plan archival (409) |
| **User Invitation** | `users.invite` | `POST /api/v1/organization/invitations` | `TENANT_ADMIN`, `SUPER_ADMIN` | 201 invitation created with onboarding token; audit log written |
| **Custom Role Permissions** | `roles.manage` | `PUT /api/v1/organization/roles/:id/permissions` | `TENANT_ADMIN`, `SUPER_ADMIN` | 200 persisted; dynamically alters tenant permissions upon next token issuance |
| **Plan Create** | Role: `SUPER_ADMIN` | `POST /api/v1/admin/billing/plans` | `SUPER_ADMIN` | 200 via direct API; UI modal blocked by field naming mismatch (RC-BUG-001) |
| **Plan Toggle** | Role: `SUPER_ADMIN` | `PATCH /api/v1/admin/billing/plans/:id` | `SUPER_ADMIN` | 200 via direct API; UI blocked by HTTP `PUT` sending 404 (RC-BUG-002) |

---

## 4. UI Shell Navigation Visibility vs Direct Route Access

Authorization consistency was verified by probing both navigation rendering and direct hash route navigation:

1. **Staff Navigation Isolation**:
   - `STAFF` navigation displays: `Dashboard`, `HR & Leave`, `Notifications`.
   - Direct access to `#/app/attendance` returns `Access Restricted` (HTTP 403), with zero unauthorized API calls initiated. Verified fix for BUG-019.
2. **Teacher Navigation Isolation**:
   - `TEACHER` navigation displays: `Dashboard`, `Classes`, `Attendance & QR`, `Examinations`, `Timetable`, `HR & Leave`, `Notifications`.
   - Direct access to `#/app/communication` displays `Access Restricted` (HTTP 403). Verified fix for BUG-007.
   - Direct access to `#/app/finance` displays `Access Restricted` (HTTP 403).
3. **Accountant Navigation Isolation**:
   - `ACCOUNTANT` navigation displays: `Dashboard`, `Fees & Payments`, `Finance & Accounts`, `Notice & SMS`, `Notifications`.
   - Accountant fee loading no longer requires student lifecycle or master data administration permissions. Verified fix for BUG-008.
   - Direct access to `#/app/students`, `#/app/staff`, or `#/app/hr` displays `Access Restricted` (HTTP 403).
4. **Parent Portal Isolation**:
   - `PARENT` navigation displays: `Children Overview`, `Fee Dues & Online Pay`, `Notifications`.
   - Parents can only retrieve dues and submit payment proofs for their own linked children; cross-child or cross-tenant attempts return HTTP 403.
5. **Custom ADMIN (Limited QA Role)**:
   - Granted only `master_data.view`.
   - Navigation displays: `Dashboard`, `School Master Data`, `Notifications`.
   - Form creation controls in Master Data are omitted via `MasterForm`.
   - Defect: Profile tab renders completely blank due to lack of view-only fallback (RC-BUG-007).
6. **Super Admin Platform Console**:
   - Global console accessible via `#/app/superadmin-*` and `#/super-admin/*`.
   - Direct access to tenant-bound business operations without an explicit tenant context triggers appropriate scoping guard; Finance returns 500 due to non-existent platform tenant UUID (RC-BUG-004).

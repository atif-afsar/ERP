# Role/UI permission matrix — Batch 3

Verified 2026-10-05 against fresh isolated PostgreSQL and eight Chromium accounts. Server RBAC remains authoritative. Database grants are unchanged. Custom ADMIN is a QA tenant role with only master_data.view, not a default global role. Finance and SaaS retain existing explicit server role gates; no new permission keys are invented.

Sidebar entries below are actually captured from Chromium. Direct-route column is the shared fail-closed policy exercised by targeted direct-route browser/API assertions; this is not a claim that every module action received full end-to-end testing. Prototype routes remain read-only. Write permissions describe individual existing capabilities, not a blanket write grant.

| Module / route | View requirement | Write requirements | Default/current QA role access | Actually visible sidebar roles | Direct-route roles | Write-capable roles |
|---|---|---|---|---|---|---|
| dashboard (#/app/dashboard) | Authenticated shell | Existing role-scoped billing | ACCOUNTANT, ADMIN, PARENT, STAFF, STUDENT, SUPER_ADMIN, TEACHER, TENANT_ADMIN | TENANT_ADMIN, ACCOUNTANT, TEACHER, PARENT, ADMIN, STUDENT, STAFF | TENANT_ADMIN, ACCOUNTANT, TEACHER, PARENT, ADMIN, SUPER_ADMIN, STUDENT, STAFF | None / prototype |
| students (#/app/students) | student_lifecycle.view | student_lifecycle.manage, student_documents.manage, parent_accounts.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| students/new (#/app/students/new) | student_lifecycle.manage | student_lifecycle.manage | SUPER_ADMIN, TENANT_ADMIN | None | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| staff (#/app/staff) | staff.view | staff.manage, teacher_accounts.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| hr (#/app/hr) | hr.view OR hr.leave.request | hr.manage, hr.leave.approve, hr.leave.request | STAFF, SUPER_ADMIN, TEACHER, TENANT_ADMIN | TENANT_ADMIN, TEACHER, STAFF | TENANT_ADMIN, TEACHER, SUPER_ADMIN, STAFF | TENANT_ADMIN, TEACHER, SUPER_ADMIN, STAFF |
| academics (#/app/academics) | master_data.view | Read-only prototype | ADMIN, SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN, ADMIN | TENANT_ADMIN, ADMIN, SUPER_ADMIN | None / prototype |
| attendance (#/app/attendance) | attendance.view | attendance.manage | SUPER_ADMIN, TEACHER, TENANT_ADMIN | TENANT_ADMIN, TEACHER | TENANT_ADMIN, TEACHER, SUPER_ADMIN | TENANT_ADMIN, TEACHER, SUPER_ADMIN |
| attendance/mark (#/app/attendance/mark) | attendance.manage | attendance.manage | SUPER_ADMIN, TEACHER, TENANT_ADMIN | None | TENANT_ADMIN, TEACHER, SUPER_ADMIN | TENANT_ADMIN, TEACHER, SUPER_ADMIN |
| fees (#/app/fees) | fee_management.view | fee_management.manage, payment_settings.manage, payment_proofs.submit, payment_proofs.verify | ACCOUNTANT, PARENT, SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN, ACCOUNTANT, PARENT | TENANT_ADMIN, ACCOUNTANT, PARENT, SUPER_ADMIN | TENANT_ADMIN, ACCOUNTANT, PARENT, SUPER_ADMIN |
| fees/new (#/app/fees/new) | fee_management.manage | fee_management.manage | ACCOUNTANT, SUPER_ADMIN, TENANT_ADMIN | None | TENANT_ADMIN, ACCOUNTANT, SUPER_ADMIN | TENANT_ADMIN, ACCOUNTANT, SUPER_ADMIN |
| finance (#/app/finance) | Existing server roles: TENANT_ADMIN, ACCOUNTANT | Existing server roles TENANT_ADMIN / ACCOUNTANT | ACCOUNTANT, SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN, ACCOUNTANT | TENANT_ADMIN, ACCOUNTANT, SUPER_ADMIN | TENANT_ADMIN, ACCOUNTANT, SUPER_ADMIN |
| inventory (#/app/inventory) | inventory.view | inventory.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| library (#/app/library) | library.view | library.manage, library.issue | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| transport (#/app/transport) | transport.view | transport.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| hostel (#/app/hostel) | hostel.view | hostel.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| mess (#/app/mess) | mess.view | mess.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| health (#/app/health) | health.view | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| exams (#/app/exams) | examinations.view | examinations.manage, exam_marks.manage | SUPER_ADMIN, TEACHER, TENANT_ADMIN | TENANT_ADMIN, TEACHER | TENANT_ADMIN, TEACHER, SUPER_ADMIN | TENANT_ADMIN, TEACHER, SUPER_ADMIN |
| results (#/app/results) | exam_marks.view | exam_marks.manage | SUPER_ADMIN, TEACHER, TENANT_ADMIN | None | TENANT_ADMIN, TEACHER, SUPER_ADMIN | TENANT_ADMIN, TEACHER, SUPER_ADMIN |
| timetable (#/app/timetable) | timetable.view | timetable.manage | SUPER_ADMIN, TEACHER, TENANT_ADMIN | TENANT_ADMIN, TEACHER | TENANT_ADMIN, TEACHER, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| homework (#/app/homework) | homework.view | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| communication (#/app/communication) | communications.view OR communications.send | communications.send, communications.templates.manage | ACCOUNTANT, SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN, ACCOUNTANT | TENANT_ADMIN, ACCOUNTANT, SUPER_ADMIN | TENANT_ADMIN, ACCOUNTANT, SUPER_ADMIN |
| crm (#/app/crm) | students.create | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| reports (#/app/reports) | reports.view | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| settings (#/app/settings) | settings.view | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| organization (#/app/organization) | users.view OR roles.view | users.invite, users.manage, roles.manage | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| master-data (#/app/master-data) | master_data.view | master_data.manage | ADMIN, SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN, ADMIN | TENANT_ADMIN, ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |
| api-docs (#/app/api-docs) | settings.view | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| schema (#/app/schema) | settings.view | Read-only prototype | SUPER_ADMIN | None | SUPER_ADMIN | None / prototype |
| roles-matrix (#/app/roles-matrix) | roles.view | Read-only prototype | SUPER_ADMIN, TENANT_ADMIN | None | TENANT_ADMIN, SUPER_ADMIN | None / prototype |
| superadmin-dashboard (#/app/superadmin-dashboard) | Existing server roles: SUPER_ADMIN | Read-only prototype | SUPER_ADMIN | SUPER_ADMIN | SUPER_ADMIN | None / prototype |
| superadmin-tenants (#/app/superadmin-tenants) | Existing server roles: SUPER_ADMIN | tenants.manage | SUPER_ADMIN | SUPER_ADMIN | SUPER_ADMIN | SUPER_ADMIN |
| superadmin-plans (#/app/superadmin-plans) | Existing server roles: SUPER_ADMIN | subscriptions.manage | SUPER_ADMIN | SUPER_ADMIN | SUPER_ADMIN | SUPER_ADMIN |
| superadmin-features (#/app/superadmin-features) | Existing server roles: SUPER_ADMIN | Read-only prototype | SUPER_ADMIN | SUPER_ADMIN | SUPER_ADMIN | None / prototype |
| saas-billing (#/app/saas-billing) | Existing server roles: TENANT_ADMIN, SUPER_ADMIN | Existing role-scoped billing | SUPER_ADMIN, TENANT_ADMIN | TENANT_ADMIN | TENANT_ADMIN, SUPER_ADMIN | TENANT_ADMIN, SUPER_ADMIN |

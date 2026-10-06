# Role login guide

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## Start the existing training environment

Open Docker Desktop and wait for its engine. From PowerShell:

```powershell
cd C:\Users\asus\Desktop\ERP
docker start edunexus-pg
docker ps --filter name=edunexus-pg
```

Do not recreate/reset the container or database. The existing isolated QA state and fictional fixtures are reused. Open three separate terminals from the repository root:

```powershell
# Terminal 1: backend
node --import tsx qa/rc-local.mjs api
```

```powershell
# Terminal 2: frontend
node qa/rc-local.mjs frontend
```

```powershell
# Terminal 3: notifications, LOG email only
node qa/rc-local.mjs worker
```

These existing commands select the isolated local QA database and local provider placeholders. Worker uses existing compiled backend; after any later backend change, build before using it. No build needed for these docs. Do not run setup, fixtures, migrations, full-tests or account resets for training.

Both 5111 and 5191 were already running during preparation. If a port is occupied, reuse the known healthy local service; do not kill an unknown process. Check http://127.0.0.1:5111/health for healthy and database connected true. Browser: http://127.0.0.1:5191/#/login. Ordinary 5000/5173 ports may use different data/credentials.

## Login and switch role

1. Open the private LOCAL_DEMO_CREDENTIALS.md locally; never screen-share it.
2. Copy the chosen email/password and click Sign in.
3. All eight profiles currently land at #/app/dashboard; Super Admin renders its platform workspace there.
4. Use the sidebar, or menu button on mobile.
5. Use user menu → Sign Out to switch profile. Use separate browser profiles/private contexts for simultaneous roles, not tabs sharing one session.
6. If later login fails, first check services and QA database. Self-service password recovery is unavailable; no working OTP/reset workflow is claimed.

## SUPER_ADMIN

**Represents:** Platform operator managing institutions and the SaaS catalog.

**Tenant:** Global platform. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Platform Overview; Tenants & Schools; Subscription Plans; Feature Catalog.

**Should not see:** Other schools are separate tenants; school finance requires valid tenant context.

**Important actions:** Review the platform summary; Search the existing school; inspect its status; Open Create Plan; inspect fields; Cancel; Inspect catalog only.

**Best demonstration:** Each institution owns a separate workspace.

**Avoid misunderstanding:** A school software subscription is different from parent tuition payments.

## TENANT_ADMIN

**Represents:** School owner/principal with school-wide responsibility.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Dashboard; Students; Attendance & QR; Examinations; Timetable; Fees & Payments; Finance & Accounts; Staff & Teachers; HR & Leave; Inventory & Assets; Library Management; Transport & Fleet; Hostel Residence; Hostel Mess & Dining; Notice & SMS; School Master Data; Users & Access; SaaS Subscription.

**Should not see:** Other institutions and global SaaS plan administration remain outside this school workspace.

**Important actions:** Open Profile, Years, Branches, Classes, Subjects and Assignments; Search a sample child; open profile and enrollment; Inspect the staff profile/account and teacher assignment; Review dues, structures, assign, settings, parentAccess and verify; Inspect invitations, roles and grants without editing demo roles; Read catalog/entitlement; do not press Subscribe.

**Best demonstration:** Admission is the identity; enrollment is the academic placement.

**Avoid misunderstanding:** Student identity stays permanent; year/class/section belong to enrollment.

## ADMIN

**Represents:** Delegated custom administrator; this fixture has master_data.view only.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Dashboard; School Master Data.

**Should not see:** Admission, fees, finance and staff administration are not granted.

**Important actions:** Review the smaller sidebar; Inspect Profile and Classes without saving.

**Best demonstration:** Viewing and managing are separate grants.

**Avoid misunderstanding:** ADMIN is a custom permission set, not unrestricted school ownership.

## TEACHER

**Represents:** Instructor linked to staff and assigned classes/subjects.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Dashboard; Attendance & QR; Examinations; Timetable; HR & Leave.

**Should not see:** School finances, fee verification and unrelated class work are not granted.

**Important actions:** Choose existing year/class/section if prompted; Select assigned year/class/section/date and inspect roster; Select prepared exam and Marks; Inspect own balance/request form.

**Best demonstration:** Attendance belongs to students enrolled in this academic context.

**Avoid misunderstanding:** A Teacher login also needs its profile and teaching assignments.

## ACCOUNTANT

**Represents:** School finance employee handling verified collections and accounts.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Dashboard; Fees & Payments; Finance & Accounts.

**Should not see:** Academic setup, student admission and teacher account administration are not granted.

**Important actions:** Open dues and verify; View a pending proof; Approve fictional practice proof; open receipts; Find that fee in Journals and General Ledger; Inspect Expenses, Other Income and Fee Reconciliation.

**Best demonstration:** Approval completes a collection and generates its receipt.

**Avoid misunderstanding:** A screenshot is evidence for review, not proof of actual money received.

## PARENT

**Represents:** Guardian linked to one or several children.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Children Overview; Fee Dues & Online Pay.

**Should not see:** Other families, payment approval and school books are not available.

**Important actions:** Select Child and inspect the due; Read Payment Instructions and School payment QR; Submit fictional partial proof with unique DEMO reference, date and screenshot; Refresh after Accountant approval; inspect receipt/balance.

**Best demonstration:** Parent pays the SCHOOL through an external app.

**Avoid misunderstanding:** Online Pay label currently means external QR/UPI plus manual proof verification.

## STUDENT

**Represents:** Student account with a limited current dashboard.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Student Dashboard.

**Should not see:** No fee verification, school accounts or academic administration.

**Important actions:** Inspect visible cards only.

**Best demonstration:** The current student workspace is limited.

**Avoid misunderstanding:** Do not promise dedicated timetable/results/attendance portal screens from an older report.

## STAFF

**Represents:** Non-teaching school employee using own HR services.

**Tenant:** Springfield Academy. **Landing:** `/app/dashboard`.

**Should see / sidebar:** Dashboard; HR & Leave.

**Should not see:** Student attendance registers, school accounts and payment approval are not granted.

**Important actions:** View own balance; prepare leave type/dates and request; Return and Sign Out.

**Best demonstration:** The workspace reflects the staff responsibilities.

**Avoid misunderstanding:** Staff is not an alternate Teacher role.

## Current UI differences from older reports

Accountant currently has Dashboard, Fees & Payments and Finance & Accounts: no Communications item. Show notices as Owner unless an authorized permission grant is deliberately changed. Master Data uses Profile, Years, Branches, Classes, Subjects and Assignments; Sections are within Classes. Fee buttons use dues, structures, assign, settings, proofs, verify, receipts, reports and parentAccess, filtered by permissions. Examinations uses Exams, Schedules, Marks, Results, Grades and Report, filtered by grants. Hidden academics/homework/health/CRM prototypes are excluded.

## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.

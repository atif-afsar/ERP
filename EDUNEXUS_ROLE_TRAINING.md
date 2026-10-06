# Role-by-role practice lessons

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## First read, then rehearse

Start with School Owner. Use existing school/child first. Story names Aarav/Imran are teaching characters, not new accounts created by this task. Create clearly named PRACTICE records through the UI only when you understand the read-only lesson. Do not delete seed records or change training school status/subscription. Every lesson begins with private credentials → Sign in → confirm school and ends with user menu → Sign Out.

## Lesson 1 — SUPER_ADMIN

**Who you are:** Platform operator managing institutions and the SaaS catalog.

### Step 1 — Platform Overview

- **Look at:** `#/app/superadmin-dashboard`, Platform Overview.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Review the platform summary.
- **Tell your senior:** “We operate multiple independent institutions.”
- **Expect:** Overview appears; describe actual displayed counts only.

### Step 2 — Tenants & Schools

- **Look at:** `#/app/superadmin-tenants`, Tenants & Schools.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Search the existing school; inspect its status.
- **Tell your senior:** “Each institution owns a separate workspace.”
- **Expect:** The school is listed; do not suspend the rehearsal school.

### Step 3 — Subscription Plans

- **Look at:** `#/app/superadmin-plans`, Subscription Plans.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Open Create Plan; inspect fields; Cancel.
- **Tell your senior:** “These plans price the software service paid by schools.”
- **Expect:** Modal closes; no plan or provider transaction created.

### Step 4 — Feature Catalog

- **Look at:** `#/app/superadmin-features`, Feature Catalog.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect catalog only.
- **Tell your senior:** “A catalog view does not prove automated feature provisioning.”
- **Expect:** Catalog renders; avoid transactional toggle claims.

**Finish:** Sign Out. **Avoid:** A school software subscription is different from parent tuition payments.

## Lesson 2 — TENANT_ADMIN

**Who you are:** School owner/principal with school-wide responsibility.

### Step 1 — School Master Data

- **Look at:** `#/app/master-data`, School Master Data.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Open Profile, Years, Branches, Classes, Subjects and Assignments.
- **Tell your senior:** “We define one academic structure reused by other modules.”
- **Expect:** Existing structure appears. Section forms are inside Classes.

### Step 2 — Students

- **Look at:** `#/app/students`, Students.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Search a sample child; open profile and enrollment.
- **Tell your senior:** “Admission is the identity; enrollment is the academic placement.”
- **Expect:** Student and academic history appear.

### Step 3 — Staff & Teachers

- **Look at:** `#/app/staff`, Staff & Teachers.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect the staff profile/account and teacher assignment.
- **Tell your senior:** “A staff record, login and teaching responsibility are linked but different.”
- **Expect:** Existing profile/assignments appear.

### Step 4 — Fees & Payments

- **Look at:** `#/app/fees`, Fees & Payments.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Review dues, structures, assign, settings, parentAccess and verify.
- **Tell your senior:** “A structure becomes an obligation when assigned to an enrollment.”
- **Expect:** Dues and linked parents appear; some old sample fees are already paid.

### Step 5 — Users & Access

- **Look at:** `#/app/organization`, Users & Access.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect invitations, roles and grants without editing demo roles.
- **Tell your senior:** “People get the responsibilities they need.”
- **Expect:** Limited Admin grant is visible.

### Step 6 — SaaS Subscription

- **Look at:** `#/app/saas-billing`, SaaS Subscription.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Read catalog/entitlement; do not press Subscribe.
- **Tell your senior:** “This school pays EduNexus separately from tuition collections.”
- **Expect:** Catalog/access state appears; no live checkout claim.

**Finish:** Sign Out. **Avoid:** Student identity stays permanent; year/class/section belong to enrollment.

## Lesson 3 — ADMIN

**Who you are:** Delegated custom administrator; this fixture has master_data.view only.

### Step 1 — Dashboard

- **Look at:** `#/app/dashboard`, Dashboard.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Review the smaller sidebar.
- **Tell your senior:** “Delegated responsibility gives a smaller workspace.”
- **Expect:** Only two menu items appear.

### Step 2 — School Master Data

- **Look at:** `#/app/master-data`, School Master Data.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect Profile and Classes without saving.
- **Tell your senior:** “Viewing and managing are separate grants.”
- **Expect:** Readable school data, no authorized edit controls.

**Finish:** Sign Out. **Avoid:** ADMIN is a custom permission set, not unrestricted school ownership.

## Lesson 4 — TEACHER

**Who you are:** Instructor linked to staff and assigned classes/subjects.

### Step 1 — Timetable

- **Look at:** `#/app/timetable`, Timetable.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Choose existing year/class/section if prompted.
- **Tell your senior:** “Teaching duties need a shared schedule.”
- **Expect:** Existing assigned slots appear; an empty week needs setup.

### Step 2 — Attendance & QR

- **Look at:** `#/app/attendance`, Attendance & QR.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Select assigned year/class/section/date and inspect roster.
- **Tell your senior:** “Attendance belongs to students enrolled in this academic context.”
- **Expect:** Authorized roster appears. Save only a fictional practice date.

### Step 3 — Examinations

- **Look at:** `#/app/exams`, Examinations.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Select prepared exam and Marks.
- **Tell your senior:** “Marks access follows teacher subject/class assignments.”
- **Expect:** Assigned marking controls appear; publish is a separate authorized action.

### Step 4 — HR & Leave

- **Look at:** `#/app/hr`, HR & Leave.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect own balance/request form.
- **Tell your senior:** “Teachers are employees too.”
- **Expect:** Own leave data/form appears.

**Finish:** Sign Out. **Avoid:** A Teacher login also needs its profile and teaching assignments.

## Lesson 5 — ACCOUNTANT

**Who you are:** School finance employee handling verified collections and accounts.

### Step 1 — Fees & Payments

- **Look at:** `#/app/fees`, Fees & Payments.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Open dues and verify; View a pending proof.
- **Tell your senior:** “Only verified collections reduce the balance.”
- **Expect:** Proof details appear; empty queue needs a new Parent submission.

### Step 2 — Fees & Payments

- **Look at:** `#/app/fees`, Fees & Payments.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Approve fictional practice proof; open receipts.
- **Tell your senior:** “Approval completes a collection and generates its receipt.”
- **Expect:** Receipt matches approved amount; no real money is moved.

### Step 3 — Finance & Accounts

- **Look at:** `#/app/finance`, Finance & Accounts.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Find that fee in Journals and General Ledger.
- **Tell your senior:** “Collection, receipt and accounts use the same financial source.”
- **Expect:** Equal debit/credit totals appear.

### Step 4 — Finance & Accounts

- **Look at:** `#/app/finance`, Finance & Accounts.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect Expenses, Other Income and Fee Reconciliation.
- **Tell your senior:** “Other money uses separate vouchers; reconciliation checks linkage.”
- **Expect:** Existing entries appear; do not repost fees as Other Income.

**Finish:** Sign Out. **Avoid:** A screenshot is evidence for review, not proof of actual money received.

## Lesson 6 — PARENT

**Who you are:** Guardian linked to one or several children.

### Step 1 — Fee Dues & Online Pay

- **Look at:** `#/app/fees`, Fee Dues & Online Pay.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Select Child and inspect the due.
- **Tell your senior:** “One account can cover several linked children.”
- **Expect:** Only linked children are selectable.

### Step 2 — Fee Dues & Online Pay

- **Look at:** `#/app/fees`, Fee Dues & Online Pay.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Read Payment Instructions and School payment QR.
- **Tell your senior:** “Parent pays the SCHOOL through an external app.”
- **Expect:** Configured instructions appear; never transfer real money in rehearsal.

### Step 3 — Fee Dues & Online Pay

- **Look at:** `#/app/fees`, Fee Dues & Online Pay.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Submit fictional partial proof with unique DEMO reference, date and screenshot.
- **Tell your senior:** “Submitted evidence still needs the school verification.”
- **Expect:** PENDING proof; verified balance unchanged.

### Step 4 — Fee Dues & Online Pay

- **Look at:** `#/app/fees`, Fee Dues & Online Pay.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Refresh after Accountant approval; inspect receipt/balance.
- **Tell your senior:** “Verification completes the collection record.”
- **Expect:** Receipt appears and outstanding decreases.

**Finish:** Sign Out. **Avoid:** Online Pay label currently means external QR/UPI plus manual proof verification.

## Lesson 7 — STUDENT

**Who you are:** Student account with a limited current dashboard.

### Step 1 — Student Dashboard

- **Look at:** `#/app/dashboard`, Student Dashboard.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Inspect visible cards only.
- **Tell your senior:** “The current student workspace is limited.”
- **Expect:** Only Student Dashboard sidebar entry. Show assessment as Owner/Teacher.

**Finish:** Sign Out. **Avoid:** Do not promise dedicated timetable/results/attendance portal screens from an older report.

## Lesson 8 — STAFF

**Who you are:** Non-teaching school employee using own HR services.

### Step 1 — HR & Leave

- **Look at:** `#/app/hr`, HR & Leave.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** View own balance; prepare leave type/dates and request.
- **Tell your senior:** “Employees request leave; school managers review it.”
- **Expect:** Own balances/request form; submit only clearly fictional practice request.

### Step 2 — Dashboard

- **Look at:** `#/app/dashboard`, Dashboard.
- **Why it exists:** gives this role its assigned responsibilities.
- **Click:** Return and Sign Out.
- **Tell your senior:** “The workspace reflects the staff responsibilities.”
- **Expect:** Dashboard and HR are the only sidebar entries.

**Finish:** Sign Out. **Avoid:** Staff is not an alternate Teacher role.

## Repeatable practice

Use new admission numbers and references. Never reapprove an approved proof. Prepare a fresh unpaid enrollment-linked assignment before partial-payment rehearsal; old fixtures may already be paid. Parent chooses one of their existing linked children. For exam publication prepare valid subjects, enrollment and marks first. If Teacher roster is empty, check assignment/year/class/section as Owner. If subscription blocks operations, inspect Owner billing recovery; do not alter the DB or attempt provider payment.

## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.

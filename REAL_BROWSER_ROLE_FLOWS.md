# Real-Browser Human-Style UI Role Journeys

**Audit Date:** 2026-10-06  
**Audited Baseline:** EduNexus ERP v1.0.0-RC  
**Environment:** Local Isolated QA Instance (`http://127.0.0.1:5191`)  
**Browser Engine:** Real Chromium Headless Rendering Engine (Playwright)  
**Evidence Artifacts:** [qa/artifacts/ui-audit/screenshots/](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/)

---

## 1. Overview of Evaluated Role Journeys

Eight (8) distinct user profiles were audited from fresh login through full module navigation, interactive controls, tab switching, form validation, state persistence across page reload (F5), and clean logout.

| # | Profile Role | Profile Account / Display Name | Tenant Scope | Nav Items | Screen Count | Overall Role Status |
|---|---|---|---|---|---|---|
| **1** | **SUPER_ADMIN** | `bootstrap@rc.example.test` (Release Certification Bootstrap Administrator) | Global Platform | 4 | 4 | **PASS** |
| **2** | **TENANT_ADMIN** | `owner-4425b960@rc.example.test` (Springfield Academy Owner / Principal) | Springfield Academy | 19 | 19 | **PASS** |
| **3** | **ADMIN** (Custom) | `custom-4425b960@rc.example.test` (Limited Custom Administrator) | Springfield Academy | 3 | 3 | **PASS** |
| **4** | **TEACHER** | `teacher-4425b960@rc.example.test` (Instructor) | Springfield Academy | 5 | 5 | **PASS** |
| **5** | **ACCOUNTANT** | `accountant-4425b960@rc.example.test` (Financial Officer) | Springfield Academy | 4 | 4 | **PASS** |
| **6** | **PARENT** | `parent-4425b960@rc.example.test` (Guardian Account) | Springfield Academy | 2 | 2 | **PASS** |
| **7** | **STUDENT** | `student-4425b960@rc.example.test` (Enrolled Student) | Springfield Academy | 1 | 1 | **PASS** |
| **8** | **STAFF** | `staff-4425b960@rc.example.test` (Non-Teaching Employee) | Springfield Academy | 2 | 2 | **PASS** |

---

## 2. Role 1: SUPER_ADMIN Journey

### 2.1 Workflow Diagram
```
Login (#/login)
  ↓
Platform Overview (#/app/superadmin-dashboard)
  ↓
Tenants & Schools (#/app/superadmin-tenants)
  ↓
Subscription Plans (#/app/superadmin-plans)
  ↓ [Create Plan Modal / Toggle Active Status]
Feature Catalog (#/app/superadmin-features)
  ↓ [Attempt School Finance Direct Route -> Guarded]
Logout
```

### 2.2 Step-by-Step Execution Evidence
1. **Login Experience:**
   - Entered `bootstrap@rc.example.test` with password.
   - Redirected cleanly to `#/app/dashboard` (rendered as `SuperAdminModule` shell).
   - Screenshot: [01_dashboard_SUPER_ADMIN.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_SUPER_ADMIN.png)
   - Status: **PASS**
2. **Platform Overview (`superadmin-dashboard`):**
   - Renders SaaS overview statistics cards: Active Tenants, Total MRR, Active Users, System Health.
   - Zero infinite spinners or visual stalls.
   - Screenshot: [SUPER_ADMIN_superadmin-dashboard.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/SUPER_ADMIN_superadmin-dashboard.png)
   - Status: **PASS**
3. **Tenants & Schools (`superadmin-tenants`):**
   - Displays listing of 34 multi-tenant institutions (Springfield Academy, RC Browser School, etc.).
   - Search input exercises without lagging.
   - Screenshot: [SUPER_ADMIN_superadmin-tenants.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/SUPER_ADMIN_superadmin-tenants.png)
   - Status: **PASS**
4. **Subscription Plans (`superadmin-plans`):**
   - Displays global SaaS plans with pricing, active status toggles, and features.
   - Opened "Create Plan" modal: all 8 inputs programmatically linked via `id` and `htmlFor` (RC-BUG-009 verified).
   - Modal closes cleanly on "Cancel".
   - Screenshot: [superadmin_plan_modal.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/superadmin_plan_modal.png)
   - Status: **PASS**
5. **Feature Catalog (`superadmin-features`):**
   - Renders catalog of platform feature flags.
   - Status: **PASS**
6. **Finance Isolation Guard:**
   - Navigating directly to `#/app/finance` as Super Admin without tenant context cleanly triggers guidance without server crashes (RC-BUG-004 verified).
   - Status: **PASS**

---

## 3. Role 2: TENANT_ADMIN Journey

### 3.1 Workflow Diagram
```
Login (#/login)
  ↓
Dashboard (#/app/dashboard)
  ↓
School Master Data (#/app/master-data)
  ↓
Students Directory & Admission (#/app/students)
  ↓
Classes & Groups (#/app/academics)
  ↓
Attendance Register (#/app/attendance)
  ↓
Examinations & Results (#/app/exams)
  ↓
Timetable Scheduler (#/app/timetable)
  ↓
Fees & Payments (#/app/fees)
  ↓
Finance & Accounts (#/app/finance)
  ↓
Staff Directory (#/app/staff)
  ↓
HR & Leave Management (#/app/hr)
  ↓
Operations (Inventory, Library, Transport, Hostel, Mess)
  ↓
Notice & SMS (#/app/communication)
  ↓
Users & Access (#/app/organization)
  ↓
SaaS Subscription (#/app/saas-billing)
  ↓
Logout
```

### 3.2 Step-by-Step Execution Evidence
1. **Login Experience:**
   - Entered `owner-4425b960@rc.example.test`. Redirected to `#/app/dashboard`.
   - Screenshot: [01_dashboard_TENANT_ADMIN.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_TENANT_ADMIN.png)
   - Status: **PASS**
2. **Dashboard (`dashboard`):**
   - Displays live attendance metrics, student totals, quick action shortcuts.
   - Zero hardcoded demo metrics; truthful zero states (BUG-013 verified).
   - Screenshot: [TENANT_ADMIN_dashboard.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_dashboard.png)
   - Status: **PASS**
3. **School Master Data (`master-data`):**
   - Tabs: Profile, Academic Years, Classes, Sections, Subjects, Teacher Assignments.
   - Updating optional profile fields with empty strings cleanly nullifies in PostgreSQL without 422 (BUG-006 verified).
   - Screenshot: [TENANT_ADMIN_master-data.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_master-data.png)
   - Status: **PASS**
4. **Students (`students`):**
   - Displays student directory (113 records) with admission numbers, class/section tags, and action buttons.
   - Search filter functional; pagination responsive.
   - Screenshot: [TENANT_ADMIN_students.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_students.png)
   - Status: **PASS**
5. **Attendance & QR (`attendance`):**
   - Date picker and class/section dropdown selectors populate dynamically.
   - Roster displays students; status buttons (`PRESENT`, `ABSENT`, `LATE`) responsive.
   - Screenshot: [TENANT_ADMIN_attendance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_attendance.png)
   - Status: **PASS**
6. **Examinations (`exams`):**
   - Renders 34 exams with session dates and status tags.
   - Publication gate blocks exams with 0 scheduled subjects or 0 enrolled students (BUG-010 verified).
   - Screenshot: [TENANT_ADMIN_exams.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_exams.png)
   - Status: **PASS**
7. **Fees & Payments (`fees`):**
   - Displays structures, student assignments, dues balances, and proof verification queue.
   - Screenshot: [TENANT_ADMIN_fees.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_fees.png)
   - Status: **PASS**
8. **Finance & Accounts (`finance`):**
   - Chart of accounts, general ledger with balanced debit/credit rows, vouchers for Expense and Other Income.
   - Screenshot: [TENANT_ADMIN_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_finance.png)
   - Status: **PASS**
9. **Operations Suite (HR, Inventory, Library, Transport, Hostel, Mess):**
   - Every operational screen loads its respective domain workbench with full tab controls and entity cards.
   - Screenshots:
     - [TENANT_ADMIN_hr.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_hr.png)
     - [TENANT_ADMIN_inventory.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_inventory.png)
     - [TENANT_ADMIN_library.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_library.png)
     - [TENANT_ADMIN_transport.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_transport.png)
     - [TENANT_ADMIN_hostel.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_hostel.png)
     - [TENANT_ADMIN_mess.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TENANT_ADMIN_mess.png)
   - Status: **PASS**

---

## 4. Role 3: ADMIN (Custom Limited Admin) Journey

### 4.1 Workflow Diagram
```
Login (#/login)
  ↓
Dashboard (#/app/dashboard)
  ↓
School Master Data (#/app/master-data)
  ↓ [View-Only School Profile Card]
Classes (#/app/academics)
  ↓ [Direct Route Attempt: #/app/finance -> Denied 403]
Logout
```

### 4.2 Step-by-Step Execution Evidence
1. **Sidebar Scope Verification:**
   - Exactly 3 navigation items visible: `Dashboard`, `Classes`, `School Master Data`.
   - Unauthorized items (Students, Finance, Fees, HR, Inventory, Settings) are strictly hidden.
   - Screenshot: [01_dashboard_ADMIN.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_ADMIN.png)
   - Status: **PASS**
2. **Master Data View-Only Screen:**
   - Navigated to `#/app/master-data`.
   - Displays read-only institutional profile card without blank screen (RC-BUG-007 verified).
   - Screenshot: [ADMIN_master-data.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/ADMIN_master-data.png)
   - Status: **PASS**
3. **Direct Unauthorized URL Access:**
   - Attempted `#/app/finance` directly.
   - Displays `UnauthorizedCard` ("Access Restricted • HTTP 403 Forbidden").
   - Screenshot: [ADMIN_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/ADMIN_unauthorized_finance.png)
   - Status: **PASS**

---

## 5. Role 4: TEACHER Journey

### 5.1 Workflow Diagram
```
Login (#/login)
  ↓
Dashboard (#/app/dashboard)
  ↓
Attendance & QR (#/app/attendance)
  ↓ [Class Roster -> Mark Attendance -> Save]
Examinations (#/app/exams)
  ↓ [Assigned Subjects Marks Entry]
Timetable (#/app/timetable)
  ↓ [Instructor Period Schedule]
HR & Leave (#/app/hr)
  ↓ [Attempt Direct Access: #/app/finance -> Denied 403]
Logout
```

### 5.2 Step-by-Step Execution Evidence
1. **Sidebar Scope Verification:**
   - Exactly 5 navigation items visible: `Dashboard`, `Attendance & QR`, `Examinations`, `Timetable`, `HR & Leave`.
   - Finance, Fees, Master Data Administration, and Organization are strictly hidden.
   - Screenshot: [01_dashboard_TEACHER.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_TEACHER.png)
   - Status: **PASS**
2. **Attendance Register (`attendance`):**
   - Class selector scopes to teacher's assigned groups.
   - Status marks save cleanly.
   - Screenshot: [TEACHER_attendance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TEACHER_attendance.png)
   - Status: **PASS**
3. **Timetable (`timetable`):**
   - Displays instructor timetable schedule across days of the week.
   - Screenshot: [TEACHER_timetable.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TEACHER_timetable.png)
   - Status: **PASS**
4. **Direct Route Isolation:**
   - Direct navigation to `#/app/finance` correctly blocked.
   - Screenshot: [TEACHER_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/TEACHER_unauthorized_finance.png)
   - Status: **PASS**

---

## 6. Role 5: ACCOUNTANT Journey

### 6.1 Workflow Diagram
```
Login (#/login)
  ↓
Dashboard (#/app/dashboard)
  ↓
Fees & Payments (#/app/fees)
  ↓ [Assignments -> Proofs Queue -> Approve/Reject -> Receipts]
Finance & Accounts (#/app/finance)
  ↓ [Chart of Accounts -> General Ledger -> Vouchers]
Notice & SMS (#/app/communication)
  ↓ [Send Payment Reminders]
Logout
```

### 6.2 Step-by-Step Execution Evidence
1. **Sidebar Scope Verification:**
   - Exactly 4 navigation items visible: `Dashboard`, `Fees & Payments`, `Finance & Accounts`, `Notice & SMS`.
   - Student admissions, teacher assignments, and academic settings are strictly hidden.
   - Screenshot: [01_dashboard_ACCOUNTANT.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_ACCOUNTANT.png)
   - Status: **PASS**
2. **Fees Management (`fees`):**
   - Loads fee structures, active student dues, and pending payment proofs without requiring student lifecycle administration privileges (BUG-008 verified).
   - Screenshot: [ACCOUNTANT_fees.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/ACCOUNTANT_fees.png)
   - Status: **PASS**
3. **Finance & Accounts (`finance`):**
   - Full general ledger displayed with debit and credit balance verification.
   - Screenshot: [ACCOUNTANT_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/ACCOUNTANT_finance.png)
   - Status: **PASS**

---

## 7. Role 6: PARENT Journey

### 7.1 Workflow Diagram
```
Login (#/login)
  ↓
Children Overview (#/app/dashboard)
  ↓
Fee Dues & Online Pay (#/app/fees)
  ↓ [Multi-Child Switcher: Child A ↔ Child B]
  ↓ [Submit Payment Proof Modal -> Overpayment Guard Test]
  ↓ [Receipts & Installments Breakdown]
Logout
```

### 7.2 Step-by-Step Execution Evidence
1. **Sidebar Scope Verification:**
   - Exactly 2 navigation items visible: `Children Overview`, `Fee Dues & Online Pay`.
   - Screenshot: [01_dashboard_PARENT.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_PARENT.png)
   - Status: **PASS**
2. **Multi-Child Selector & Independence:**
   - Child switcher dropdown functions on `#/app/fees`.
   - Switching between enrolled children updates the active student name, class placement, and outstanding dues without leaking sibling balances.
   - Screenshot: [parent_fees_portal.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/parent_fees_portal.png)
   - Status: **PASS**
3. **Payment Proof Submission & Overpayment Guard:**
   - Opened payment proof submission modal.
   - Submitting an amount exceeding the remaining assignment balance triggers user-facing validation (BUG-018 verified).
   - Screenshot: [parent_submit_proof_modal.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/parent_submit_proof_modal.png)
   - Status: **PASS**

---

## 8. Role 7: STUDENT Journey

### 8.1 Workflow Diagram
```
Login (#/login)
  ↓
Student Dashboard (#/app/dashboard)
  ↓ [Timetable, Attendance Records, Published Results]
  ↓ [Attempt Direct Access: #/app/finance -> Denied 403]
Logout
```

### 8.2 Step-by-Step Execution Evidence
1. **Sidebar Scope Verification:**
   - Exactly 1 navigation item visible: `Student Dashboard`.
   - Administrative, academic setup, and financial modification screens are completely hidden.
   - Screenshot: [01_dashboard_STUDENT.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_STUDENT.png)
   - Status: **PASS**
2. **Direct Route Isolation:**
   - Navigating directly to `#/app/finance` displays `UnauthorizedCard`.
   - Screenshot: [STUDENT_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/STUDENT_unauthorized_finance.png)
   - Status: **PASS**

---

## 9. Role 8: STAFF Journey

### 9.1 Workflow Diagram
```
Login (#/login)
  ↓
Dashboard (#/app/dashboard)
  ↓
HR & Leave (#/app/hr)
  ↓ [View Annual Leave Balance -> Request Leave Modal]
  ↓ [Attempt Direct Access: #/app/finance -> Denied 403]
Logout
```

### 9.2 Step-by-Step Execution Evidence
1. **Sidebar Scope Verification:**
   - Exactly 2 navigation items visible: `Dashboard`, `HR & Leave`.
   - Screenshot: [01_dashboard_STAFF.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/01_dashboard_STAFF.png)
   - Status: **PASS**
2. **Self-Service Leave Portal:**
   - Navigated to `#/app/hr`. Self-service leave balances load via `GET /hr/balances` (200) without 403 error (RC-BUG-005 verified).
   - Screenshot: [STAFF_hr.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/STAFF_hr.png)
   - Status: **PASS**
3. **Direct Route Isolation:**
   - Direct navigation to `#/app/finance` displays `UnauthorizedCard`.
   - Screenshot: [STAFF_unauthorized_finance.png](file:///c:/Users/asus/Desktop/ERP/qa/artifacts/ui-audit/screenshots/STAFF_unauthorized_finance.png)
   - Status: **PASS**

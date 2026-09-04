# 🏫 EduNexus ERP — Complete Operational & Technical Manual

**EduNexus ERP** is an enterprise multi-tenant cloud software suite engineered to manage both **K-12 Schools** and **Competitive Coaching Academies** (JEE, NEET, Foundation).

---

## 1. Executive Summary & Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           END USER CLIENTS                              │
│       Desktop Web  •  Tablet Workstations  •  Mobile PWA Browsers       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    CLEAN WHITE + GREEN UI LAYER                         │
│   • Pure White Surfaces (#ffffff)       • Soft Neutral Base (#f8faf9)  │
│   • Emerald Brand (#16a34a)             • High-Contrast Slate Text      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                   ROLE-BASED CLIENT ENGINE (RBAC)                       │
│    AppShell  ──>  TenantContext (School/Coaching)  ──>  AuthContext     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                  HYBRID PERSISTENCE & SYNC LAYER                        │
│                supabaseClient.ts  <──>  storageService.ts               │
│                                    │                                    │
│             ┌──────────────────────┴──────────────────────┐             │
│             ▼                                             ▼             │
│   ONLINE / PRODUCTION                           OFFLINE / RESILIENT     │
│   Supabase PostgreSQL                           Local Storage Engine    │
│   (Row Level Security Enabled)                  (Instant Zero-Config)   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Architecture Highlights
- **Multi-Tenant SaaS Foundation**: Tenants are partitioned by `tenant_id`. Data access is governed by PostgreSQL Row Level Security (RLS).
- **Dual Operating Modes**:
  - **School Mode**: Organizes students by **Class & Section** (e.g. *Class 10-A*), terms, and CBSE report cards.
  - **Coaching Mode**: Organizes students by **Courses & Many-to-Many Batches** (e.g. *IIT-JEE Super-30 Morning Batch*), test series percentiles, and ranks.
- **Design System (Document 62)**: Built on an enterprise **White + Emerald Green + Light Neutral** palette with zero dark gradients, no neon glows, and clear visual hierarchy.

---

## 2. Seven Dedicated User Portals

| Role | Portal Experience | Key Daily Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | Platform Master Console | Provision institutions, configure SaaS plans, global uptime & health. |
| **Principal / Director** | Executive Control Centre | Institution overview, academic calendars, fee health, staff approvals. |
| **Teacher / Faculty** | Teacher Workspace | Daily QR attendance, Timetable periods, Homework assignments, Marksheets. |
| **Accountant** | Bursar Financial Desk | Fee collection, Invoicing, Concessions, Journal entries, P&L statements. |
| **Receptionist / Staff** | Front Office Desk | Lead CRM, Admission inquiries, Gate outpasses, Student records. |
| **Parent** | Multi-Child Parent Portal | Real-time attendance, Online fee payments, Term report cards. |
| **Student** | Learner Digital Portal | Timetable schedule, Homework submission, Digital ID card, Examination results. |

---

## 3. End-to-End Operational Workflows

### 3.1. The Student Academic Journey
1. **Admissions & Lead CRM (Doc 12)**: Inquiries enter via front desk or online portal. Tracked through lead stages (*Inquiry → Campus Tour → Form Verification → Admitted*).
2. **Student Master Profile (Docs 08, 35)**: Creates admission record with permanent Admission Number, blood group, guardian contacts, and generates a **Digital ID Card with QR Code**.
3. **Class / Batch Assignment (Doc 11)**:
   - In School mode: Allocated to Class (e.g. *Class 10*) and Section (*A*).
   - In Coaching mode: Allocated to Course (*JEE Advanced*) across multiple subject Batches (*Physics Batch 1, Chemistry Batch 2*).
4. **Daily Attendance (Docs 13, 50)**:
   - Three check-in methods: 1-Click Class Register, QR Scanner Check-in, or Subject Period Attendance.
   - Auto-triggers absent notifications to parents.
5. **Academic Delivery (Docs 14, 15)**:
   - Conflict-free timetable matrix scheduling periods and rooms.
   - Teachers create homework assignments with deadlines; students submit online.
6. **Examinations & Report Cards (Docs 16, 51, 52)**:
   - Exam schedules published with hall tickets and maximum marks.
   - Marks entered per subject; system auto-calculates total percentage, GPA, grade bands (A1, A2, B1), and class ranks.
   - Printable **CBSE-compliant Report Cards** with school crest and principal signature.
7. **Infirmary & Clinic (Doc 61)**:
   - Health profiles track Blood Group, Height, Weight, BMI, and critical allergies.
   - Clinic visits record temperature, blood pressure, diagnosis, treatment given, and parent notification status.

---

### 3.2. Financial & Fee Operations
1. **Fee Structures (Doc 19)**: Define tuition fees, computer lab fees, bus fees, and hostel fees per class/course with concession discounts (sibling discount, merit scholarships).
2. **Automated Invoicing (Doc 20)**: Generates monthly or termly invoices with due dates, late-fine calculations, and invoice numbers.
3. **Collection Desk & Online Payments (Doc 53)**:
   - Parents pay online via payment gateway or counter cashier accepts Cash/Card/UPI.
   - System issues an official three-copy tax invoice with QR receipt.
4. **Double-Entry General Ledger & P&L (Doc 54)**:
   - Payments auto-post journal entries: `Debit Bank / Cash` and `Credit Tuition Fee Revenue`.
   - Real-time **Income Statement (P&L)**, Expense tracking, and Balance Sheet.

---

### 3.3. Campus Logistics & Auxiliary Operations
1. **Library Management (Doc 57)**:
   - Accession ledger with ISBN indexing and live OPAC search.
   - Issue/Return circulation desk with overdue fine calculation and barcode scanner.
2. **Transport Fleet (Doc 58)**:
   - Bus vehicles, driver licenses, RTO insurance renewals, and emergency SOS contacts.
   - Multi-stop routes with student pickup stops and fuel consumption ledgers.
3. **Hostel Residence (Doc 59)**:
   - Hierarchy: Hostel → Block → Floor → Room (Single/Double/Dorm) → Bed IDs.
   - Strict **gender isolation policies** and evening curfew roll-call (10:00 PM).
   - Gate outpass desk (Day pass, Night out, Home visit).
4. **Hostel Mess & Dining (Doc 60)**:
   - 7-day rotating menus (Breakfast, Lunch, Snacks, Dinner) with chef specials.
   - Dietary tags (`VEG`, `NON_VEG`, `JAIN`).
   - Token check-in desk tracking plates served against kitchen provisions.
5. **Central Inventory (Doc 56)**:
   - Consumables and fixed assets tracked across multi-campus warehouses with stock re-order alerts.

---

### 3.4. Staff, HR & Payroll
1. **Staff Directory (Docs 47, 55)**: Faculty and personnel records with employee IDs, designations, and bank details.
2. **Biometric Attendance & Leave Register**: Tracks Present, Casual Leave (CL), Sick Leave (SL), and Loss of Pay (LOP) days.
3. **Automated Salary Calculation**:
   - Earnings: Basic + HRA + Special Allowance.
   - Statutory Deductions: Employee PF (12%), ESI (0.75%), Professional Tax (PT), and TDS Income Tax.
4. **Monthly Payroll Run & Payslips**:
   - 1-click batch calculation with bank transfer NEFT sheet and printable salary slips.

---

## 4. Complete Specification Suite Mapping (Docs 01–62)

| Document Range | Module / Feature Coverage |
| :--- | :--- |
| **Docs 01–06** | System Architecture, Multi-Tenant Database, Technology Stack & Entity Relationships |
| **Docs 07–09** | Database Schema, Canonical DDL, Authentication, RBAC & 80+ Granular Permissions |
| **Docs 10–12** | Organization Structure, Campus Branches, Course Batches, Admission CRM |
| **Docs 13, 50** | Daily, Subject-wise & Session Attendance with QR Code Gate Check-in |
| **Docs 14, 15** | Timetable Matrix, Conflict Resolution, Homework & Assignment Grading |
| **Docs 16, 17, 51, 52** | Examinations, Marksheets, CBSE Report Cards, Grading Bands & Rankings |
| **Docs 19, 20, 53** | Fee Structures, Concessions, Invoicing, Online Payments & Tax Receipts |
| **Doc 54** | Double-Entry General Ledger, Journal Entries, Department Budgets & P&L |
| **Docs 47, 55** | Staff Management, Salary Structures (PF/ESI/TDS), Payroll Runs & Printable Payslips |
| **Doc 56** | Consumable Inventory, Multi-Warehouse Stock Movements & Fixed Asset AMC |
| **Doc 57** | Accession Catalog, OPAC Search, Circulation Desk, Overdue Fines & Library Cards |
| **Doc 58** | Fleet Vehicles, Driver Directory, Multi-Stop Routes, Seating Safety & Fuel Ledger |
| **Doc 59** | Hostel Hierarchy (Blocks, Floors, Rooms, Beds), Gender Policy & Gate Passes |
| **Doc 60** | 7-Day Rotating Menu Boards, Meal Plans (Veg/Non-Veg/Jain) & Dining Tokens |
| **Doc 61** | Health & Medical Management, Clinic Visits, Allergies, Screenings & Vaccines |
| **Doc 62** | **White + Green ERP Design System: Enterprise Layout, Typography & Components** |

---

## 5. Live Database Setup (Supabase / PostgreSQL)

EduNexus connects to live PostgreSQL via Supabase with full multi-tenant Row Level Security (RLS).

### Configuration Steps:
1. **Create Supabase Project**: Free project at [supabase.com](https://supabase.com).
2. **Run Master Schema**: Copy and run `supabase/schema.sql` in Supabase SQL Editor.
3. **Run RLS Policies**: Copy and run `supabase/rls_policies.sql` to secure all tables.
4. **Run Seed Data**: Copy and run `supabase/seed.sql` to populate initial institutions and classes.
5. **Configure `.env`**:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_ENABLE_LIVE_DB=true
   ```
6. **Start Application**: `npm run dev` and navigate to `http://localhost:5173`.

---

## 6. Operator's Quick-Start Cheatsheet

- **To Switch Roles**: Click the **Role Dropdown** in the top header (`Role: Principal ⌄`) to switch instantly between Super Admin, Principal, Teacher, Accountant, Staff, Parent, or Student.
- **To Switch Institutions**: In the top header or login screen, toggle between **Delhi International Public School** (School mode) and **Apex Academy** (Coaching mode).
- **To Test Login Screen**: Click your user avatar in the top right and click **Sign Out**, or navigate directly to `http://localhost:5173/#login`.
- **To Mark Attendance**: Go to `#attendance` and use either the manual class register or the QR scanner simulator.
- **To Issue Fee Receipts**: Go to `#fees` → Select student invoice → Click **Record Payment** → Print the official GST receipt.
- **To Generate Report Cards**: Go to `#exams` → Click **CBSE Report Cards** → Select student and print.
- **To Reset Demo Data**: Click the refresh icon (`RotateCcw`) in the top header to restore all student ledgers and records to default state.

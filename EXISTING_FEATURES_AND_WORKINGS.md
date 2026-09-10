# 🏛️ EduNexus ERP — Complete Feature Catalog & Operational Manual

> **Product Version**: EduNexus Cloud v1.0.0 Enterprise Multi-Tenant Edition  
> **Architecture**: Dual Mode (K-12 School & Competitive Coaching) | Hybrid Persistence (Offline-First LocalStorage + Supabase PostgreSQL)  
> **UI Design**: Enterprise Clean White & Emerald Green (#16a34a) Design System (Doc 62)

---

## 1. Core Architectural Capabilities

### 1.1 Dual-Operating Engine (School Mode vs Coaching Mode)
EduNexus operates on a dynamic runtime engine that instantly morphs all UI labels, workflows, and calculations based on the institution type:
- **K-12 School Mode** (e.g., *Delhi International Public School*):
  - Organizes students by **Class & Section** (e.g., *Class 10-A*).
  - Uses terms, semesters, and generates official **CBSE / State Board Report Cards** with scholastic and co-scholastic grades.
  - Fee structures are billed as Annual or Quarterly Tuition Fees.
- **Coaching Academy Mode** (e.g., *Apex Academy*):
  - Organizes students by **Courses & Many-to-Many Batches** (e.g., *IIT-JEE Super-30 Morning Batch*).
  - Uses test series with negative marking (+4 / -1), percentiles, and All-India Rank (AIR) leaderboards.
  - Fee structures are installment-based coaching packages.

### 1.2 Multi-Tenant Data Isolation
- Each school/academy is assigned an immutable `tenant_id`.
- Data is strictly siloed in both PostgreSQL (via Row Level Security policies) and the local storage engine.
- Cross-tenant data leakage is prevented at both the service layer and the database layer.

---

## 2. All 22 Existing Modules & How They Work

---

### Module 1: Authentication & Role-Based Access Control (RBAC)
- **Routes**: `/#/login`, `/#/login?role=...`
- **Portals Supported**: Super Admin, Principal / Director, Teacher / Faculty, Accountant, Staff / Receptionist, Parent, Student.
- **How It Works**:
  1. Users authenticate via email/password or use the **Demo Persona Switcher** for instant role testing.
  2. The system checks over 80+ granular permissions (e.g., `fees.record`, `attendance.mark`, `exams.publish`).
  3. If a user attempts to access an unauthorized route, the `PermissionGuard` displays a clean security card with a "Return to Dashboard" action.
  4. Active sessions track expiration; when a session expires, a modal prompts renewal without losing user form inputs.

---

### Module 2: Learner & Student Management
- **Route**: `/#/app/students`
- **How It Works**:
  1. **Master Directory**: Search and filter students by Class/Batch, enrollment status (Active, Inactive, Suspended), blood group, or gender.
  2. **Student Profile**: Shows full student bio, admission number, guardian contact numbers, residential address, emergency contacts, fee ledger balance, and classroom conduct notes.
  3. **Digital Student ID Card**: Click "View ID Card" to generate a printable, verified digital ID card with a unique scannable QR code and institution seal.
  4. **Student Enrollment**: Complete registration form with auto-generated admission numbers (`ADM-2026-XXXX`).

---

### Module 3: Academic Structure & Class Management
- **Route**: `/#/app/academics`
- **How It Works**:
  1. **Classes / Courses Matrix**: Displays active classes (Class 9, 10, 11, 12) or courses (JEE Advanced, NEET Comprehensive) with assigned class teachers, room numbers, and student capacity.
  2. **Subject Allocation**: Assigns subjects (Mathematics, Physics, English, Chemistry) with course credits and designated faculty.
  3. **Section / Batch Manager**: Create sections (*A, B, C*) or track batches (*Morning, Evening*) with seat limits.
  4. **Academic Rollover Wizard**: Batch-promotes students from one academic session to the next upon final exam completion.

---

### Module 4: Attendance & High-Speed QR Gate Kiosk
- **Route**: `/#/app/attendance`
- **How It Works**:
  1. **Class Register Roll-Call**: Teachers mark daily attendance in 1 click (`Present`, `Absent`, `Late`, `Excused`) with a live summary of attendance percentages.
  2. **Smart QR Gate Scanner**:
     - Uses live camera/webcam feed or manual barcode scanner input.
     - When a student taps their digital ID card QR code at the campus gate, the scanner instantly validates their identity, records the gate check-in timestamp, and plays an audio confirmation beep.
     - Automatically logs an instant parent notification trigger (*"Aarav checked into campus at 08:15 AM"*).
  3. **Period / Subject Attendance**: Tracks attendance subject-by-subject for high-school and coaching lectures.

---

### Module 5: Examinations, Marksheets & Digital Report Cards
- **Route**: `/#/app/exams`
- **How It Works**:
  1. **Exam Schedule Creator**: Schedules term examinations and mock test series with dates, maximum marks, passing marks, and exam room allocations.
  2. **Marks Entry Desk**: Teachers enter subject-wise marks; the system automatically calculates total marks, percentage, grade points (GPA), and rank.
  3. **CBSE-Compliant Report Cards**:
     - Generates official printable report cards adhering to the CBSE 8-point grading scale (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`, `D`, `E`).
     - Includes scholastic subjects, co-scholastic grades (Discipline, Art, Physical Education), teacher remarks, attendance percentages, and principal signature lines.
  4. **Coaching Rank Leaderboard**: In Coaching Mode, displays percentile curves, negative marking deductions (+4 for correct, -1 for incorrect), and Batch vs Institute ranks.

---

### Module 6: Homework, Assignments & DPP (Daily Practice Sheets)
- **Route**: `/#/app/homework`
- **How It Works**:
  1. **Homework Creation**: Teachers post homework with title, subject, instructions, due date, and downloadable attachments.
  2. **Student Portal View**: Students see upcoming assignments with a countdown timer ("Due in 2 days") and upload digital submissions.
  3. **Grading & Feedback**: Teachers review submitted work, assign completion status (`Submitted`, `Late`, `Missing`), and provide personalized feedback notes.

---

### Module 7: Timetable & Master Schedule Matrix
- **Route**: `/#/app/timetable`
- **How It Works**:
  1. **Weekly Grid View**: Displays Monday–Saturday timetable schedules broken into 45-minute academic periods with recess breaks.
  2. **Conflict Detection**: Prevents scheduling the same teacher or room in two different classes during the same period.
  3. **Student/Parent View**: Filtered to show only the logged-in student's daily timetable and current active period.

---

### Module 8: Fee Operations, Invoicing & Certified Receipts
- **Route**: `/#/app/fees`
- **How It Works**:
  1. **Fee Structures**: Configures annual or quarterly fee heads (Tuition, Computer Lab, Sports, Bus, Examination).
  2. **Student Fee Ledgers**: Tracks total due amount, paid amount, and remaining balance for every enrolled student.
  3. **Cashier Collection Desk**:
     - Record payments via `RAZORPAY_UPI`, `RAZORPAY_CARD`, `CASH`, `CHEQUE`, or `BANK_TRANSFER`.
     - Supports partial installments and records cheque/DD numbers and bank names.
  4. **Official 3-Copy GST Tax Receipts**:
     - Generates printable official fee receipts with receipt numbers (e.g., `RCP-DPS-2026-4412`), school crest, GSTIN, student details, payment method, and QR verification stamp.
  5. **Scholarships & Concessions**: Apply merit scholarships, sibling discounts, or staff-child waivers with approval notes.
  6. **Fee Refund Processing**: Processes subject fee adjustments or security deposit reversals with audit logging.

---

### Module 9: Double-Entry General Ledger & Finance
- **Route**: `/#/app/finance`
- **How It Works**:
  1. **General Ledger**: Every fee collected and expense recorded auto-posts debit/credit journal entries to maintain mathematical double-entry balance.
  2. **Cash & Bank Accounts**: Monitors balances across Primary Collection Bank, Operational Expense Account, and Petty Cash reserves.
  3. **Expense Tracking**: Record operating expenses (Utilities, Lab Supplies, Software) with vendor names, payment modes, and receipt attachments.
  4. **Live Income Statement (P&L)**: Real-time calculation of Total Revenue minus Total Operating Expenses, displaying Net Surplus / Deficit.

---

### Module 10: Staff HR, Attendance & Batch Payroll Engine
- **Route**: `/#/app/staff`
- **How It Works**:
  1. **Staff Directory**: Faculty and administrative personnel records with employee IDs, designations, departments, bank details, and PAN/Aadhaar numbers.
  2. **Biometric Attendance Register**: Logs Present, Casual Leave (CL), Sick Leave (SL), and Loss of Pay (LOP) days.
  3. **Automated Salary Calculation**:
     - Earnings: Basic Pay + HRA + Special Teaching Allowance.
     - Statutory Deductions: Employee PF (12%), ESI (0.75%), Professional Tax (PT), and TDS Income Tax.
  4. **1-Click Batch Payroll Run**: Computes net pay for the entire faculty and generates printable monthly salary slips with bank NEFT payout files.

---

### Module 11: Central Consumable Inventory & Asset Tracking
- **Route**: `/#/app/inventory`
- **How It Works**:
  1. **Stock Movement Desk**: Tracks stock-in deliveries from vendors and stock-out distributions to classrooms and departments.
  2. **Multi-Store Warehouses**: Manages inventory across Main Campus Store, Science Labs, and Sports Warehouse.
  3. **Stock Re-Order Thresholds**: Flags items with amber alert badges when quantities drop below minimum re-order levels.
  4. **Capital Assets & AMC**: Monitors high-value assets (Projectors, Lab Microscopes, Buses) with Annual Maintenance Contract (AMC) renewal dates.

---

### Module 12: Library Accession & OPAC Catalog
- **Route**: `/#/app/library`
- **How It Works**:
  1. **Accession Master Ledger**: Catalogs books by ISBN, title, author, publisher, genre, and shelf location.
  2. **OPAC Live Search**: Students and teachers can search book availability by title or author in real time.
  3. **Circulation Issue / Return Desk**:
     - Check out books to students/staff by scanning student ID and book accession number.
     - Sets automated 14-day loan deadlines.
  4. **Overdue Fine Engine**: Auto-calculates overdue fines (e.g., ₹5/day overdue) upon book return.

---

### Module 13: Transport Fleet Logistics & Student Routes
- **Route**: `/#/app/transport`
- **How It Works**:
  1. **Vehicle Fleet Registry**: Tracks school buses, vans, and shuttles with registration numbers, seating capacities, pollution certificates, and fitness renewals.
  2. **Driver Directory**: Stores driver commercial license numbers, background checks, and emergency SOS mobile numbers.
  3. **Multi-Stop Route Matrices**: Maps pickup and drop stops with morning and evening arrival times.
  4. **Passenger Roster**: Assigns students to specific bus routes and stops.
  5. **Fuel & Maintenance Log**: Records diesel refills, odometer readings, and routine service receipts.

---

### Module 14: Hostel Residence & Room Bed Allocations
- **Route**: `/#/app/hostel`
- **How It Works**:
  1. **Hostel Hierarchy**: Structured as *Hostel Building ➔ Block ➔ Floor ➔ Room (Single / Double / Dorm) ➔ Bed ID*.
  2. **Gender Isolation Policy**: Strict validation ensuring male and female residents are isolated into dedicated wings.
  3. **Nightly Curfew Roll-Call**: 10:00 PM evening attendance check verifying that all boarders are in their assigned beds.
  4. **Gate Outpass Desk**: Approves and tracks Day Passes, Night Outs, and Weekend Home Visits with warden authorization.

---

### Module 15: Hostel Mess & 7-Day Rotating Dining
- **Route**: `/#/app/mess`
- **How It Works**:
  1. **7-Day Menu Board**: Schedules Breakfast, Lunch, Evening Snacks, and Dinner with chef specials for every day of the week.
  2. **Dietary Preferences**: Tags meals as `VEG`, `NON_VEG`, or `JAIN`.
  3. **Dining Token Desk**: Verifies student meal tokens at the kitchen counter to prevent unauthorized dining and monitor daily plates served.
  4. **Food Quality Audits**: Records kitchen hygiene inspection scores and student feedback reviews.

---

### Module 16: Campus Health, Infirmary & Clinic
- **Route**: `/#/app/health`
- **How It Works**:
  1. **Clinic Visit Logs**: Records student infirmary visits, body temperature, blood pressure, diagnosis, treatment given, and bed rest duration.
  2. **Critical Allergy Badges**: Highlights students with severe allergies (Penicillin, Peanuts, Dust, Asthma) across their master profiles.
  3. **Immunization Tracker**: Logs mandatory school vaccines (Tetanus, MMR, Hepatitis B) and annual vision/dental checkups.
  4. **Parent Emergency Dispatch**: Automatically flags severe medical cases to trigger urgent parent notifications.

---

### Module 17: Inbound Leads & Admission CRM
- **Route**: `/#/app/crm`
- **How It Works**:
  1. **Inquiry Pipeline**: Tracks prospective student inquiries across 4 visual stages:
     - `Inquiry Logged` ➔ `Campus Tour Scheduled` ➔ `Form Verification` ➔ `Admitted`.
  2. **Lead Sources**: Captures lead origin (Walk-in, Website Form, Social Media, Parent Referral).
  3. **Counselor Follow-Up**: Records phone call notes, scheduled callbacks, and conversion rates.
  4. **1-Click Convert to Student**: Converts an admitted lead directly into a formal enrolled student record without manual re-typing.

---

### Module 18: Notices, Broadcasts & WhatsApp Alerts
- **Route**: `/#/app/communication`
- **How It Works**:
  1. **Notice Board**: Publishes targeted announcements to Students, Parents, Teachers, or All Campus.
  2. **Priority Tags**: Highlights notices as `URGENT`, `ACADEMIC`, `EXAMINATION`, or `GENERAL`.
  3. **WhatsApp Deep-Link Launcher**: Formats pre-composed parent alert messages and opens them directly in WhatsApp Web (`wa.me`) with a single click.

---

### Module 19: Executive Reports & Data Analytics
- **Route**: `/#/app/reports`
- **How It Works**:
  1. **Fee Aging Analysis**: Visualizes on-time collections vs 30-day, 60-day, and 90-day overdue installments.
  2. **Attendance Trends**: Monthly attendance heatmaps highlighting absenteeism patterns across classes.
  3. **Academic Performance Distributions**: Bell-curve grade distributions comparing term exam results.
  4. **CSV Data Export**: 1-click export of student directories, fee ledgers, and staff records into clean CSV files for external audits.

---

### Module 20: Super Admin Platform Master Console
- **Route**: `/#/super-admin`
- **How It Works**:
  1. **Platform MRR & Health**: Displays global metrics: active institutions, total students across all campuses, and platform Monthly Recurring Revenue (₹4.85 Lakh).
  2. **Tenant Provisioning**: View, suspend, or provision new institutions with auto-generated tenant UUIDs.
  3. **SaaS Quotas & Tier Manager**: Configure Starter (₹1,999), Pro (₹4,999), and Enterprise (₹9,999) plan limits.
  4. **System Security Audit Trail**: Complete chronological log tracking logins, fee payments, and permission changes across all tenants.

---

### Module 21: Self-Onboarding Wizard & Public SaaS Landing Page
- **Routes**: `/#/` (Landing), `/#/signup` (Onboarding)
- **How It Works**:
  1. **Marketing Landing Page**: High-converting showcase with live feature grids, dual-mode toggle demonstrations, pricing tables, and testimonials.
  2. **4-Step Onboarding Wizard**:
     - *Step 1*: Institution Details (Name, Code, Type: School or Coaching).
     - *Step 2*: Admin Account Credentials.
     - *Step 3*: Feature Toggles (Select active modules).
     - *Step 4*: Verification & Instant Workspace Launch.

---

### Module 22: AI Education Assistant & Academic Summarizer
- **Trigger**: Click `AI Assistant` in top navigation bar or Super Admin header
- **How It Works**:
  1. **Conversational Assistant**: Context-aware chatbot answering questions regarding student fee balances, exam dates, and attendance records.
  2. **AI Report Card Summarizer**: Generates narrative performance summaries for student report cards based on their exam marks and conduct records.

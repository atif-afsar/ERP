# EduNexus Multi-Tenant ERP — Features & System Workings Manual

---

## 1. Executive Summary & Core Proposition

**EduNexus ERP** is a modern, high-performance, multi-tenant Educational Resource Planning SaaS engineered specifically for **K-12 Schools**, **Competitive Coaching Institutes**, and **Hybrid Campuses**.

The system dynamically adapts its terminology, features, and operational flows based on the institution type:
- **School Mode**: Organizes academics into *Classes*, *Sections*, *Annual Fees*, *CBSE/ICSE Report Cards*, and *Teachers*.
- **Coaching Institute Mode**: Automatically transforms the UX into *Batches*, *Test Series*, *Mock Tests*, *Rank Comparison Ledgers*, *DPPs (Daily Practice Problems)*, and *Lead Faculty*.

---

## 2. Technical Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Deployed on Vercel)                   │
│                                                                        │
│  React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion          │
│  - AppShell Layout & Navigation                                        │
│  - Dynamic Tenant Theme Engine (White-labeling & Terminology)          │
│  - apiClient (Idempotent requests, Bearer JWT, X-Tenant-ID headers)   │
│  - Resilient Local Cache Fallback (localStorage storageService)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         HTTPS REST API (JSON)
                      Base: VITE_API_URL (/api & /api/v1)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         BACKEND (Deployed on VPS)                      │
│                                                                        │
│  Node.js + Express + TypeScript + PM2                                  │
│  - Helmet security headers & Morgan request logging                    │
│  - Strict CORS Policy (Production: Authorized Vercel origins only)     │
│  - JWT Authentication Middleware (Bearer token parsing & verification) │
│  - Multi-Tenant Isolation Middleware (X-Tenant-ID claim matching)      │
│  - Centralized Zod Request Validation                                  │
│  - Centralized Error Handling & RFC-7807 Error Responses               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                           Connection Pool (pg)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    POSTGRESQL DATABASE (127.0.0.1:5432)                │
│                                                                        │
│  - Master Schema: sql/001_schema.sql (UUID primary keys, CASCADE DDL)  │
│  - Tenant Isolation: Every query filters by authenticated tenant_id    │
│  - Seed Data: sql/002_seed.sql (RBAC permissions & system roles)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive Module Catalog & Feature Breakdown

### 📚 1. Academic Structure & Course Management
- **Academic Years & Sessions**: Configure active terms, batch years (e.g., `2026-2027`), semester starts, and enrollment windows.
- **Classes, Batches & Sections**: Flexible grouping hierarchy supporting standard school classes (e.g., `Class 10 - Section A`) and competitive coaching batches (e.g., `IIT-JEE 2-Year Target Batch`).
- **Subject & Curriculum Mapping**: Define theoretical, practical, elective, and core subjects with assigned credit points and weekly workload allocations.
- **Dynamic Terminology Adaptation**: Switching between School and Coaching centers instantly modifies all labels across the user interface without code redeployment.

---

### 👨‍🎓 2. Student Information System (SIS) & Admissions
- **Digital Student Dossier**: Complete learner profile with admission number, roll number, date of birth, blood group, medical alerts, and parent contact details.
- **Student Status Lifecycle**: Supports active student tracking, archived alumni, suspended status, and automated promotion between grades.
- **Dynamic Digital ID & QR Gate Pass**: Generates unique cryptographic QR identity passes for each enrolled learner for instant scanning at campus security gates.
- **Search & Filtering**: Search instantly by name, roll number, admission ID, section, or active enrollment status with instant pagination.

---

### 👩‍🏫 3. Staff & Human Resources Management
- **Staff Directory & Profiles**: Centralized directory of teaching faculty, administrative officers, accountants, and campus operators.
- **Designation & Role Allocation**: Manage role assignment with granular RBAC permissions.
- **Workload & Subject Allocation**: Link faculty to specific classrooms, subjects, and batch timetables.
- **Contact & Emergency Details**: Secure records of qualification documents, contact numbers, and address verification.

---

### ⏱️ 4. Attendance Management & Gate Pass Scanner
- **Three-Mode Attendance Tracking**:
  1. *Daily Classroom Register*: One-click bulk attendance marking (Present, Absent, Late, Excused, Half-day).
  2. *QR Code Gate Pass Scanner*: Instant camera-based check-in / check-out at campus entry gates.
  3. *Subject / Period-wise Logging*: Lesson-level attendance for coaching institutes and higher education.
- **Real-Time Analytics**: Dashboard summary displaying daily attendance percentages, absentees, and alert triggers.
- **Audit Logs**: Every attendance entry records the timestamp, recording teacher ID, and tenant context.

---

### 💳 5. Fees, Billing & Invoicing Engine
- **Flexible Fee Structures**: Create institution-wide fee templates with custom fee heads (Tuition, Lab, Transportation, Library, Exam Fee, Sports).
- **Frequency Options**: Annual lump sum, bi-annual, quarterly, or monthly installment plans.
- **Student Invoices / Fee Ledgers**: Automated fee assignment across entire classes or individual students.
- **Concessions & Scholarships**: Apply percentage or flat fee discounts with approval notes.
- **Late Fee Rules & Due Date Tracking**: Configurable grace periods and overdue penalty indicators.

---

### 💵 6. Payments & Receipt Generation
- **Multi-Mode Transaction Support**: Accept payments via Cash, UPI, Netbanking, Debit/Credit Card, Demand Draft, or Bank Transfer.
- **Instant Printable Receipts**: Automated receipt generation featuring institution logo, transaction ID, student details, breakdown by fee head, and remaining balance.
- **Idempotent Transaction Security**: All payment submissions support unique `Idempotency-Key` headers to completely prevent double-billing on network hiccups.

---

### 📊 7. Accounting, Finance & General Ledger
- **Income & Expense Ledgers**: Record departmental operational expenses (utilities, lab supplies, maintenance, events).
- **Categorized Headings**: Tag income and expenses by category, payment method, and approving administrator.
- **Financial Balance Sheets**: Instant summary cards displaying total revenue collected, outstanding dues, total campus expenses, and net operating margin.

---

### 📝 8. Examination & Assessment Management
- **Exam Scheduling**: Create and schedule unit tests, mid-term examinations, final assessments, and competitive mock test series.
- **Hall Ticket Generation**: Automated exam admit slips with student registration numbers, allotted examination room, and subject schedules.
- **Assessment Types**: Supports theoretical papers, practicals, internal evaluations, and MCQ objective tests.

---

### 🏆 9. Grading, Performance Analytics & Report Cards
- **Mark Entry Grid**: Fast, tabular marks submission for faculty with minimum passing thresholds and maximum marks validation.
- **Automated Grade Computation**: Configurable grading scales (CBSE 9-point scale, percentage calculation, letter grades A+ to F).
- **Coaching Rank Ledgers**: Computes percentile, batch rank, and subject-wise accuracy for competitive entrance batches (IIT-JEE / NEET / Olympiads).
- **Printable Report Cards**: Formatted academic transcript ready for PDF download and printing for parent-teacher conferences.

---

### 📖 10. Homework, Assignments & Digital LMS
- **Assignment Distribution**: Teachers create homework with instructions, submission deadlines, attached documents, and grading criteria.
- **Targeted Delivery**: Assign homework to entire grades, specific sections, or personalized remedial groups.
- **Submission Tracking**: Monitor student submission statuses (Pending, Submitted, Graded, Overdue).

---

### 📅 11. Timetable & Master Schedule Matrix
- **Interactive Period Grid**: Monday through Saturday scheduling interface broken into class periods and recess intervals.
- **Faculty Allocation & Conflict Check**: View schedule by classroom or individual teacher to prevent double-booking.
- **Room Assignment**: Map classes to specific lecture halls, laboratories, or seminar rooms.

---

### 📢 12. Multichannel Communication & Notice Board
- **Campus Circulars**: Post institution-wide, staff-only, or parent-facing announcements with priority flags (Urgent, Normal, Informational).
- **Categorized Feeds**: Organize updates into Academic, Holiday, Fee Reminders, Sports, and Emergency bulletins.
- **Read Acknowledgment**: Track when notices are published and viewed.

---

### 📚 13. Library & Book Catalog Management
- **Catalog Management**: Inventory books by Title, Author, ISBN, Subject, and Rack location.
- **Circulation Desk**: Issue books to students/staff with automated due date tracking and return status logging.
- **Overdue Penalty Management**: Highlight books past their due dates with calculated daily fine tallies.

---

### 📦 14. Inventory & Asset Management
- **Item Categorization**: Track sports equipment, laboratory glassware, IT assets (laptops, projectors), and office stationary.
- **Stock Tracking & Reorder Alerts**: Monitor current quantity in stock against minimum threshold limits.
- **Allocation Logs**: Record which staff member or laboratory custodian checked out equipment.

---

### 🏢 15. Hostel & Dormitory Management
- **Building & Block Hierarchies**: Manage campus hostels by block (e.g., North Block, Boys Hostel, Girls Residence).
- **Room Allocation**: Track room types (Single, Double, Dormitory), maximum bed capacity, and current vacancies.
- **Warden Supervision**: Assign staff wardens to specific hostel wings with resident directories.

---

### 🍲 16. Hostel Mess & Dining Services
- **Weekly Meal Menu**: Publish schedules for Breakfast, Lunch, Evening Snacks, and Dinner.
- **Dietary Preference Tracking**: Manage vegetarian, vegan, and special allergy diet rosters.
- **Daily Consumption Logging**: Track daily mess attendance and meal counts.

---

### 🚌 17. Transport & Fleet Operations
- **Vehicle Roster**: Manage buses, vans, and contracted shuttles with registration numbers, insurance expiry, and fitness certificates.
- **Route & Stop Planning**: Map routes with ordered pickup points, estimated arrival times, and assigned student rosters.
- **Driver & Attendant Profiles**: Maintain driver licensing, emergency contacts, and contact numbers.

---

### 🩺 18. Health & Campus Infirmary
- **Student Medical Dossier**: Maintain private medical records, blood groups, known allergies, and emergency medical contacts.
- **Clinic Visit Log**: Record student visits to the campus clinic, diagnosis notes, administered medication, and rest duration.
- **Emergency Escalation**: Immediate one-click contact details for parents and guardians in medical events.

---

### 🎯 19. CRM & Admissions Pipeline
- **Prospective Student Inquiries**: Capture leads from campus walk-ins, website forms, and education fairs.
- **Pipeline Stage Funnel**: Manage prospects through stages: *Inquiry Logged* ➔ *Campus Tour* ➔ *Assessment Scheduled* ➔ *Fee Quoted* ➔ *Enrolled* / *Lost*.
- **Follow-up Reminders**: Schedule call reminders and counselor task assignments.

---

### ⚡ 20. Super Administrator Multi-Tenant Platform
- **Multi-Tenant SaaS Management**: Create, configure, suspend, or upgrade tenant institutions across the platform.
- **Feature Flag Control**: Toggle specific modules per tenant (e.g., turn off Hostel and Transport for small coaching centers).
- **Institution Switcher**: Platform administrators can preview and audit any tenant campus with a single click.

---

### 🤖 21. AI Campus Copilot & Document RAG
- **Semantic Knowledge Search**: Google Gemini-powered embedding engine (`gemini-embedding-001`) that indexes student handbooks, campus policies, and academic guidelines.
- **Natural Language Assistant**: Natural language answering for fee policies, exam rules, and attendance criteria for students, parents, and teachers.
- **Deterministic Offline Fallbacks**: Built-in fallback responses if external AI networks are unreachable.

---

### 🔒 22. Audit Trails & Enterprise Compliance
- **Immutable Activity Logging**: Records user actions (e.g., fee collection, student deletion, role modification).
- **Request Metadata**: Captures client IP address, User-Agent, Tenant ID, and exact action timestamp for compliance auditing.

---

### 🛡️ 23. RBAC & Security Infrastructure
- **7 Pre-Configured Personas**:
  1. `SUPER_ADMIN`: Cross-tenant platform owner with complete system control.
  2. `TENANT_ADMIN`: Institution Principal or Managing Director.
  3. `TEACHER`: Faculty with attendance, grading, homework, and timetable privileges.
  4. `ACCOUNTANT`: Financial officer with fee collection, invoices, and expense access.
  5. `STAFF`: Campus operations, library, hostel, and transport managers.
  6. `PARENT`: Read-only portal for child's attendance, fees, homework, and report cards.
  7. `STUDENT`: Learner view for timetable, assignments, notices, and exam results.
- **Granular Permission Guards**: Frontend UI elements and backend API endpoints enforce discrete permission checks (e.g., `fees.create`, `attendance.mark`, `students.delete`).

---

## 4. End-to-End Operational Workflows

### A. Authentication & Session Lifespan
```
[User submits Email + Password]
            │
            ▼
[Frontend: authService.signIn()] ──(POST /api/v1/auth/signin)──▶ [Backend: routes/auth.ts]
                                                                        │
                                                              [Verify bcrypt hash in DB]
                                                                        │
                                                              [Sign JWT with tenantId & role]
                                                                        │
[Store token in localStorage] ◀────(Return { token, user })─────────────┘
            │
[Subsequent API calls attach Authorization: Bearer <token>]
```

### B. Dual-Mode Persistence & Offline-First Resilience
1. Every write operation (e.g., creating a student, recording attendance, taking a fee payment) executes through `apiClient.request()`.
2. **Online Mode (Standard)**: The request reaches the VPS backend, persists in PostgreSQL, and updates the local storage cache with the canonical database record.
3. **Offline / Resilient Mode (Fallback)**: If the backend VPS is undergoing maintenance or the client loses internet access, the client gracefully falls back to `storageService` without crashing or showing blank screens.
4. **Health Monitor**: The `backendClient.checkConnection()` utility pings the VPS `/health` endpoint every few seconds, displaying real-time latency and connectivity status in the UI navigation bar.

---

## 5. Development & Production Cheat Sheet

### Root Workspace Commands
```bash
# Start frontend locally (Vite on http://localhost:5173)
npm run dev:frontend

# Start backend locally (Express on http://localhost:5000)
npm run dev:backend

# Verify backend test suite
npm run test:backend

# Build both applications for production
npm run build
```

### Production Deployment
- **Frontend**: Deploy `/frontend` to **Vercel** with environment variable `VITE_API_URL=https://api.yourdomain.com/api`.
- **Backend**: Deploy `/backend` to **Linux VPS** managed by **PM2** behind an **Nginx** reverse proxy with SSL.
- **Complete Step-by-Step Deployment**: Refer to [docs/DEPLOYMENT.md](file:///c:/Users/asus/Desktop/ERP/docs/DEPLOYMENT.md).

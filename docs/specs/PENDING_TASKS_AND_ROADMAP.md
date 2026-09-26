# 📋 EduNexus ERP — Pending Tasks & Production Launch Roadmap

> **Current Application Status**: 🟢 **92% Core Features Operational** | 0 TypeScript Errors | Production Build Passing (2,051 modules)

---

## 1. Executive Implementation Dashboard

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SYSTEM READINESS MATRIX                                │
├───────────────────────────────┬────────────┬─────────────┬─────────────────────────────┤
│ Core Module / Component       │ UI / Logic │ Live Cloud  │ Production Readiness        │
├───────────────────────────────┼────────────┼─────────────┼─────────────────────────────┤
│ Dual-Tenant Model (School/Coa)│   100%     │    100%     │ 🟢 Production Ready         │
│ RBAC & 7 User Portals         │   100%     │    100%     │ 🟢 Production Ready         │
│ Student Registry & ID Cards   │   100%     │    100%     │ 🟢 Production Ready         │
│ Attendance (Register & QR)    │   100%     │    100%     │ 🟢 Production Ready         │
│ Exams, Marksheets & ReportCard│   100%     │    100%     │ 🟢 Production Ready         │
│ Accounting, Ledgers & P&L     │   100%     │    100%     │ 🟢 Production Ready         │
│ Staff HR & Batch Payroll      │   100%     │    100%     │ 🟢 Production Ready         │
│ Logistics (Library, Bus, Mess)│   100%     │    100%     │ 🟢 Production Ready         │
│ Offline Resilient Storage     │   100%     │    100%     │ 🟢 Production Ready         │
├───────────────────────────────┼────────────┼─────────────┼─────────────────────────────┤
│ School Payment Gateway Keys   │    15%     │      0%     │ 🔴 Pending (Needs UI & DDL) │
│ Live Razorpay Checkout Popups │    40%     │      0%     │ 🟡 Pending (Mock Simulation)│
│ Super Admin SaaS Auto-Billing │    30%     │      0%     │ 🟡 Pending (Needs Checkout) │
│ Live Supabase PostgreSQL Sync │    85%     │     10%     │ 🟡 Pending (Run SQL & .env) │
│ WhatsApp / SMS Cloud Gateway  │    60%     │      0%     │ 🟡 Pending (wa.me link only)│
│ Physical Biometric Machine SDK│    50%     │      0%     │ ⚪ Optional (QR is working) │
└───────────────────────────────┴────────────┴─────────────┴─────────────────────────────┘
```

---

## 2. The Two-Tier Payment System Blueprint

### 🏛️ Tier 1: SaaS Subscription Billing ("Payment for YOUR Website")
- **Who Pays Whom**: School Administrators & Coaching Academies pay **YOU** (the Platform Owner).
- **Purpose**: Monthly/Annual platform access licenses (Starter: ₹1,999/mo, Pro: ₹4,999/mo, Enterprise: ₹9,999/mo).
- **Target Account**: Connected to **your company's** Master Razorpay/Stripe Account.
- **Workflow**:
  1. School signs up via `#/signup` or Super Admin provisions institution.
  2. School reaches trial expiry (30 days) or renewal date.
  3. School Admin clicks **"Renew License"** in their dashboard.
  4. Razorpay Subscriptions auto-debits their card or prompts UPI payment.
  5. Webhook updates `tenant.subscriptionRenewalDate` and sets `tenant.status = 'active'`.

---

### 🏫 Tier 2: School Fee Collection System ("Payment System for OTHER Schools")
- **Who Pays Whom**: Parents and Students pay **THEIR INDIVIDUAL SCHOOL**.
- **Purpose**: Academic Tuition Fees, Bus Transport, Hostel/Mess, Admission & Exam Fees.
- **Target Account**: Connected to **EACH SCHOOL'S OWN** Bank Account via BYOK (Bring Your Own Key).
- **Why BYOK is Required**:
  - **Zero Legal/RBI Liability**: You do not hold or escrow school tuition funds.
  - **Zero Tax Entanglement**: School tuition is GST-exempt (0%), while SaaS is 18% GST.
  - **Direct Settlement**: Funds settle directly into the school's bank within 24 hours.

---

## 3. Comprehensive Pending Tasks Checklist

### 🔴 Priority 1: Critical (Must-Have Before Real Payments & Production)

- [x] **Task 1.1: School Payment Gateway Credentials UI**
  - **File**: `src/modules/settings/SettingsModule.tsx`
  - **Status**: 🟢 **COMPLETED**
  - **Details**: Dedicated **"💳 Payment Gateway & Banking"** tab added to Institution Settings. Allows School Admins to configure Razorpay Key ID, Key Secret, Webhook Secret, TEST/LIVE mode toggle, direct settlement bank accounts, and accepted payment instruments.

- [x] **Task 1.2: Tenant Schema & Storage Extension for Payment Config**
  - **Files**: `src/types/index.ts`, `src/services/mockData.ts`, `src/modules/fees/FeesModule.tsx`
  - **Status**: 🟢 **COMPLETED**
  - **Details**: Added `TenantPaymentConfig` interface and field to `TenantConfig`. Configured initial school and coaching tenants with gateway configurations. Added live gateway status indicator and mode badge directly inside the Cashier Fee Collection Desk.

- [ ] **Task 1.3: Real Razorpay Client-Side SDK Integration (`checkout.js`)**
  - **Files**: `index.html`, `src/services/razorpayService.ts`, `src/modules/fees/FeesModule.tsx`
  - **Details**:
    - Dynamically load `https://checkout.razorpay.com/v1/checkout.js`.
    - When parent clicks **"Pay Online via UPI/Card"**, fetch the school's `razorpayKeyId`.
    - Instantiate `new window.Razorpay(options)` with student details, fee invoice number, and callback handler.
    - On `handler(response)`, record `paymentId`, `orderId`, and `signature` in the student fee ledger.

- [ ] **Task 1.4: Super Admin SaaS Checkout & Subscription Flow**
  - **Files**: `src/modules/superadmin/SuperAdminShell.tsx`, `src/modules/superadmin/SuperAdminModule.tsx`
  - **Details**:
    - Replace static SaaS pricing tier cards with an active **"Upgrade / Subscribe"** action.
    - Connect platform owner's Razorpay standard checkout for platform license fees.
    - Auto-extend `subscriptionRenewalDate` on successful payment.

---

### 🟡 Priority 2: High (Cloud Backend & Data Persistence)

- [ ] **Task 2.1: Supabase Live Database Connection**
  - **Files**: `.env`, `src/services/supabaseClient.ts`, `PLATFORM_GUIDE.md`
  - **Details**:
    - Create a Supabase project at [supabase.com](https://supabase.com).
    - Execute SQL scripts in the Supabase SQL Editor:
      1. `supabase/schema.sql` (Creates all 40+ relational tables).
      2. `supabase/rls_policies.sql` (Enables Row-Level Security for multi-tenant isolation).
      3. `supabase/seed.sql` (Initial demo institutions, classes, and subjects).
    - Populate `.env`:
      ```env
      VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
      VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
      VITE_ENABLE_LIVE_DB=true
      ```

- [ ] **Task 2.2: Server-Side Webhook Receiver (Supabase Edge Function / Node API)**
  - **Files**: `supabase/functions/razorpay-webhook/index.ts`
  - **Details**:
    - Listen for `payment.captured`, `payment.failed`, and `subscription.charged`.
    - Validate HMAC-SHA256 signature using `crypto.createHmac('sha256', secret)`.
    - Update `payment_transactions` status to `SUCCESS` and mark student invoice as `PAID`.

---

### 🟠 Priority 3: Medium (Communications & Hardware Integrations)

- [ ] **Task 3.1: Transactional WhatsApp / SMS Gateway API**
  - **Files**: `src/modules/communication/CommunicationModule.tsx`, `src/services/api/endpoints.ts`
  - **Details**:
    - Currently, the app generates `https://wa.me/` direct links.
    - Integrate a backend cloud WhatsApp provider (Twilio API, Gupshup, or Aisensy) for automated background pushes:
      - Absent student alert sent to parent at 09:15 AM.
      - Fee due reminder sent 3 days before installment due date.
      - Instant fee payment receipt confirmation with download link.

- [ ] **Task 3.2: Automated Nightly Cron Operations**
  - **Details**:
    - **Late Fee Calculation**: Cron job running at midnight checking overdue fee ledgers and applying daily late fine (e.g., ₹50/day).
    - **Batch Payroll Generator**: Runs on 1st of every month to compute monthly salaries based on biometric attendance days.
    - **Hostel Curfew Audit**: Flags unreturned gate outpasses after 10:00 PM.

- [ ] **Task 3.3: Biometric Hardware Gateway (Optional - QR Scanner already working)**
  - **Details**:
    - Build a local lightweight Node.js daemon service to pull punch logs from physical LAN biometric devices (ZKTeco / eSSL) and push them via REST API to EduNexus.

---

### 🟢 Priority 4: Low (Polish & Operations)

- [ ] **Task 4.1: Custom Domain Mapping for Institutions**
  - Allow schools on the Enterprise tier to point their own custom domain (e.g., `portal.delhischool.edu`) to the EduNexus multi-tenant router.
- [ ] **Task 4.2: Audit Trail Export to PDF / Excel**
  - Enable 1-click regulatory compliance export of the security audit log for school boards and auditors.
- [ ] **Task 4.3: End-to-End Cypress / Playwright Test Suite**
  - Add automated UI test scripts for fee payment, report card generation, and student enrollment flows.

---

## 4. Recommended 3-Phase Execution Plan

```text
┌───────────────────────────────┐     ┌───────────────────────────────┐     ┌───────────────────────────────┐
│            PHASE 1            │     │            PHASE 2            │     │            PHASE 3            │
│   Payment Settings & SDK      │ ──> │    Live Supabase Database     │ ──> │      Cloud SMS & Crons        │
│          (1 - 2 Days)         │     │         (1 - 2 Days)          │     │          (2 - 3 Days)         │
├───────────────────────────────┤     ├───────────────────────────────┤     ├───────────────────────────────┤
│ • Add Payment Gateway Tab to  │     │ • Configure Supabase .env     │     │ • Connect WhatsApp Cloud API  │
│   SettingsModule.tsx          │     │ • Run SQL DDL Schema & RLS    │     │ • Auto-calculate late fines   │
│ • Save School Razorpay Keys   │     │ • Test Multi-Device Sync      │     │ • 1-Click Batch Salary Run    │
│ • Integrate Razorpay popup    │     │ • Deploy Webhook Edge Function│     │ • Custom School Subdomains    │
└───────────────────────────────┘     └───────────────────────────────┘     └───────────────────────────────┘
```

---

## 5. Summary: What Can Be Implemented Right Now?

We can begin immediately with **Phase 1: Payment Gateway Settings & Integration**:
1. Add the **"Payment Gateways & Banking"** tab inside `SettingsModule.tsx`.
2. Allow School Admins to save their **Razorpay Key ID & Key Secret** (with Test/Live mode toggle).
3. Connect the **Fee Collection Desk** in `FeesModule.tsx` to launch the live Razorpay Checkout modal when paying online.

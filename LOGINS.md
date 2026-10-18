# 🎓 EduNexus ERP — Manual Login Credentials & Testing Guide

This document lists all pre-configured, active accounts available for manual testing across the EduNexus Multi-Tenant ERP platform.

---

## 🌐 Quick Access Links

| Application Surface | URL | Notes |
| :--- | :--- | :--- |
| **Frontend Web App** | **[http://localhost:5173](http://localhost:5173)** | Public Marketing Landing Page |
| **Direct Sign In Page** | **[http://localhost:5173/#login](http://localhost:5173/#login)** | Universal Login View |
| **Super Admin Console** | **[http://localhost:5173/#super-admin](http://localhost:5173/#super-admin)** | Multi-Tenant Platform & SaaS Console |
| **Backend API Base** | **[http://localhost:5000/api/v1](http://localhost:5000/api/v1)** | Express REST API |
| **Backend Health Check** | **[http://localhost:5000/health](http://localhost:5000/health)** | Database Connection & Health (`HTTP 200`) |

---

## 🔑 Master Credentials Table

| Role | Name | Email (Username) | Password | Default Tenant | Key Access / Modules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Administrator** | Platform Super Admin | `admin@edunexus.com` | `EduNexus2026!Admin` | *Global Platform* | Tenant Onboarding, SaaS Proofs, QR Settings, Audit |
| **Super Administrator (CI)** | CI System Admin | `ci-admin@edunexus.example.test` | `EduNexusCI2026!Pass` | *Global Platform* | Automated Testing & System Overrides |
| **School Owner / Principal** | Dr. Arthur Mitchell | `schooladmin@ci-academy.test` | `EduNexus2026!School` | CI Automation Academy | All School Modules, SaaS Plan Subscription & QR Upload |
| **Senior Teacher** | Prof. Sarah Jenkins | `teacher@ci-academy.test` | `EduNexus2026!Teacher` | CI Automation Academy | Attendance, Gradebook, Homework, Academics |
| **Chief Accountant** | Robert Vance | `accountant@ci-academy.test` | `EduNexus2026!Account` | CI Automation Academy | Fee Structures, Payment Proofs, Receipts, Finance |
| **Administrative Staff** | Emily Davis | `staff@ci-academy.test` | `EduNexus2026!Staff` | CI Automation Academy | Student Records, Library, Inventory, Transport |
| **Parent Account** | David & Laura Johnson | `parent@ci-academy.test` | `EduNexus2026!Parent` | CI Automation Academy | Parent Portal, Fee Receipts, Student Results |
| **Student Account** | Alex Johnson | `student@ci-academy.test` | `EduNexus2026!Student` | CI Automation Academy | Homework Submissions, Timetable, Examination Marks |

---

---

## 🚀 NEW: Public School Onboarding Questionnaire & Offline QR Payment Flow

As requested, new schools and coaching academies **do not** receive free unauthenticated access. Instead, prospective institutions must subscribe first before gaining access to the ERP:

```
[Public Landing Page / Pricing] 
       │
       ▼ Click "Start 14-Day Free Trial" / "Choose Starter"
[Step 1: Institute Onboarding Questionnaire]
   • Institute Name & Type (K-12 School / Coaching)
   • Estimated Student Count
   • Admin / Owner Name, Email, Phone, and Password
   • Functionalities Needed (Admissions, Attendance, Fees, CBSE Cards, etc.)
   • "Why do you want to use EduNexus?"
       │
       ▼ Click "Proceed to Bank & QR Payment"
[Step 2: Platform Bank Details & Dynamic UPI QR Code]
   • Live Dynamic UPI QR Code (Scannable via GPay, PhonePe, Paytm, BHIM)
   • Platform Payee Name, HDFC Bank Account Number, IFSC, UPI ID (with 1-click Copy)
   • Enter Transaction Reference (UTR / UPI Ref Number)
   • Upload Payment Screenshot
       │
       ▼ Click "Submit Application & Payment Proof"
[Tenant Created in 'pending_approval' State]
   • Administrator credentials are saved
   • Institute access is strictly GATED: Attempting to sign in returns:
     "Your institute subscription payment is awaiting Super Admin verification."
       │
       ▼ Super Admin Logs In (`admin@edunexus.com`)
[Super Admin Review in SaaS Console (`#/super-admin/saas`)]
   • Opens "Payment Proofs"
   • Clicks Preview: Sees receipt AND the complete Onboarding Questionnaire answers
   • Clicks "Approve & Activate School ERP"
       │
       ▼
[Institution Activated & Subscription Created]
   • School Owner / Principal signs in immediately with their chosen credentials
   • Granted 100% full access to all ERP modules!
```

---

## 📱 How to Test the New QR-Based Subscription & Approval Workflow

### Option A: Prospective School (Public Self-Onboarding)
1. Open the landing page at `http://localhost:5173/#/` (or click *"Choose a Plan & Subscribe"* from the login page).
2. Scroll to the **Pricing Plans** and click **"Start 14-Day Free Trial"** or **"Choose Starter"**.
3. Complete the **Step 1 Questionnaire**:
   - Institute Name: e.g., `St. Xavier's International School`
   - Institute Type: `K-12 School` or `Coaching Academy`
   - Estimated Students: `500`
   - Administrator Name: `Father Thomas`
   - Administrator Email: `thomas@stxaviers.edu`
   - Login Password: `Password123!`
   - Check the functional modules your school requires.
   - Enter reason: *"Automate fees and generate CBSE marksheets."*
4. Click **"Next: Scan QR & Pay Platform Subscription"**.
5. In **Step 2**:
   - Scan the generated UPI QR code with any UPI app, or copy the platform bank account details.
   - Enter your UTR reference: e.g., `UPI/XAVIER/20261018`
   - Upload your payment screenshot.
   - Click **"Submit Subscription & Proof"**.
6. The confirmation screen confirms submission.
7. Try signing in as `thomas@stxaviers.edu`:
   - System **blocks** access with a 403 status: *"Your institute subscription payment is awaiting Super Admin verification. You will be activated once approved."*
8. Sign in as Super Admin (`admin@edunexus.com` / `EduNexus2026!Admin`):
   - Go to `http://localhost:5173/#/super-admin/saas`.
   - In the **Payment Proofs** tab, inspect the questionnaire responses and receipt image.
   - Click **"Approve & Activate School ERP"**.
9. Sign in as `thomas@stxaviers.edu`:
   - Instant access to the active School Admin Dashboard with all modules unlocked!

---

### Option B: Existing Active School (Renew or Upgrade Plan)
1. Log in at `http://localhost:5173/#login` as **School Owner**:
   - **Email:** `schooladmin@ci-academy.test`
   - **Password:** `EduNexus2026!School`
2. Navigate to **SaaS Billing** (`http://localhost:5173/#/app/saas-billing`).
3. You will see the 3 available tiers:
   - **Starter Plan** (₹2,999/month)
   - **Growth Plan** (₹6,999/month)
   - **Enterprise Plan** (₹59,999/year)
4. Click **"Choose & Pay via QR / Bank"** on any plan.
5. In the modal:
   - A dynamic **UPI QR Code** is generated for the exact plan price and official platform payee.
   - Bank details (Account Number, IFSC, Payee Name) are shown with one-click **Copy** buttons.
   - Enter your transaction reference (UTR) and upload the receipt screenshot.
   - Click **"Submit Payment Proof"**.
6. The panel updates to show **"Payment Verification In Progress (Pending Super Admin Approval)"**.

---

### Step 3: Direct Management & Cancellation ("Cancel / Revoke Panel")
- As a **School Owner**: In `SaaS Billing`, you can click **"Cancel Request"** while a proof is pending, or **"Cancel Subscription"** when active.
- As a **Super Admin**: Under the **"Tenant Subscriptions"** tab in the Super Admin console, click **"Cancel / Revoke Panel"** to immediately revoke or suspend an institute's access, or click **"Reactivate Access"** to restore it.
- As a **Super Admin**: Under the **"Platform Bank & QR Details"** tab, you can update your institute payee name, bank account number, IFSC code, UPI ID, and instructions at any time.

---

## 🛠 Role-by-Role Feature Matrix

| Feature / Screen | Super Admin | School Owner | Teacher | Accountant | Staff | Parent | Student |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Super Admin Platform Console** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SaaS Subscription Proofs & QR Settings** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SaaS Plan Checkout & Upload** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Student Lifecycle & Enrollment** | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Fee Structures & Invoices** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Parent Payment Proof Verification** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Daily Attendance Marking** | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Examinations & Report Cards** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Timetable Management** | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Staff HR & Payroll** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Library & Inventory Operations** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Parent Portal (Fees & Results)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Student Portal (Homework & Marks)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 💡 Troubleshooting & Notes

- **CORS / API URL:** The frontend communicates with `http://localhost:5000/api/v1`. Ensure the backend service is running on port 5000.
- **Session Renewal:** If your session expires or a role is switched, click the user profile icon in the sidebar to log out, or navigate directly to `http://localhost:5173/#login`.
- **Database Persistence:** All fixtures, subscriptions, payments, and student records are persisted in PostgreSQL on `127.0.0.1:5432/edunexus_erp`.

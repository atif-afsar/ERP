# FEATURE MAP - EduNexus ERP
## 1. Academic Structure
- **Logic:** Dynamic hierarchy (School: Class -> Section | Coaching: Batch).
- **Verification:** Ensure `tenant_type` correctly toggles UI labels.

## 2. Student Information System (SIS)
- **Logic:** Digital Dossiers with QR Gate Pass generation.
- **Verification:** Check that QR codes contain cryptographic identity tokens.

## 3. Attendance & Gate Pass
- **Logic:** Three-mode tracking (Daily, QR-Scan, Period-wise).
- **Verification:** Test real-time sync between the scanner and the admin dashboard.

## 4. Fees & Billing Engine
- **Logic:** Template-based fee assignment (Annual, Quarterly, Monthly).
- **Verification:** Validate that concessions/scholarships are applied correctly before invoice generation.

## 5. Payments & Receipts
- **Logic:** Multi-mode transaction support with instant PDF receipting.
- **Verification:** Ensure `Idempotency-Key` prevents double payments.

## 6. Examination & Grading
- **Logic:** Automated grade computation (CBSE scale vs Percentile Rank).
- **Verification:** Test rank computation logic for Coaching batches.

## 7. CRM & Admissions
- **Logic:** Lead pipeline (Inquiry -> Tour -> Assessment -> Enrolled).
- **Verification:** Check lead-to-student conversion trigger.

## 8. Super Admin Platform
- **Logic:** Cross-tenant management and feature-flag toggling.
- **Verification:** Ensure Super Admin can impersonate tenants for auditing.

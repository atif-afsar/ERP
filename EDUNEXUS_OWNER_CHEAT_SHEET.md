# Owner demo cheat sheet

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## Eight roles

| Role | Responsibility |
|---|---|
| SUPER_ADMIN | Institutions and SaaS plans |
| TENANT_ADMIN | Whole school setup/operations |
| ADMIN | Delegated grants; fixture views master data |
| TEACHER | Assigned timetable/attendance/marks; own HR |
| ACCOUNTANT | Fee verification/receipts/school books |
| PARENT | Linked children/dues/proofs/receipts |
| STUDENT | Current limited dashboard |
| STAFF | Own leave/HR and dashboard |

## Main modules and student flow

Master Data → Students/Parents/Enrollment → Staff/Teacher Assignments → Timetable/Attendance → Exams/Results → Fees → Finance → Notifications. Optional HR, Library, Inventory, Transport, Hostel, Mess. Users & Access grants responsibilities.

## Three money systems

Parent → School: external QR/UPI → proof PENDING → bank check → APPROVED → receipt/balance/school journal. School → EduNexus: separate SaaS subscription; live provider creation/cancellation incomplete. School books: balanced journals, expenses/income/books/reports.

10000 due → 4000 approved → PARTIAL/6000 remaining → 6000 approved → PAID/0. Pending/rejected proof does not reduce verified due. Never repost fees as Other Income.

## Ten supported selling points

1. Separate institution workspaces.
2. Backend-authorized role grants.
3. Permanent student identity and enrollment history.
4. Multiple children per linked Parent.
5. Assignment-aware teacher work.
6. Enrollment-based attendance/assessment.
7. Manual fee verification with server balances.
8. Collection-linked receipts/accounting.
9. Durable notifications/audit foundation.
10. Shared identities across operations.

## Do not claim yet

Live recurring Razorpay/provider cancellation; Razorpay tuition checkout; real email/SMS in LOG mode; OTP reset; full Student portal; offline writes; hidden CRM/homework/health prototypes; automatic billing for every operation; GPS/QR scanning; polished PDF without working export; open-source license or production readiness solely from local certification.

## Demo order — 28 minutes

Owner opening 2 → concept 2 → Super Admin 3 → Owner setup/student 5 → Teacher 3 → Parent/Accountant fee+journal 7 → exam/result 2 → finance/optional operations 2 → closing 2.

## Before starting

Browser: http://127.0.0.1:5191/#/login. Credentials off-screen. Prepare fresh due, unique DEMO proof, teacher roster and completed exam. Owner first. Current Accountant has Dashboard/Fees/Finance; notices as Owner. See ROLE_LOGIN_GUIDE.md for startup.

## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.

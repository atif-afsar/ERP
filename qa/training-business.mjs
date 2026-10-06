import {write} from './training-guides.mjs';
const modules=[
['Multi-tenancy','A separate workspace per institution','Super Admin and Owner','School separation','Tenants & Schools','Inspect school/status','Institution and owner','Scoped users/business records','Springfield and another school have separate students','Privacy and independent administration'],
['School setup','The institution profile and structure','Owner; limited Admin can view','Consistent shared choices','Master Data: Profile, Years, Branches, Classes','Maintain profile/year/class/section','School details','Enrollment/timetable/exam/fee choices','2026–27, Main branch, Class 5-A','Avoids inconsistent repeated setup'],
['Academic structure','Subjects and teaching responsibility','Owner','Knowing what is taught by whom','Master Data: Subjects, Assignments','Create subject; link teacher/class/year','Staff, subjects and structure','Teacher access and scheduling context','Ms. Sharma teaches Mathematics in Class 5','Defined academic responsibility'],
['Student lifecycle','Permanent identity with yearly enrollment history','Owner or granted admissions operator','Retaining history across years','Students: admission, directory, profile, enrollment, documents','Admit/search/update/enroll; record document metadata','Student, guardian and academic context','Attendance/exam rosters and fee assignments','Aarav keeps his identity next year','Reliable student history; document metadata alone is not a secure file-storage service'],
['Parent relationship','Guardian records connected to children and a login','Owner and Parent','Family-only access without duplicated accounts','Students parent links; Fees parentAccess; Parent fees','Link children; invite/link user; switch child','Guardian identity and student relationships','Own children dues/proofs/receipts/notifications','Imran sees Aarav and a sibling','Multi-child access with family privacy'],
['Teacher lifecycle','Staff identity, teacher profile, account and assignment','Owner and Teacher','Connecting employee identity with teaching scope','Staff & Teachers; Master Data Assignments','Create profile/account via invitation; assign subject/class/year','Employee identity and invitations','Timetable, attendance, marks, own HR','Ms. Sharma has one assigned teaching group','Actual responsibilities drive access'],
['Timetable','Teaching lesson slots','Owner; Teacher views permitted work','Organizing lessons without conflicts','Timetable','Configure/view valid lesson slots','Year, class/section, subject and teacher','Shared schedule','Maths Monday 10:00','Organized daily teaching'],
['Attendance','Daily enrollment-linked presence','Assigned Teacher; Owner','Recording attendance correctly','Attendance & QR roster and selectors','Choose year/class/section/date; mark/save','Academic enrollment','Attendance history and supported absence notifications','Aarav ABSENT on a practice date','Traceable records; QR menu label alone is not working QR-scanning proof'],
['Examinations','Exam definition and subject schedules','Owner and assigned Teacher','Consistent assessment organization','Examinations: Exams, Schedules, Marks, Grades','Define exam/date; schedule subjects; enter valid marks','Year/enrollment/subjects/teacher assignments','Validated marks for results','Aarav has Mathematics 80/100','Controlled academic assessment'],
['Results','Calculated totals/grades and report-card foundation','Owner and assigned Teacher within grants','Readable consistent performance','Examinations Results and Report','Configure grading; review and publish valid result','Schedules and enrolled student marks','Published result/report data and supported notifications','Grade comes from configured rules','Meaningful results; do not promise a polished PDF export without a working action'],
['Fees','Enrollment dues and manually verified collections','Owner, Accountant, linked Parent','Tracking owed versus received money','Fees & Payments; Parent fee portal','Structure/assign/settings; proof/review/receipt','Academic year, enrollment, installment, proof','Verified payments, balance, receipt, notification, journal','10000 due; 4000 approved; 6000 remains','Controlled fee-to-accounts linkage'],
['School accounting','School financial books','Owner and Accountant','Knowing income/expenses/cash movements','Finance accounts/journals/ledger/books/reports/reconciliation','Inspect entries; post expense/other income; reconcile fees','Verified collections and vouchers','School financial books','5000 fee produces equal debit/credit','Money explained, not just receipt lists'],
['Communications','Stored notices and delivery jobs','Owner; other users only with grants','Traceable communication','Notice & SMS; notifications; delivery history','Send authorized notice and inspect delivery','Recipients/templates/business events','In-app inbox and delivery records','Fee approval notifies family','Durable foundation; local email is LOG and SMS delivery is not implied by its label'],
['HR','Staff leave balances/requests/attendance','Staff/Teacher self-service; Owner approves','Managing employee absence','HR & Leave','Configure balances; request/review leave','Linked staff user and leave rules','Approved leave and supported attendance/notifications','Ms. Sharma requests one day','Employee leave is separate from student attendance'],
['Library','Catalog, physical copies and circulation','Authorized school operator, Owner in this fixture','Knowing who holds a copy','Library catalog and circulation','Add title/copy; issue/return/mark lost','Available physical copy and student/staff borrower','Loan/copy state','Aarav borrows then returns a copy','Prevents simultaneous duplicate issue'],
['Inventory','Item/location stock movements','Authorized school operator','Controlling available stock','Inventory items/categories/movement','Receive/issue/return/adjust stock','Item/location/quantity/reason','Movement history and stock balance','Receive 10 notebooks; issue 3; stock 7','Negative stock prevention, no invented procurement/accounting integration'],
['Transport','Fleet/routes/stops/allocations','Authorized school operator','Knowing student route use','Transport & Fleet','Configure route/stop; allocate/end student','Student, route and vehicle capacity','Transport allocation history','Aarav joins Route 1 at Main Gate','Capacity-aware allocation, no live GPS claim'],
['Hostel','Residence buildings/rooms/beds','Authorized school operator','Avoiding conflicting allocations','Hostel Residence','Configure room; allocate bed; check out','Student and available bed','Occupancy/history','Aarav gets one free bed','No simultaneous double-booking'],
['Mess','Meal plans, menus and dining membership','Authorized school operator','Organizing dining subscriptions','Hostel Mess & Dining','Create plan/menu; enroll/end member','Meal plan/dates/student or eligible staff','Dining membership and menu','Aarav joins hostel meal plan','Clear membership, no automatic food-charge claim'],
['Organization/RBAC','Accounts, memberships, roles, grants, invitations','Owner; Super Admin at platform scope','Restricting each person to their job','Users & Access','Invite/assign granted role/inspect permissions','Identity and membership','Authenticated access and durable audit events','Admin can view profile but cannot verify fees','Accountability; some API finance gates require canonical roles too'],
['SaaS subscription','School purchase of EduNexus service','Owner subscribes; Super Admin manages plans','Controlling software-service access','Subscription Plans; SaaS Subscription','Inspect plans/status/access; explain recovery','Subscription/provider events/paid-through dates','Operational entitlement, separate platform records','School software bill differs from student tuition','Provider creation/cancellation are placeholders; not live demonstrated']
];
let h='## What problem does EduNexus solve?\n\nSchools repeat the same student, parent, employee and payment information in disconnected registers. EduNexus connects those responsibilities in one school workspace, with different access for each person and separate workspaces for different institutions. Admission feeds enrollment; enrollment feeds academic work and fees; approved collection feeds receipts and school accounts.\n\n## How modules connect\n\nSchool setup → student/enrollment → teacher work → assessment → fee dues → verified collection → receipt → journal → notification. Library and transport reuse identities; not every operation automatically posts accounting or creates a fee.\n\n';
for(const m of modules)h+='## '+m[0]+'\n\n1. **What it is:** '+m[1]+'.\n2. **Who uses it:** '+m[2]+'.\n3. **Problem solved:** '+m[3]+'.\n4. **Important screens:** '+m[4]+'.\n5. **Important actions:** '+m[5]+'.\n6. **Data in:** '+m[6]+'.\n7. **Data out:** '+m[7]+'.\n8. **Real-life example:** '+m[8]+'.\n9. **Why school cares:** '+m[9]+'.\n\n';write('EDUNEXUS_OWNER_HANDBOOK.md','EduNexus owner handbook',h);
write('EDUNEXUS_PAYMENT_AND_FINANCE_GUIDE.md','Three money systems',`## Who pays whom?

| System | Payer → recipient | Main records |
|---|---|---|
| A: School fees | Parent → SCHOOL | Enrollment due, verified collection, receipt |
| B: SaaS | School → EDUNEXUS | Software plan, subscription, entitlement |
| C: School accounts | School's own financial books | Balanced journal/vouchers/ledger |

## A — School fee collection: practise this first

1. **Owner → Fees → settings:** school payee, UPI/instructions and demo QR. Never use a real-payable QR in training.
2. **Owner → structures:** select year/class, fee items, due date and amount. Structure is a template, not payment.
3. **Owner → assign:** select student's enrollment and structure; valid concession/installments. Installments divide the obligation.
4. Confirm Parent is linked to the child using Students parent relationship and Fees → parentAccess invitation/linking.
5. **Parent → Fees → Select Child:** inspect due and payment instructions.
6. Parent would pay the SCHOOL externally by UPI/bank channel. Rehearsal uses fictional evidence only; no real transfer.
7. **Parent → Submit Payment Proof:** select due/installment, valid amount, unique reference, date and screenshot/PDF. Proof becomes PENDING. Verified outstanding remains unchanged.
8. **Accountant → verify → View:** check bank/UPI receipt against amount, recipient, date and reference. A screenshot can be forged; it is not sufficient bank confirmation.
9. **Approve** only after matching received funds. Backend rechecks remaining balance within the approval transaction, creates verified payment/receipt and finance linkage. **Reject** with a reason otherwise; no verified collection is created.
10. Refresh Parent dues/receipts and Finance Journals. Supported notifications are queued; local email delivery is LOG and in-app jobs are processed by the worker.

Direct posting is disabled because it bypasses verification and can invent collected money. Approval is the point where collection, remaining balance, receipt and accounts must agree.

### Partial-payment practice

Prepare a NEW fictional enrollment assignment with ₹10,000 due; existing seeded assignments may be paid. Submit ₹4,000 proof: PENDING, verified due still ₹10,000. Approve: ₹4,000 verified, ₹6,000 outstanding, PARTIAL. Submit and approve another ₹6,000 with a different reference: total ₹10,000, outstanding ₹0, PAID. Each approval has its own receipt. DUE means no verified collections; PARTIAL means some but not all; PAID means zero outstanding.

Server calculates balances; browser numbers cannot authorize payment. Two pending proofs are not two verified collections and do not promise reservation of the outstanding balance. If another approval consumes remaining balance first, the later approval is rejected when it exceeds current remaining.

| Situation | Expected explanation |
|---|---|
| Overpayment | Submission/approval rejected; no excess verified collection |
| Duplicate same-school reference | Conflict rejected; use new DEMO reference each rehearsal |
| Already paid fee | No positive proof accepted against zero outstanding |
| Rejected proof | Rejected status/reason; due unchanged; corrected evidence needs a valid unique reference |
| Approved proof | Verified payment, receipt, recalculated balance and supported finance/notification linkage |
| Repeated approval | Does not produce another payment or receipt |

**Parent:** linked children only, dues, instructions, own proof status/receipts. **Accountant:** granted verification queue, balances, receipts and school books. **Owner:** school settings/structures/assignments/parent accounts and oversight. **Ledger:** verified collections, not pending screenshots.

## B — SaaS: school pays EduNexus

Conceptual provider flow: Super Admin plan → Owner chooses → provider subscription → checkout → signature-verified webhook → subscription/paid-through date → server entitlement.

**Current limit found in source:** subscription creation generates a local placeholder ID; it does not call Razorpay to create a subscription. Cancellation changes a local flag rather than cancelling with the provider. Checkout SDK hook and signed webhook/state handling exist, but real credentials alone do not complete these missing provider operations. Do not press Subscribe on the shared training school: a PENDING subscription can replace its no-subscription onboarding entitlement and interrupt lessons. Show catalog and explain rules only.

| State | Current entitlement meaning |
|---|---|
| TRIALING | Access before valid trial-end, falling back to configured period-end |
| Onboarding grace | 14 days from creation for new tenant with NO subscription; not renewal grace |
| ACTIVE | Access only while a valid paid-through timestamp is in future |
| EXPIRED | Boundary passed; records retained, operational routes gated |
| CANCELLED | Existing paid-through time remains usable until its boundary |
| PAST_DUE / PAUSED | No operational entitlement under current evaluation |
| PENDING | Not verified active; no paid entitlement |
| Legacy | No-subscription institution created before 1 October 2026 has current legacy allowance; not lifetime access for every school |

Do not invent an ACTIVE → renewal GRACE → EXPIRED period. Grace is specifically onboarding without a subscription. Authentication, notifications shell and Owner own-school billing recovery remain accessible when operational entitlement ends. Super Admin platform access is exempt; school finance still needs valid tenant scope. School/account suspension is a separate restriction.

Browser callback can be forged/replayed and must not activate a subscription. It refreshes status. A signed provider event matched to subscription and period data is the trusted activation input. Real checkout, recurring charging, genuine webhook delivery, provider cancellation and settlement are NOT demonstrated. No live keys used.

## C — School finance/accounting

School fees belong to the SCHOOL ledger. SaaS receipts belong to EduNexus platform revenue and must not be credited to school fee income. If the school later records software cost, that is an authorized school expense, not automatic SaaS webhook income in school books.

Double-entry: each event has two equal sides. Debit/credit describe account movement, not good/bad outcomes.

| Event | Debit | Credit |
|---|---|---|
| Verified fee ₹5,000 | Cash/Bank/Collection ₹5,000 | Fee Income ₹5,000 |
| Stationery bought ₹1,000 | Stationery Expense ₹1,000 | Cash/Bank ₹1,000 |
| Other income ₹2,000 | Cash/Bank ₹2,000 | Other Income ₹2,000 |

**Chart of Accounts:** named buckets for money/income/expenses. **Journal:** one dated event/source. **Journal Lines:** individual debit/credit movements. **General Ledger:** movements grouped by account. **Cash/Bank Book:** movement in cash/bank accounts. **Income/Expense Report:** period revenue/expenses, not an automatic complete statutory/tax return. **Reconciliation:** checks verified fee-to-journal linkage and supported missing links without reposting the same source; it does not verify screenshots against a bank API.

Practice: Accountant → Finance → Journals → find approval → General Ledger → Cash/Bank Book → Income/Expense Report → Fee Reconciliation. Never repost an approved fee as Other Income.
`);
console.log('Business handbook and three-money-system guide created.');

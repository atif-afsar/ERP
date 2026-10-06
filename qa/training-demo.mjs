import {write} from './training-guides.mjs';
const journey=[['SUPER_ADMIN','Tenants & Schools','Create school and owner invitation via supported onboarding','School and Owner membership exist; local email is LOG only'],['TENANT_ADMIN','Master Data → Years / Branches / Classes','Create 2026–27, Main branch, Class 5 and Section A','Enrollment choices become available'],['TENANT_ADMIN','Master Data → Subjects','Create Mathematics','Subject can be scheduled and assigned'],['TENANT_ADMIN','Staff & Teachers; Master Data Assignments','Create/link Ms. Sharma teacher account via invitation; assign Mathematics/Class 5/year','Teacher has academic scope'],['TENANT_ADMIN','Students admission','Admit Aarav Khan with unique admission number, Imran Khan parent, year/class/section','Permanent identity, parent relationship and enrollment saved'],['TENANT_ADMIN','Parent relationship; Fees → parentAccess','Invite/link Imran to parent record; reuse parent for another child if practising siblings','One account accesses only linked children'],['TENANT_ADMIN','Timetable','Create Ms. Sharma lesson slot in matching academic context','Nonconflicting teacher schedule'],['TEACHER','Attendance','Select assigned roster/date; mark Aarav PRESENT','Enrollment-linked daily record saved'],['TENANT_ADMIN','Examinations → Exams / Schedules / Grades','Create dated exam; schedule Mathematics within dates; configure grading','Valid assessment ready for marks'],['TEACHER','Examinations → Marks','Enter Aarav 80/100 for assigned subject','Validated marks, not yet published result'],['TENANT_ADMIN','Examinations → Results / Report','Review calculated result; publish valid completed assessment','Totals/grade follow configured rules; report-card foundation'],['TENANT_ADMIN','Fees → settings / structures / assign','Set fictional non-payable QR/instructions; assign 10000 to enrollment with installments','Parent sees obligation; no money received'],['PARENT','Fees','Imran submits fictional 4000 proof with unique DEMO reference','PENDING; verified due stays 10000'],['ACCOUNTANT','Fees → verify','Mr. Verma View/Approve after explaining bank matching','4000 verified; receipt; 6000 remaining; PARTIAL'],['ACCOUNTANT','Finance → Journals','Locate that approved fee source','4000 collection debit equals fee-income credit'],['PARENT','Fees / notification feed','Refresh balance/receipt and supported inbox notification','Approved receipt; no unrelated family records'],['PARENT then ACCOUNTANT','Same proof/approval flow','Submit/approve remaining 6000 with new reference','PAID; zero due; second receipt; no double-counting'],['TENANT_ADMIN','Library','Issue an available physical copy to Aarav; later return','Loan/copy state updates, no invented automatic fee'],['TENANT_ADMIN','Transport, if needed','Allocate Aarav to route/stop within capacity; end when appropriate','Allocation reuses student identity']];
write('EDUNEXUS_COMPLETE_STUDENT_JOURNEY.md','One complete school story','## Fictional cast\n\nAarav Khan (Student), Imran Khan (Parent), Ms. Sharma (Teacher), Mr. Verma (Accountant). These are teaching characters; this task did not create their accounts or business records. First practise on the existing sample school/child. Then create new clearly named PRACTICE rows through the UI if desired. No money is transferred.\n\n'+journey.map((s,i)=>'## '+(i+1)+'. '+s[0]+' — '+s[1]+'\n\n**Action:** '+s[2]+'.\n\n**Result and next link:** '+s[3]+'.\n').join('\n')+'\n## Remember\n\nAarav is permanent; enrollment tracks academic movement. Attendance/exams/fees use enrollment context. Library/transport reuse identity. A screenshot is not a payment; approval completes the collection. School SaaS subscription is another money flow.\n');
write('EDUNEXUS_FOR_SCHOOLS_AND_COACHING.md','Schools and coaching institutes',`## How schools can use EduNexus

Owner sets academic year/branch/class/section/subject, admits student and links parent, assigns teachers, configures timetable/attendance/assessment and fees, verifies collections and uses school accounts. Optional library/inventory/transport/hostel/mess share institutional identities. Users get actual grants for their roles.

## How coaching institutes can use the foundation

| School term | Coaching term | Existing foundation |
|---|---|---|
| Academic Year | Session | Academic year record |
| Class | Course/Class | Class record, not a full course-product engine |
| Section | Batch | Section within class |
| Teacher | Faculty | Teacher profile/assignments |
| Student | Learner | Identity and enrollment |
| Exam | Mock/Test | Subject assessment and schedule |
| Fees | Course Fee/Installments | Enrollment dues and manual proof verification |

Example: 2026–27 Session → JEE Preparation class → Evening Batch section → Mathematics faculty assignment → learner enrollment → timetable/attendance/test → installments.

**Existing V1 foundation:** academic groups, identities/parents, teacher assignment, enrollment, attendance, exam/results, manual fee collection and accounting. Some UI labels still say school/class; naming a record differently does not create a coaching-specific feature.

**Future customization:** dedicated coaching UI, rolling/overlapping course enrollments, independent course-product catalog, subject packages, entrance-ranking analytics, CRM conversion, online video courses and automated batch-transfer/marketing tools. Hidden prototype CRM/homework/health screens are not delivered transactional modules.
`);
const demo=[['Opening',2,'TENANT_ADMIN','Dashboard','Show school name','We connect admissions, teaching, collections and accounts in one institution workspace.','School workspace renders'],['Platform concept',2,'TENANT_ADMIN','Users & Access','Inspect roles without editing','Different people get different responsibilities; each institution has separate data.','Current grants visible'],['Super Admin',3,'SUPER_ADMIN','Tenants & Schools → Subscription Plans','Search school; open Create Plan and Cancel','We operate the platform; software subscription prices are separate from tuition.','Tenant/catalog visible; no provider checkout'],['School Owner',5,'TENANT_ADMIN','Master Data → Students → Staff','Show year/class/section, existing student enrollment/parent and teacher assignment','These shared records feed academic and fee work.','Connected records shown'],['Teacher',3,'TEACHER','Timetable → Attendance','Select prepared assigned roster/date; inspect or save one fictional mark','Teaching access follows assignments; roster follows enrollment.','Assigned schedule/roster visible'],['Parent + Accountant',7,'PARENT → ACCOUNTANT → PARENT','Fees → verify → receipts → Finance Journals','Submit prepared 4000 partial proof; switch role; View/Approve; refresh Parent; show journal','Pending evidence is not collected money. Approval links receipt, balance and accounts.','10000 due becomes PARTIAL with 6000 remaining; balanced 4000 journal'],['Exams/results',2,'TENANT_ADMIN','Examinations → Marks / Results / Report','Show a previously completed scheduled exam and published report','Assigned marks become calculated results through controlled publication.','Prepared valid result visible; do not build entire exam live'],['Finance/operations',2,'ACCOUNTANT; TENANT_ADMIN only if time','Finance Ledger; optional Library','Locate collection; optionally show existing loan','Fees feed accounts; physical operations share identities without invented automatic billing.','Equal debit/credit; optional copy state'],['Closing',2,'TENANT_ADMIN','Dashboard','Return and invite questions','This is the connected local school workflow. Live SaaS/provider and deployment are separate readiness steps.','Clear boundaries']];
write('SENIOR_DEMO_SCRIPT.md','28-minute senior demo','## Prepare privately\n\nKeep credentials off-screen and cheat sheet open. Use separate browser contexts for Owner, Teacher, Parent and Accountant. Prepare one NEW unpaid 10000 assignment for a linked sample child, a clearly fictional/non-payable QR/screenshot, unique reference, assigned teacher roster and completed published exam. Use LOG worker. No real money, email or provider checkout. Rehearse once; approvals persist, so prepare a fresh due/reference for the senior.\n\nRequested durations sum to 31 minutes. This schedule trims them to **28 minutes**. Skip optional Library if role switching is slow.\n\n'+demo.map((s,i)=>'## '+(i+1)+'. '+s[0]+' — '+s[1]+' minutes\n\n- **Login as:** '+s[2]+'.\n- **Open:** '+s[3]+'.\n- **Click:** '+s[4]+'.\n- **Say:** “'+s[5]+'”\n- **Why it matters:** shows responsibility and the module connection.\n- **Expect:** '+s[6]+'.\n').join('\n')+'\n## If rehearsal does not match preparation\n\nDo not invent success. Empty due/proof queue needs a new practice assignment/submission. Empty teacher roster needs Owner assignment/year/section check. Subscription block needs Owner recovery explanation, not DB edits or a provider payment. Password recovery is unavailable. Use prepared published exam rather than an incomplete assessment.\n');
const faq=[['What makes EduNexus different?','Connected responsibilities: enrollment feeds academics/fees; approved collections feed receipts and school accounts. Do not claim an unresearched competitive advantage.'],['Is data separated between schools?','Business access is tenant-scoped; the supplied local reports record isolation checks. This does not imply separate physical databases or immunity from every future defect.'],['Can teachers see fees?','The current Teacher fixture has no Fees/Finance access and cannot verify payments. Actual grants and API gates control access.'],['Can parents see other children?','Only children linked to their guardian account in that institution; several linked siblings are supported.'],['How do fee payments work?','External parent-to-school QR/UPI payment, proof submission, Accountant bank verification, then approval/receipt/balance.'],['Why not directly mark paid?','It bypasses verification and can invent collections. Controlled approval rechecks balance and avoids duplicate posting.'],['How does accounting work?','Equal debit/credit per financial event. Fees debit collection and credit fee income; expenses and other income use separate vouchers.'],['Is Razorpay used for school fees?','No. Manual QR/UPI verification is the current fee path. Razorpay scaffolding belongs to the separate school software subscription.'],['What happens when SaaS expires?','Operational access is gated; records remain. Owner can use own-school billing recovery; platform Super Admin is separate.'],['Is live SaaS billing complete?','No. Provider subscription creation/cancellation currently use placeholders/local flags. Genuine provider operations and live end-to-end integration need completion, beyond merely entering credentials.'],['Can coaching institutes use it?','The foundation maps session/course/batch to year/class/section. Specialized coaching/course/rolling-enrollment UI needs customization.'],['Can schools have different roles?','Yes, roles/grants are managed per school. Custom Admin here is limited; some APIs also require canonical roles.'],['Can I add modules later?','Further development is possible, but that is future work, not an existing delivered feature.'],['Is it open source?','Only claim an open-source license after owner license selection/file and publication prerequisites. Visible source alone does not grant a license.'],['Is it production ready?','The supplied report certifies a local release candidate. Production configuration, providers, backups/restore, monitoring and staging/live validation still require readiness work.'],['What remains before deployment?','Provider operations if needed; secure environment/uploads; DNS/TLS; monitoring; backups/restore; delivery providers and owner legal/publication decisions. Training does not perform these.'],['What if internet is unavailable?','No offline business-write mode is claimed. Browser operations need a reachable backend; local setup works only while its local services are reachable.'],['What if email is unavailable?','Durable jobs/status exist; local email is LOG only. Real delivery needs a configured provider and operational handling. Do not say a real email was sent.'],['What if Razorpay is unavailable?','Manual school fees are a different workflow. SaaS checkout cannot complete; browser callback cannot grant unverified paid entitlement.'],['Can users recover passwords through OTP?','Not in current V1. Recovery truthfully reports unavailable; do not claim an implemented reset process.'],['Are all menu words working integrations?','No. Attendance & QR is not proof of scanning; Notice & SMS is not proof of SMS; Online Pay here is the manual fee path. Feature Catalog is not automated provisioning proof.']];
write('SENIOR_DEMO_FAQ.md','Senior demo questions',faq.map(([q,a])=>'## '+q+'\n\n'+a+'\n').join('\n'));
write('EDUNEXUS_OWNER_CHEAT_SHEET.md','Owner demo cheat sheet',`## Eight roles

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
`);
console.log('Student story, coaching guide, 28-minute script, FAQ and cheat sheet created.');

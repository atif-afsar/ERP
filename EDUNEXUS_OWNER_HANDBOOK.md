# EduNexus owner handbook

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## What problem does EduNexus solve?

Schools repeat the same student, parent, employee and payment information in disconnected registers. EduNexus connects those responsibilities in one school workspace, with different access for each person and separate workspaces for different institutions. Admission feeds enrollment; enrollment feeds academic work and fees; approved collection feeds receipts and school accounts.

## How modules connect

School setup → student/enrollment → teacher work → assessment → fee dues → verified collection → receipt → journal → notification. Library and transport reuse identities; not every operation automatically posts accounting or creates a fee.

## Multi-tenancy

1. **What it is:** A separate workspace per institution.
2. **Who uses it:** Super Admin and Owner.
3. **Problem solved:** School separation.
4. **Important screens:** Tenants & Schools.
5. **Important actions:** Inspect school/status.
6. **Data in:** Institution and owner.
7. **Data out:** Scoped users/business records.
8. **Real-life example:** Springfield and another school have separate students.
9. **Why school cares:** Privacy and independent administration.

## School setup

1. **What it is:** The institution profile and structure.
2. **Who uses it:** Owner; limited Admin can view.
3. **Problem solved:** Consistent shared choices.
4. **Important screens:** Master Data: Profile, Years, Branches, Classes.
5. **Important actions:** Maintain profile/year/class/section.
6. **Data in:** School details.
7. **Data out:** Enrollment/timetable/exam/fee choices.
8. **Real-life example:** 2026–27, Main branch, Class 5-A.
9. **Why school cares:** Avoids inconsistent repeated setup.

## Academic structure

1. **What it is:** Subjects and teaching responsibility.
2. **Who uses it:** Owner.
3. **Problem solved:** Knowing what is taught by whom.
4. **Important screens:** Master Data: Subjects, Assignments.
5. **Important actions:** Create subject; link teacher/class/year.
6. **Data in:** Staff, subjects and structure.
7. **Data out:** Teacher access and scheduling context.
8. **Real-life example:** Ms. Sharma teaches Mathematics in Class 5.
9. **Why school cares:** Defined academic responsibility.

## Student lifecycle

1. **What it is:** Permanent identity with yearly enrollment history.
2. **Who uses it:** Owner or granted admissions operator.
3. **Problem solved:** Retaining history across years.
4. **Important screens:** Students: admission, directory, profile, enrollment, documents.
5. **Important actions:** Admit/search/update/enroll; record document metadata.
6. **Data in:** Student, guardian and academic context.
7. **Data out:** Attendance/exam rosters and fee assignments.
8. **Real-life example:** Aarav keeps his identity next year.
9. **Why school cares:** Reliable student history; document metadata alone is not a secure file-storage service.

## Parent relationship

1. **What it is:** Guardian records connected to children and a login.
2. **Who uses it:** Owner and Parent.
3. **Problem solved:** Family-only access without duplicated accounts.
4. **Important screens:** Students parent links; Fees parentAccess; Parent fees.
5. **Important actions:** Link children; invite/link user; switch child.
6. **Data in:** Guardian identity and student relationships.
7. **Data out:** Own children dues/proofs/receipts/notifications.
8. **Real-life example:** Imran sees Aarav and a sibling.
9. **Why school cares:** Multi-child access with family privacy.

## Teacher lifecycle

1. **What it is:** Staff identity, teacher profile, account and assignment.
2. **Who uses it:** Owner and Teacher.
3. **Problem solved:** Connecting employee identity with teaching scope.
4. **Important screens:** Staff & Teachers; Master Data Assignments.
5. **Important actions:** Create profile/account via invitation; assign subject/class/year.
6. **Data in:** Employee identity and invitations.
7. **Data out:** Timetable, attendance, marks, own HR.
8. **Real-life example:** Ms. Sharma has one assigned teaching group.
9. **Why school cares:** Actual responsibilities drive access.

## Timetable

1. **What it is:** Teaching lesson slots.
2. **Who uses it:** Owner; Teacher views permitted work.
3. **Problem solved:** Organizing lessons without conflicts.
4. **Important screens:** Timetable.
5. **Important actions:** Configure/view valid lesson slots.
6. **Data in:** Year, class/section, subject and teacher.
7. **Data out:** Shared schedule.
8. **Real-life example:** Maths Monday 10:00.
9. **Why school cares:** Organized daily teaching.

## Attendance

1. **What it is:** Daily enrollment-linked presence.
2. **Who uses it:** Assigned Teacher; Owner.
3. **Problem solved:** Recording attendance correctly.
4. **Important screens:** Attendance & QR roster and selectors.
5. **Important actions:** Choose year/class/section/date; mark/save.
6. **Data in:** Academic enrollment.
7. **Data out:** Attendance history and supported absence notifications.
8. **Real-life example:** Aarav ABSENT on a practice date.
9. **Why school cares:** Traceable records; QR menu label alone is not working QR-scanning proof.

## Examinations

1. **What it is:** Exam definition and subject schedules.
2. **Who uses it:** Owner and assigned Teacher.
3. **Problem solved:** Consistent assessment organization.
4. **Important screens:** Examinations: Exams, Schedules, Marks, Grades.
5. **Important actions:** Define exam/date; schedule subjects; enter valid marks.
6. **Data in:** Year/enrollment/subjects/teacher assignments.
7. **Data out:** Validated marks for results.
8. **Real-life example:** Aarav has Mathematics 80/100.
9. **Why school cares:** Controlled academic assessment.

## Results

1. **What it is:** Calculated totals/grades and report-card foundation.
2. **Who uses it:** Owner and assigned Teacher within grants.
3. **Problem solved:** Readable consistent performance.
4. **Important screens:** Examinations Results and Report.
5. **Important actions:** Configure grading; review and publish valid result.
6. **Data in:** Schedules and enrolled student marks.
7. **Data out:** Published result/report data and supported notifications.
8. **Real-life example:** Grade comes from configured rules.
9. **Why school cares:** Meaningful results; do not promise a polished PDF export without a working action.

## Fees

1. **What it is:** Enrollment dues and manually verified collections.
2. **Who uses it:** Owner, Accountant, linked Parent.
3. **Problem solved:** Tracking owed versus received money.
4. **Important screens:** Fees & Payments; Parent fee portal.
5. **Important actions:** Structure/assign/settings; proof/review/receipt.
6. **Data in:** Academic year, enrollment, installment, proof.
7. **Data out:** Verified payments, balance, receipt, notification, journal.
8. **Real-life example:** 10000 due; 4000 approved; 6000 remains.
9. **Why school cares:** Controlled fee-to-accounts linkage.

## School accounting

1. **What it is:** School financial books.
2. **Who uses it:** Owner and Accountant.
3. **Problem solved:** Knowing income/expenses/cash movements.
4. **Important screens:** Finance accounts/journals/ledger/books/reports/reconciliation.
5. **Important actions:** Inspect entries; post expense/other income; reconcile fees.
6. **Data in:** Verified collections and vouchers.
7. **Data out:** School financial books.
8. **Real-life example:** 5000 fee produces equal debit/credit.
9. **Why school cares:** Money explained, not just receipt lists.

## Communications

1. **What it is:** Stored notices and delivery jobs.
2. **Who uses it:** Owner; other users only with grants.
3. **Problem solved:** Traceable communication.
4. **Important screens:** Notice & SMS; notifications; delivery history.
5. **Important actions:** Send authorized notice and inspect delivery.
6. **Data in:** Recipients/templates/business events.
7. **Data out:** In-app inbox and delivery records.
8. **Real-life example:** Fee approval notifies family.
9. **Why school cares:** Durable foundation; local email is LOG and SMS delivery is not implied by its label.

## HR

1. **What it is:** Staff leave balances/requests/attendance.
2. **Who uses it:** Staff/Teacher self-service; Owner approves.
3. **Problem solved:** Managing employee absence.
4. **Important screens:** HR & Leave.
5. **Important actions:** Configure balances; request/review leave.
6. **Data in:** Linked staff user and leave rules.
7. **Data out:** Approved leave and supported attendance/notifications.
8. **Real-life example:** Ms. Sharma requests one day.
9. **Why school cares:** Employee leave is separate from student attendance.

## Library

1. **What it is:** Catalog, physical copies and circulation.
2. **Who uses it:** Authorized school operator, Owner in this fixture.
3. **Problem solved:** Knowing who holds a copy.
4. **Important screens:** Library catalog and circulation.
5. **Important actions:** Add title/copy; issue/return/mark lost.
6. **Data in:** Available physical copy and student/staff borrower.
7. **Data out:** Loan/copy state.
8. **Real-life example:** Aarav borrows then returns a copy.
9. **Why school cares:** Prevents simultaneous duplicate issue.

## Inventory

1. **What it is:** Item/location stock movements.
2. **Who uses it:** Authorized school operator.
3. **Problem solved:** Controlling available stock.
4. **Important screens:** Inventory items/categories/movement.
5. **Important actions:** Receive/issue/return/adjust stock.
6. **Data in:** Item/location/quantity/reason.
7. **Data out:** Movement history and stock balance.
8. **Real-life example:** Receive 10 notebooks; issue 3; stock 7.
9. **Why school cares:** Negative stock prevention, no invented procurement/accounting integration.

## Transport

1. **What it is:** Fleet/routes/stops/allocations.
2. **Who uses it:** Authorized school operator.
3. **Problem solved:** Knowing student route use.
4. **Important screens:** Transport & Fleet.
5. **Important actions:** Configure route/stop; allocate/end student.
6. **Data in:** Student, route and vehicle capacity.
7. **Data out:** Transport allocation history.
8. **Real-life example:** Aarav joins Route 1 at Main Gate.
9. **Why school cares:** Capacity-aware allocation, no live GPS claim.

## Hostel

1. **What it is:** Residence buildings/rooms/beds.
2. **Who uses it:** Authorized school operator.
3. **Problem solved:** Avoiding conflicting allocations.
4. **Important screens:** Hostel Residence.
5. **Important actions:** Configure room; allocate bed; check out.
6. **Data in:** Student and available bed.
7. **Data out:** Occupancy/history.
8. **Real-life example:** Aarav gets one free bed.
9. **Why school cares:** No simultaneous double-booking.

## Mess

1. **What it is:** Meal plans, menus and dining membership.
2. **Who uses it:** Authorized school operator.
3. **Problem solved:** Organizing dining subscriptions.
4. **Important screens:** Hostel Mess & Dining.
5. **Important actions:** Create plan/menu; enroll/end member.
6. **Data in:** Meal plan/dates/student or eligible staff.
7. **Data out:** Dining membership and menu.
8. **Real-life example:** Aarav joins hostel meal plan.
9. **Why school cares:** Clear membership, no automatic food-charge claim.

## Organization/RBAC

1. **What it is:** Accounts, memberships, roles, grants, invitations.
2. **Who uses it:** Owner; Super Admin at platform scope.
3. **Problem solved:** Restricting each person to their job.
4. **Important screens:** Users & Access.
5. **Important actions:** Invite/assign granted role/inspect permissions.
6. **Data in:** Identity and membership.
7. **Data out:** Authenticated access and durable audit events.
8. **Real-life example:** Admin can view profile but cannot verify fees.
9. **Why school cares:** Accountability; some API finance gates require canonical roles too.

## SaaS subscription

1. **What it is:** School purchase of EduNexus service.
2. **Who uses it:** Owner subscribes; Super Admin manages plans.
3. **Problem solved:** Controlling software-service access.
4. **Important screens:** Subscription Plans; SaaS Subscription.
5. **Important actions:** Inspect plans/status/access; explain recovery.
6. **Data in:** Subscription/provider events/paid-through dates.
7. **Data out:** Operational entitlement, separate platform records.
8. **Real-life example:** School software bill differs from student tuition.
9. **Why school cares:** Provider creation/cancellation are placeholders; not live demonstrated.


## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.

# One complete school story

Prepared 6 October 2026. Local fictional training only. No product changes, deployment or new QA audit. All eight accounts passed a real Chromium login check. Passwords are only in Git-ignored qa/artifacts/training/LOCAL_DEMO_CREDENTIALS.md.

## Fictional cast

Aarav Khan (Student), Imran Khan (Parent), Ms. Sharma (Teacher), Mr. Verma (Accountant). These are teaching characters; this task did not create their accounts or business records. First practise on the existing sample school/child. Then create new clearly named PRACTICE rows through the UI if desired. No money is transferred.

## 1. SUPER_ADMIN — Tenants & Schools

**Action:** Create school and owner invitation via supported onboarding.

**Result and next link:** School and Owner membership exist; local email is LOG only.

## 2. TENANT_ADMIN — Master Data → Years / Branches / Classes

**Action:** Create 2026–27, Main branch, Class 5 and Section A.

**Result and next link:** Enrollment choices become available.

## 3. TENANT_ADMIN — Master Data → Subjects

**Action:** Create Mathematics.

**Result and next link:** Subject can be scheduled and assigned.

## 4. TENANT_ADMIN — Staff & Teachers; Master Data Assignments

**Action:** Create/link Ms. Sharma teacher account via invitation; assign Mathematics/Class 5/year.

**Result and next link:** Teacher has academic scope.

## 5. TENANT_ADMIN — Students admission

**Action:** Admit Aarav Khan with unique admission number, Imran Khan parent, year/class/section.

**Result and next link:** Permanent identity, parent relationship and enrollment saved.

## 6. TENANT_ADMIN — Parent relationship; Fees → parentAccess

**Action:** Invite/link Imran to parent record; reuse parent for another child if practising siblings.

**Result and next link:** One account accesses only linked children.

## 7. TENANT_ADMIN — Timetable

**Action:** Create Ms. Sharma lesson slot in matching academic context.

**Result and next link:** Nonconflicting teacher schedule.

## 8. TEACHER — Attendance

**Action:** Select assigned roster/date; mark Aarav PRESENT.

**Result and next link:** Enrollment-linked daily record saved.

## 9. TENANT_ADMIN — Examinations → Exams / Schedules / Grades

**Action:** Create dated exam; schedule Mathematics within dates; configure grading.

**Result and next link:** Valid assessment ready for marks.

## 10. TEACHER — Examinations → Marks

**Action:** Enter Aarav 80/100 for assigned subject.

**Result and next link:** Validated marks, not yet published result.

## 11. TENANT_ADMIN — Examinations → Results / Report

**Action:** Review calculated result; publish valid completed assessment.

**Result and next link:** Totals/grade follow configured rules; report-card foundation.

## 12. TENANT_ADMIN — Fees → settings / structures / assign

**Action:** Set fictional non-payable QR/instructions; assign 10000 to enrollment with installments.

**Result and next link:** Parent sees obligation; no money received.

## 13. PARENT — Fees

**Action:** Imran submits fictional 4000 proof with unique DEMO reference.

**Result and next link:** PENDING; verified due stays 10000.

## 14. ACCOUNTANT — Fees → verify

**Action:** Mr. Verma View/Approve after explaining bank matching.

**Result and next link:** 4000 verified; receipt; 6000 remaining; PARTIAL.

## 15. ACCOUNTANT — Finance → Journals

**Action:** Locate that approved fee source.

**Result and next link:** 4000 collection debit equals fee-income credit.

## 16. PARENT — Fees / notification feed

**Action:** Refresh balance/receipt and supported inbox notification.

**Result and next link:** Approved receipt; no unrelated family records.

## 17. PARENT then ACCOUNTANT — Same proof/approval flow

**Action:** Submit/approve remaining 6000 with new reference.

**Result and next link:** PAID; zero due; second receipt; no double-counting.

## 18. TENANT_ADMIN — Library

**Action:** Issue an available physical copy to Aarav; later return.

**Result and next link:** Loan/copy state updates, no invented automatic fee.

## 19. TENANT_ADMIN — Transport, if needed

**Action:** Allocate Aarav to route/stop within capacity; end when appropriate.

**Result and next link:** Allocation reuses student identity.

## Remember

Aarav is permanent; enrollment tracks academic movement. Attendance/exams/fees use enrollment context. Library/transport reuse identity. A screenshot is not a payment; approval completes the collection. School SaaS subscription is another money flow.

## Evidence boundary

Sources: the eleven requested certification/UI documents and current mounted App components, Sidebar, permission policy, manual fee/parent portal, finance and subscription code. Local release-candidate certification is reported by FINAL_RC_RECERTIFICATION_REPORT.md; this training does not recertify it or establish production/provider readiness. Current UI takes precedence over older prototype routes and tab names.

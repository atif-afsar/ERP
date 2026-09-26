# STUDENT ENROLLMENT & PROMOTION MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `49-STUDENT-ENROLLMENT-PROMOTION-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Enrollment & Promotion Specification  
**Previous Document:** `48-ACADEMIC-STRUCTURE-MANAGEMENT.md`  
**Next Document:** `50-ATTENDANCE-MANAGEMENT.md`

---

# 1. Purpose

This module manages where a student belongs academically and how that placement changes over time.

It covers:

```text
Enrollment
Academic Placement
Class Assignment
Section Assignment
Batch Assignment
Program Enrollment
Transfers
Promotion
Demotion
Re-enrollment
Withdrawal
Academic Year Rollover
Bulk Promotion
Enrollment History
```

The Student entity represents the student's identity.

The Enrollment entity represents the student's academic participation during a specific academic context.

---

# 2. Core Principle

Never store current academic placement as the only source of truth on the Student record.

Preferred:

```text
Student
   ↓
Enrollment
   ↓
Academic Year
   ↓
Program / Course
   ↓
Class / Section / Batch
```

This preserves history.

---

# 3. Student vs Enrollment

### Student

Represents:

```text
Who the student is
```

### Enrollment

Represents:

```text
Where and when the student is studying
```

Example:

```text
Student:
Ahmed Khan
```

Enrollment history:

```text
2024–25 → Class 8 → Section A
2025–26 → Class 9 → Section B
2026–27 → Class 10 → Section A
```

The Student remains the same entity.

---

# 4. Enrollment Entity

Conceptually:

```text
Enrollment
----------
id
studentId
academicYearId
branchId
programId
courseId
classId
sectionId
batchId
status
startDate
endDate
createdAt
updatedAt
```

The exact schema must follow the canonical database design.

---

# 5. Enrollment Status

Potential statuses:

```text
PENDING
ACTIVE
TRANSFERRED
COMPLETED
WITHDRAWN
CANCELLED
```

Only statuses actually required by the application should be enabled.

---

# 6. Enrollment Lifecycle

Typical lifecycle:

```text
PENDING
   ↓
ACTIVE
   ↓
COMPLETED
```

Alternative:

```text
ACTIVE
   ↓
TRANSFERRED
```

or:

```text
ACTIVE
   ↓
WITHDRAWN
```

---

# 7. Enrollment Start

Every enrollment should have a meaningful start date.

Example:

```text
Start Date:
2026-04-01
```

The start date may correspond to:

```text
Academic Year Start
Admission Date
Batch Start
Transfer Date
```

depending on the operation.

---

# 8. Enrollment End

An end date may be recorded when the enrollment finishes.

Example:

```text
Start:
2026-04-01

End:
2027-03-31
```

Do not require an end date for every active enrollment.

---

# 9. Current Enrollment

The system should identify the student's current valid enrollment.

Example:

```text
CURRENT ENROLLMENT

2026–27
Class 10
Section A
Main Branch
```

---

# 10. Enrollment History

Historical enrollments must remain available.

Example:

```text
2024–25
Class 8
Section A
Completed

2025–26
Class 9
Section B
Completed

2026–27
Class 10
Section A
Active
```

Never overwrite the previous academic placement merely because the student has been promoted.

---

# 11. Enrollment Context

An enrollment may reference:

```text
Academic Year
Branch
Program
Course
Class
Section
Batch
```

Not every institution requires every field.

---

# 12. School Enrollment

Typical school enrollment:

```text
Student
 ↓
Academic Year
 ↓
Class
 ↓
Section
```

Example:

```text
Ahmed
 ↓
2026–27
 ↓
Class 10
 ↓
Section A
```

---

# 13. Coaching Enrollment

Typical coaching enrollment:

```text
Student
 ↓
Academic Year
 ↓
Program
 ↓
Course
 ↓
Batch
```

Example:

```text
Ahmed
 ↓
2026–27
 ↓
JEE
 ↓
JEE Main
 ↓
Batch A
```

---

# 14. Combined Enrollment

The platform may support both school and coaching structures.

Example:

```text
Student
 ├── School Enrollment
 │    └── Class 10A
 │
 └── Coaching Enrollment
      └── JEE Batch A
```

The system must not force unrelated academic structures into a single field.

---

# 15. Enrollment Validation

Before creating enrollment:

```text
Student exists
Academic Year exists
Branch exists
Academic structure exists
Program valid
Course valid
Class valid
Section valid
Batch valid
Tenant matches
Branch rules match
```

Only relevant fields should be required for the selected enrollment type.

---

# 16. Duplicate Enrollment Prevention

The system should prevent invalid duplicate active enrollments.

Example:

```text
Student
2026–27
Class 10
Section A
ACTIVE
```

and another identical active enrollment should normally be rejected.

If concurrent program enrollments are supported, uniqueness rules must account for program context.

---

# 17. Enrollment Capacity

If a batch/section has a configured capacity:

```text
Capacity = 50
Current = 50
```

the system should prevent another enrollment unless an authorized override is supported.

---

# 18. Capacity Warning

Before enrollment:

```text
Batch A

Capacity: 50
Enrolled: 49
Available: 1
```

The UI should make capacity visible.

---

# 19. Capacity Override

If administrators can override capacity:

```text
Capacity Full
 ↓
Authorized Override
 ↓
Reason Required
 ↓
Enrollment
```

The override should be audited.

---

# 20. Enrollment Creation Flow

Recommended:

```text
Select Student
      ↓
Select Academic Year
      ↓
Select Branch
      ↓
Select Program / Course
      ↓
Select Class / Section / Batch
      ↓
Validate Capacity
      ↓
Review
      ↓
Confirm Enrollment
```

---

# 21. Enrollment During Admission

Student admission may create the first enrollment automatically.

Example:

```text
Create Student
      ↓
Guardian
      ↓
Admission
      ↓
Enrollment
```

The entire operation should remain transaction-safe.

---

# 22. Enrollment Editing

Do not use a generic edit form to silently change historical enrollment.

For example, changing:

```text
Class 9
```

to:

```text
Class 10
```

should normally create a new enrollment/promotion event rather than modifying the historical record.

---

# 23. Section Change

A student may move between sections.

Example:

```text
Class 10A
 ↓
Section Transfer
 ↓
Class 10B
```

Depending on the academic model, this may create:

```text
New Enrollment
```

or:

```text
Placement History Event
```

The previous placement must remain historically visible.

---

# 24. Batch Change

For coaching:

```text
Batch A
 ↓
Batch B
```

The system should preserve the previous batch association.

Record where appropriate:

```text
Transfer Date
Old Batch
New Batch
Reason
Authorized By
```

---

# 25. Branch Transfer

A student may transfer branches.

Example:

```text
Branch A
 ↓
Transfer
 ↓
Branch B
```

The system must preserve the old enrollment.

Create the new valid enrollment under the destination branch.

---

# 26. Branch Transfer Validation

Before transfer:

```text
Destination Branch exists
Student can be transferred
Destination academic context valid
Destination section/batch available
User has permission
```

---

# 27. Program Transfer

A student may move between programs.

Example:

```text
Foundation
 ↓
JEE Preparation
```

The old enrollment should remain historical.

---

# 28. Course Transfer

Where courses exist:

```text
JEE Main
 ↓
JEE Advanced
```

must be represented as a controlled academic change.

---

# 29. Enrollment Withdrawal

Withdrawal flow:

```text
Active Enrollment
 ↓
Withdrawal Request
 ↓
Reason
 ↓
Date
 ↓
Authorization
 ↓
Withdrawn
```

---

# 30. Withdrawal Information

Where required:

```text
Withdrawal Date
Reason
Notes
Approved By
```

The student identity itself should remain in the system.

---

# 31. Student Status vs Enrollment Status

These are different.

Example:

```text
Student Status = ACTIVE
Enrollment Status = COMPLETED
```

may be valid if the student has completed one program but remains enrolled elsewhere.

Do not automatically equate the two.

---

# 32. Promotion

Promotion moves a student to the next academic level.

Example:

```text
2025–26
Class 9
Section B
      ↓
PROMOTION
      ↓
2026–27
Class 10
Section A
```

---

# 33. Promotion Eligibility

Eligibility may depend on:

```text
Final Result
Attendance
Administrative Approval
Promotion Rules
Outstanding Requirements
```

The system must use only rules actually configured by the institution.

---

# 34. Manual Promotion

Authorized staff may promote an individual student.

Flow:

```text
Student
 ↓
Promote
 ↓
Select Destination
 ↓
Validate
 ↓
Confirm
```

---

# 35. Bulk Promotion

Administrators should be able to promote multiple students.

Example:

```text
Class 9
Section A
      ↓
Select 35 Students
      ↓
Promote
      ↓
Class 10
```

---

# 36. Bulk Promotion Preview

Before committing:

```text
Selected: 35

Eligible: 32
Warnings: 2
Blocked: 1
```

The administrator must be able to review the affected students.

---

# 37. Bulk Promotion Validation

For every selected student:

```text
Current Enrollment Valid
Destination Valid
Student Not Withdrawn
Capacity Available
Required Results Available
Permission Valid
```

according to configured rules.

---

# 38. Partial Promotion

If partial promotion is supported:

```text
Eligible Students
 ↓
Promote

Blocked Students
 ↓
Remain Unchanged
```

The system must clearly report the outcome.

---

# 39. Atomic Promotion

If the product chooses atomic bulk promotion:

```text
All Students Valid
 ↓
Commit All
```

If any blocking error occurs:

```text
No Changes
```

The behavior must be explicit and consistent.

---

# 40. Promotion History

Every promotion should preserve:

```text
Previous Enrollment
New Enrollment
Promotion Date
Actor
Reason / Notes
```

where applicable.

---

# 41. Demotion

If supported, a student may move to a lower academic level.

Example:

```text
Class 10
 ↓
Class 9
```

This should require appropriate permissions and an explicit reason.

---

# 42. Demotion Audit

Demotion should be audited with:

```text
Old Class
New Class
Date
Actor
Reason
```

---

# 43. Re-enrollment

A withdrawn/completed student may return.

Example:

```text
Withdrawn
 ↓
Re-enroll
 ↓
New Enrollment
```

Do not reactivate the old enrollment blindly if a new academic context is involved.

---

# 44. Re-enrollment History

Example:

```text
2025–26
Active
 ↓
Withdrawn

2026–27
Re-enrolled
 ↓
Active
```

Both records remain available.

---

# 45. Academic Year Rollover

At the end of an academic year:

```text
2025–26
 ↓
Close
 ↓
Create 2026–27
 ↓
Prepare New Structure
 ↓
Promote / Re-enroll
```

The previous year remains historical.

---

# 46. Rollover Preparation

The system may provide:

```text
Students Ready for Promotion
Students Pending Decision
Students Withdrawn
Students Completed
Students Requiring Manual Review
```

---

# 47. Rollover Rules

The institution may configure:

```text
Automatic Promotion
Manual Promotion
Default Destination Class
Default Section
Default Batch
```

Only configured rules should execute.

---

# 48. Destination Mapping

A promotion configuration may define:

```text
Class 8 → Class 9
Class 9 → Class 10
Class 10 → Class 11
```

Mapping must be explicit.

---

# 49. Section Mapping

Example:

```text
Section A → Section A
Section B → Section B
```

or:

```text
All Sections → New Section Allocation
```

The system should support the institution's chosen workflow.

---

# 50. Batch Mapping

For coaching:

```text
Foundation A
 ↓
Foundation B
```

or:

```text
JEE Batch A
 ↓
JEE Advanced Batch
```

The mapping should be configurable.

---

# 51. Enrollment Approval

If enrollment requires approval:

```text
Draft
 ↓
Submitted
 ↓
Approved
 ↓
Active
```

Only authorized users may approve.

---

# 52. Enrollment Rejection

If rejected:

```text
Submitted
 ↓
Rejected
```

A rejection reason should be captured where required.

---

# 53. Enrollment Cancellation

Before activation:

```text
Pending
 ↓
Cancelled
```

The system should preserve the record for audit/history where appropriate.

---

# 54. Enrollment Documents

If admission/enrollment documents are required:

```text
Enrollment
 ↓
Required Documents
 ↓
Verification
```

Document verification should not be confused with student identity.

---

# 55. Enrollment Checklist

Possible checklist:

```text
☐ Student information complete
☐ Guardian linked
☐ Required documents complete
☐ Academic context valid
☐ Fees configured if required
☐ Enrollment approved
```

Only configured requirements should block enrollment.

---

# 56. Enrollment Fees Integration

Enrollment may trigger financial setup.

Example:

```text
Enrollment
 ↓
Fee Structure
 ↓
Fee Assignment
```

The enrollment module should call the financial domain rather than duplicating fee logic.

---

# 57. Enrollment Attendance Integration

Once active:

```text
Enrollment
 ↓
Attendance Eligibility
```

Attendance should reference the correct academic context.

---

# 58. Enrollment Exam Integration

Students should become eligible for exams based on the relevant academic context.

Example:

```text
Enrollment
 ↓
Class 10
 ↓
Exam
 ↓
Eligible Students
```

---

# 59. Enrollment Teacher Integration

Teacher student access should derive from active academic placement.

Example:

```text
Enrollment
 ↓
Class / Section / Batch
 ↓
Teacher Assignment
 ↓
Student Access
```

---

# 60. Enrollment Search

Search should support:

```text
Student Name
Admission Number
Enrollment ID
Class
Section
Batch
Academic Year
Program
Branch
Status
```

---

# 61. Enrollment Filters

Useful filters:

```text
Academic Year
Branch
Program
Course
Class
Section
Batch
Enrollment Status
Student Status
```

---

# 62. Enrollment List

Recommended columns:

```text
Student
Admission No.
Academic Year
Class / Program
Section / Batch
Branch
Enrollment Status
Start Date
Actions
```

---

# 63. Mobile Enrollment UI

Use cards:

```text
Student
Class / Batch
Academic Year
Status
```

Detailed enrollment information belongs in the detail view.

---

# 64. Enrollment Detail

The enrollment detail page should show:

```text
Student
Academic Year
Branch
Program
Course
Class
Section
Batch
Start Date
End Date
Status
History
```

---

# 65. Enrollment Timeline

Possible events:

```text
Enrollment Created
Approved
Activated
Section Changed
Batch Changed
Transferred
Promoted
Withdrawn
Completed
```

---

# 66. Auditability

Important operations must be audited:

```text
Enrollment Created
Enrollment Updated
Promotion
Demotion
Transfer
Withdrawal
Re-enrollment
Bulk Promotion
Capacity Override
```

---

# 67. Audit Details

Where appropriate:

```text
Actor
Timestamp
Student
Old Context
New Context
Action
Reason
```

---

# 68. Permission Model

Possible permissions:

```text
enrollment.read
enrollment.create
enrollment.update
enrollment.transfer
enrollment.promote
enrollment.withdraw
enrollment.archive
enrollment.bulk_promote
```

The exact permission names must match the canonical authorization system.

---

# 69. Permission-Aware UI

Example:

```text
No enrollment.promote
→ Hide Promote

No enrollment.transfer
→ Hide Transfer

No enrollment.withdraw
→ Hide Withdraw

No enrollment.bulk_promote
→ Hide Bulk Promotion
```

Backend checks remain mandatory.

---

# 70. Teacher Access

Teachers should normally be able to see enrollment information only for students within their authorized teaching scope.

---

# 71. Receptionist Access

Receptionists may need:

```text
Create Enrollment
View Enrollment
Transfer
Update Basic Enrollment Information
```

according to assigned permissions.

---

# 72. Branch Manager Access

Branch managers should be restricted to their authorized branch scope.

---

# 73. Administrator Access

Administrators with appropriate permissions may manage:

```text
Enrollments
Transfers
Promotion
Academic Rollover
Bulk Operations
```

across their authorized scope.

---

# 74. Cross-Tenant Protection

An enrollment must never connect:

```text
Tenant A Student
+
Tenant B Academic Context
```

This must be prevented at the application and data layers.

---

# 75. Cross-Branch Protection

If branch restrictions apply:

```text
Branch A Student
+
Branch B Restricted Batch
```

must not be allowed unless the user's permissions and organizational model explicitly permit it.

---

# 76. Concurrency

Enrollment operations may happen simultaneously.

Example:

```text
Admin A → Enroll Student
Admin B → Enroll Same Student
```

The database and service layer must prevent invalid duplicate state.

Capacity checks should also be concurrency-safe.

---

# 77. Transaction Safety

Operations such as promotion should be transaction-safe where multiple records are affected.

Example:

```text
Close Old Enrollment
+
Create New Enrollment
+
Create Promotion Event
+
Update Related Context
```

must not leave the student in an invalid intermediate state.

---

# 78. Error Handling

Use actionable errors.

Example:

```text
This student cannot be promoted because the destination batch is full.
```

Not:

```text
Foreign key constraint failed.
```

---

# 79. Dependency Warnings

Before major operations, show consequences.

Example:

```text
Moving this student to another batch will affect:
• Future attendance
• Teacher access
• Exam eligibility
• Fee context
```

Only display consequences that actually apply.

---

# 80. Archive Rules

Historical enrollments should not normally be deleted.

When an academic year closes:

```text
Enrollment
 ↓
Completed / Closed
```

and remains accessible.

---

# 81. Hard Delete

Hard deletion should be highly restricted.

If enrollment is referenced by:

```text
Attendance
Fees
Payments
Exams
Results
Documents
Audit
```

do not casually delete it.

---

# 82. Performance

The enrollment module should support large student populations.

Use:

```text
Pagination
Indexed Foreign Keys
Server-Side Filtering
Efficient Queries
Lazy Loading
```

where appropriate.

---

# 83. Bulk Operations

Bulk actions may include:

```text
Promote
Transfer
Assign Section
Assign Batch
Change Status
Export
```

Each operation requires appropriate permission.

---

# 84. Bulk Operation Preview

Before execution:

```text
Selected: 100
Valid: 94
Warnings: 4
Blocked: 2
```

The administrator should understand the expected outcome.

---

# 85. Bulk Operation Audit

Record:

```text
Operation
Actor
Timestamp
Number of Records
Success Count
Failure Count
```

Detailed per-student events may also be generated where required.

---

# 86. Import

If enrollment import is supported:

```text
Upload
 ↓
Validate
 ↓
Match Students
 ↓
Validate Academic Context
 ↓
Preview
 ↓
Confirm
 ↓
Import
```

---

# 87. Export

Enrollment exports may contain:

```text
Student
Admission Number
Academic Year
Class
Section
Batch
Program
Branch
Status
```

Exports must respect permission and scope.

---

# 88. Empty States

Examples:

```text
No active enrollments found.
```

```text
No promotion candidates found.
```

```text
No enrollment history available.
```

---

# 89. Loading States

Provide clear loading states for:

```text
Enrollment List
Enrollment Detail
Promotion Candidates
Transfer Dialog
Academic Year Rollover
```

---

# 90. Responsive Design

The module must be:

```text
Mobile-First
Responsive
Touch-Friendly
Readable
Fast
```

Desktop may provide richer bulk-management interfaces.

---

# 91. Student Enrollment Checklist

```text
☐ Enrollment creation
☐ Enrollment status
☐ Academic year
☐ Branch
☐ Program
☐ Course
☐ Class
☐ Section
☐ Batch
☐ Current enrollment
☐ Enrollment history
☐ Capacity validation
☐ Duplicate prevention
☐ Section transfer
☐ Batch transfer
☐ Branch transfer
☐ Program transfer
☐ Withdrawal
☐ Re-enrollment
☐ Promotion
☐ Demotion
☐ Bulk promotion
☐ Academic rollover
☐ Enrollment approval
☐ Enrollment search
☐ Filters
☐ Import
☐ Export
☐ Audit
☐ Tenant isolation
☐ Branch isolation
☐ Permission enforcement
☐ Responsive UI
```

---

# 92. Definition of Done

The module is complete when an authorized user can:

```text
Select Student
      ↓
Select Academic Context
      ↓
Validate Placement
      ↓
Create Enrollment
      ↓
Track Current Enrollment
      ↓
Preserve History
      ↓
Transfer / Change Placement
      ↓
Promote / Demote
      ↓
Withdraw / Re-enroll
      ↓
Perform Bulk Academic Operations
```

while preserving:

```text
Academic History
Student History
Attendance Integrity
Financial Integrity
Exam Integrity
Tenant Isolation
Branch Isolation
Authorization
Auditability
```

---

# 93. Final Principle

> **Enrollment is the bridge between a student's identity and the academic structure. Never overwrite historical placement to represent promotion, transfer, or batch changes. Every academic movement should preserve the previous state, create the correct new state, validate capacity and academic context, and remain fully scoped by tenant, branch, permissions, and academic year.**

---

# 94. Next Document

```text
50-ATTENDANCE-MANAGEMENT.md
```

The next document will define the complete attendance system:

```text
Student Attendance
Staff Attendance
Daily Attendance
Subject Attendance
Class Attendance
Batch Attendance
Present / Absent / Late
Half Day
Excused Absence
Attendance Corrections
Attendance Locking
Bulk Attendance
Attendance Reports
Attendance Percentage
Teacher Attendance Workflow
Parent Visibility
Audit Trail
```

---

# END OF DOCUMENT
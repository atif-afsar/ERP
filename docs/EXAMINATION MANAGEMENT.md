# EXAMINATION MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `51-EXAMINATION-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Examination Management Specification  
**Previous Document:** `50-ATTENDANCE-MANAGEMENT.md`  
**Next Document:** `52-RESULTS-GRADING-REPORT-CARDS.md`

---

# 1. Purpose

The Examination Management module manages the complete examination lifecycle.

It covers:

```text
Exam Creation
Exam Types
Exam Sessions
Exam Scheduling
Subjects
Exam Eligibility
Student Registration
Marks Entry
Marks Validation
Grade Calculation
Result Processing
Result Publishing
Rechecking
Exam History
```

It must support both:

```text
School
Coaching Centre
```

---

# 2. Core Principle

An exam is an academic event.

It should reference an academic context rather than directly assuming a student's current class.

Preferred:

```text
Exam
 ↓
Academic Year
 ↓
Program / Course
 ↓
Class / Batch
 ↓
Subjects
 ↓
Students
```

Student participation should be connected through the student's valid enrollment.

---

# 3. Exam Entity

Conceptually:

```text
Exam
----
id
name
code
examTypeId
academicYearId
branchId
programId
courseId
classId
status
startDate
endDate
description
createdAt
updatedAt
```

The exact schema must follow the canonical database architecture.

---

# 4. Exam Types

Examples:

```text
Unit Test
Class Test
Monthly Test
Mid-Term
Half-Yearly
Pre-Board
Final Examination
Mock Test
Weekly Test
Full Syllabus Test
```

Coaching examples:

```text
JEE Mock Test
NEET Test
Chapter Test
Part Test
Grand Test
```

---

# 5. Exam Type Configuration

An exam type may define defaults such as:

```text
Duration
Maximum Marks
Grading System
Result Rules
Eligibility Rules
```

Defaults must remain overridable where required.

---

# 6. Exam Status

Recommended lifecycle:

```text
DRAFT
 ↓
SCHEDULED
 ↓
ONGOING
 ↓
COMPLETED
 ↓
RESULT_PROCESSING
 ↓
PUBLISHED
 ↓
ARCHIVED
```

Not every exam must use every state.

---

# 7. Exam Lifecycle

Example:

```text
Create
 ↓
Configure
 ↓
Schedule
 ↓
Publish Schedule
 ↓
Conduct
 ↓
Enter Marks
 ↓
Validate
 ↓
Process Results
 ↓
Publish Results
 ↓
Archive
```

---

# 8. Draft Exam

A draft exam is not yet operational.

Authorized users may configure:

```text
Subjects
Dates
Times
Maximum Marks
Passing Marks
Eligibility
```

Students should not see an unfinished exam unless explicitly allowed.

---

# 9. Scheduled Exam

Once scheduled:

```text
Exam
 ↓
Subjects
 ↓
Date / Time
 ↓
Room / Location if enabled
```

must be validated.

---

# 10. Exam Date

An exam may contain one or more dates.

Example:

```text
Mathematics → 10 Sep
Physics → 12 Sep
Chemistry → 14 Sep
```

---

# 11. Exam Session

An exam session represents an individual scheduled assessment event.

Example:

```text
Exam:
Mid-Term

Session:
Mathematics
10 Sep
10:00–12:00
```

Conceptually:

```text
Exam
 ↓
Exam Session
 ↓
Subject
```

---

# 12. Exam Schedule

Each session may contain:

```text
Subject
Date
Start Time
End Time
Duration
Location
Invigilator
Maximum Marks
Passing Marks
```

Only applicable fields should be required.

---

# 13. Schedule Validation

Prevent:

```text
End Time < Start Time
Duplicate Subject Session
Invalid Date
Invalid Academic Context
Conflicting Resource
```

where resource scheduling is implemented.

---

# 14. Subject Association

Every subject-based exam session should identify its subject.

Example:

```text
Exam
 ↓
Physics
 ↓
Exam Session
```

---

# 15. Exam Structure

Example:

```text
Mid-Term Examination
│
├── Mathematics
│   ├── Date
│   ├── Duration
│   └── Max Marks
│
├── Physics
│   ├── Date
│   ├── Duration
│   └── Max Marks
│
└── Chemistry
    ├── Date
    ├── Duration
    └── Max Marks
```

---

# 16. Eligibility

Students should only be eligible when their enrollment matches the exam's academic context.

Example:

```text
Exam
 ↓
Class 10
 ↓
Active Class 10 Enrollments
 ↓
Eligible Students
```

---

# 17. Eligibility Validation

Check:

```text
Active Enrollment
Correct Academic Year
Correct Branch
Correct Program / Course
Correct Class / Batch
Exam Not Withdrawn
```

according to configured rules.

---

# 18. Student Registration

If explicit registration is required:

```text
Student
 ↓
Exam Registration
 ↓
Eligible
 ↓
Registered
```

Some exams may automatically register all eligible students.

---

# 19. Exam Registration Status

Potential statuses:

```text
ELIGIBLE
REGISTERED
ABSENT
COMPLETED
DISQUALIFIED
CANCELLED
```

Only required statuses should be implemented.

---

# 20. Automatic Registration

For school-wide exams:

```text
Class 10
 ↓
Active Students
 ↓
Automatically Registered
```

This reduces administrative work.

---

# 21. Manual Registration

For optional coaching tests:

```text
Eligible Students
 ↓
Select Students
 ↓
Register
```

---

# 22. Registration Deadline

Optional configuration:

```text
Registration Opens
Registration Closes
```

After closing:

```text
Student Registration
→ Blocked
```

unless an authorized override exists.

---

# 23. Exam Attendance

Exam attendance should be connected to the exam session.

Example:

```text
Exam Session
 ↓
Registered Students
 ↓
Present / Absent
```

This is distinct from normal daily attendance.

---

# 24. Exam Absence

A student may be:

```text
Present
Absent
Late
Excused
```

according to the configured exam attendance model.

---

# 25. Marks Entry

Marks should be entered against:

```text
Exam Session
+
Student
```

Example:

```text
Mathematics
Max Marks: 100

Ahmed → 84
Rahul → 76
Sara → 91
```

---

# 26. Marks Entity

Conceptually:

```text
ExamMark
--------
id
examSessionId
studentId
enrollmentId
marks
status
remarks
enteredBy
enteredAt
updatedAt
```

The exact schema follows the canonical data model.

---

# 27. Marks Validation

If:

```text
Maximum Marks = 100
```

then:

```text
Marks < 0
```

is invalid.

```text
Marks > 100
```

is invalid.

---

# 28. Decimal Marks

If decimal marks are supported:

```text
84.5
91.25
```

must follow the configured precision.

Do not arbitrarily round marks.

---

# 29. Absent Student Marks

A student marked absent should not automatically receive `0` unless that is the institution's configured policy.

Represent absence explicitly where possible.

---

# 30. Exempted Student

If a student is exempt from a subject:

```text
EXEMPTED
```

should be distinct from:

```text
ABSENT
```

where the grading model requires it.

---

# 31. Marks Entry Workflow

Recommended:

```text
Select Exam
 ↓
Select Session
 ↓
Load Registered Students
 ↓
Enter Marks
 ↓
Validate
 ↓
Save Draft
 ↓
Submit
```

---

# 32. Marks Draft

Teachers may save incomplete marks as draft if permitted.

Example:

```text
35 / 40 students entered
```

The system should clearly show incomplete entry.

---

# 33. Marks Submission

Once marks are submitted:

```text
DRAFT
 ↓
SUBMITTED
```

Further edits may require additional permission.

---

# 34. Marks Locking

After verification:

```text
SUBMITTED
 ↓
LOCKED
```

Locked marks cannot be casually changed.

---

# 35. Marks Correction

Authorized users may correct marks after submission/locking.

Example:

```text
84
 ↓
Correction
 ↓
89
```

Require a reason where configured.

---

# 36. Marks Correction Audit

Record:

```text
Old Marks
New Marks
Changed By
Changed At
Reason
```

---

# 37. Teacher Marks Entry

Teachers should normally see only:

```text
Assigned Subjects
Assigned Classes
Assigned Batches
```

They should not automatically access all institution-wide exams.

---

# 38. Bulk Marks Entry

The system should support efficient entry:

```text
Student 1 → 82
Student 2 → 76
Student 3 → 91
...
```

---

# 39. Bulk Import Marks

If supported:

```text
Upload
 ↓
Validate Student IDs
 ↓
Validate Exam Session
 ↓
Validate Marks
 ↓
Preview
 ↓
Import
```

---

# 40. Exam Result Calculation

Result processing may calculate:

```text
Total Marks
Percentage
Grade
Pass / Fail
Rank
Subject Result
Overall Result
```

The exact calculation depends on configured grading rules.

---

# 41. Total Marks

Example:

```text
Math = 80
Physics = 75
Chemistry = 90

Total = 245
```

---

# 42. Percentage

Example:

```text
Marks Obtained = 245
Maximum = 300

Percentage = 81.67%
```

Do not use floating-point assumptions that cause visible rounding errors.

---

# 43. Passing Rules

Passing may be based on:

```text
Overall Percentage
Subject Minimum
Both
```

Example:

```text
Overall >= 40%
AND
Each Subject >= 33%
```

Rules must be configurable.

---

# 44. Grading System

Examples:

```text
A+
A
B+
B
C
D
F
```

or numerical grading:

```text
Grade Point
```

The grading system should be configurable.

---

# 45. Grade Configuration

Conceptually:

```text
90–100 → A+
80–89 → A
70–79 → B+
60–69 → B
50–59 → C
40–49 → D
<40 → F
```

These are examples only.

Do not hard-code them globally.

---

# 46. Rank Calculation

If ranking is enabled:

```text
Student
 ↓
Total / Weighted Score
 ↓
Rank
```

Tie-handling rules must be explicitly configured.

---

# 47. Ranking Privacy

If rank is not enabled for the institution, do not expose it.

Avoid automatically showing comparative student performance.

---

# 48. Weighted Subjects

Some exams may use weights.

Example:

```text
Mathematics → 40%
Physics → 30%
Chemistry → 30%
```

Result calculation must use configured weights.

---

# 49. Negative Marking

Coaching tests may support negative marking.

Example:

```text
Correct = +4
Wrong = -1
Unattempted = 0
```

Negative-marking rules must be configured at the exam/session level.

---

# 50. Question-Level Assessment

If an online assessment system exists, question-level scoring may feed into the examination module.

Architecture:

```text
Questions
 ↓
Responses
 ↓
Question Scoring
 ↓
Exam Session Marks
 ↓
Result
```

Do not duplicate assessment logic inside basic marks-entry screens.

---

# 51. Exam Result Status

Possible states:

```text
NOT_STARTED
PROCESSING
READY
PUBLISHED
REVISED
```

---

# 52. Result Processing

Recommended workflow:

```text
Marks Complete
 ↓
Validate
 ↓
Calculate
 ↓
Review
 ↓
Approve
 ↓
Publish
```

---

# 53. Result Validation

Before publishing:

```text
All Required Marks Entered
No Invalid Marks
Grading Rules Valid
Passing Rules Valid
Exam Completed
Required Attendance/Eligibility Rules Satisfied
```

only where configured.

---

# 54. Result Approval

If approval is required:

```text
RESULT_READY
 ↓
APPROVAL
 ↓
APPROVED
 ↓
PUBLISHED
```

---

# 55. Result Publishing

Publishing makes results visible to permitted users.

Possible visibility:

```text
Student
Guardian
Teacher
Administrator
```

according to permissions.

---

# 56. Result Revision

If a published result changes:

```text
PUBLISHED
 ↓
REVISION
 ↓
RECALCULATE
 ↓
APPROVE
 ↓
REPUBLISH
```

The previous result version should remain auditable.

---

# 57. Result Versioning

A result may maintain:

```text
Version 1
Version 2
Version 3
```

This is useful for marks corrections and rechecking.

---

# 58. Rechecking

If supported:

```text
Student
 ↓
Request Recheck
 ↓
Review
 ↓
Marks Updated / No Change
 ↓
Result Revised
```

---

# 59. Rechecking Permission

Only authorized users should approve or modify rechecking outcomes.

---

# 60. Rechecking Audit

Record:

```text
Request Date
Requested By
Original Marks
Reviewed Marks
Final Marks
Reviewer
Reason
```

---

# 61. Exam Schedule Visibility

Before publishing:

```text
Draft
→ Internal Only
```

After publishing:

```text
Students / Guardians
→ See Schedule
```

depending on configured permissions.

---

# 62. Exam Calendar

A calendar may show:

```text
10 Sep → Mathematics
12 Sep → Physics
14 Sep → Chemistry
```

---

# 63. Exam Dashboard

Administrators may see:

```text
Upcoming Exams
Ongoing Exams
Completed Exams
Pending Marks
Results Awaiting Approval
Published Results
```

---

# 64. Teacher Dashboard

Teachers may see:

```text
My Exams
My Sessions
Marks Pending
Marks Submitted
Correction Requests
```

within their scope.

---

# 65. Student Dashboard

Students may see:

```text
Upcoming Exams
Exam Schedule
Results
Subject Marks
Grades
```

according to access permissions.

---

# 66. Guardian Dashboard

Guardians may see permitted child information:

```text
Exam Schedule
Published Results
Grades
Subject Performance
```

---

# 67. Exam Search

Search by:

```text
Exam Name
Exam Code
Exam Type
Subject
Class
Batch
Academic Year
```

---

# 68. Exam Filters

Useful filters:

```text
Academic Year
Branch
Program
Course
Class
Batch
Exam Type
Status
Date
```

---

# 69. Exam List

Recommended columns:

```text
Exam
Type
Academic Year
Class / Program
Date
Status
Sessions
Actions
```

---

# 70. Exam Detail

The detail page should provide:

```text
Exam Header
 ↓
Overview
 ↓
Academic Context
 ↓
Schedule
 ↓
Eligible Students
 ↓
Marks
 ↓
Results
 ↓
Audit
```

---

# 71. Session Detail

Session detail may show:

```text
Subject
Date
Time
Duration
Maximum Marks
Passing Marks
Students
Attendance
Marks
Invigilator
```

only where applicable.

---

# 72. Exam Room / Location

If supported:

```text
Room
Building
Floor
Seat Capacity
```

must be validated against scheduling rules.

---

# 73. Invigilator Assignment

If supported:

```text
Exam Session
 ↓
Invigilator
```

Teacher/staff access must follow the authorization model.

---

# 74. Exam Conflict Detection

Potential conflicts:

```text
Same Class
Same Student
Same Teacher
Same Room
Overlapping Time
```

The system should detect relevant conflicts.

---

# 75. Student Exam Conflict

A student should not normally be scheduled for two mandatory exams at the same time.

---

# 76. Room Capacity

If room scheduling exists:

```text
Room Capacity = 40
Candidates = 45
```

must trigger a validation error.

---

# 77. Exam Attendance vs Daily Attendance

Do not automatically treat:

```text
Exam Absence
```

as equivalent to:

```text
Daily Class Absence
```

They are different records and contexts.

---

# 78. Academic Year Isolation

An exam must belong to a valid academic year.

Historical exams must remain associated with the year in which they occurred.

---

# 79. Promotion Interaction

After promotion:

```text
Old Exam
 ↓
Old Enrollment
```

remains unchanged.

New exams use the new enrollment.

---

# 80. Transfer Interaction

If a student transfers before an exam:

```text
Old Enrollment
 ↓
Transfer
 ↓
New Enrollment
```

Exam eligibility must be recalculated according to the transfer rules.

Do not silently change historical exam records.

---

# 81. Withdrawal Interaction

A withdrawn student should not automatically appear as an active candidate for future exams.

Historical exam participation remains intact.

---

# 82. Tenant Isolation

All examination queries must respect tenant boundaries.

Never allow one tenant to access another tenant's:

```text
Exams
Schedules
Marks
Results
Students
```

---

# 83. Branch Isolation

Where branch-level restrictions apply, users must only see exams within authorized branches.

---

# 84. Permission Model

Potential permissions:

```text
exam.read
exam.create
exam.update
exam.schedule
exam.publish
exam.manage_marks
exam.correct_marks
exam.lock_marks
exam.process_results
exam.publish_results
exam.recheck
exam.export
```

Use the centralized permission architecture.

---

# 85. Permission-Aware UI

Example:

```text
No exam.create
→ Hide Create

No exam.schedule
→ Hide Schedule

No exam.manage_marks
→ Hide Marks Entry

No exam.publish_results
→ Hide Publish
```

Backend authorization is mandatory.

---

# 86. Marks Access

Teachers should only edit marks they are authorized to manage.

Students and guardians should only see published results.

---

# 87. Result Privacy

Do not expose another student's marks through:

```text
Search
URL
API
Export
Client-side state
```

---

# 88. Audit Trail

Important events:

```text
Exam Created
Exam Updated
Schedule Changed
Exam Published
Student Registered
Attendance Marked
Marks Entered
Marks Submitted
Marks Corrected
Marks Locked
Result Calculated
Result Approved
Result Published
Result Revised
Recheck Processed
```

---

# 89. Concurrency

Prevent conflicting marks updates.

Example:

```text
Teacher A → Marks = 84
Teacher B → Marks = 91
```

The system should detect conflicting edits where necessary.

---

# 90. Transaction Safety

Operations such as:

```text
Result Calculation
Result Publishing
Bulk Marks Import
Marks Locking
```

must maintain consistent state.

---

# 91. Bulk Operations

Possible bulk actions:

```text
Register Students
Enter Marks
Import Marks
Publish Results
Export Results
```

Each action requires appropriate authorization.

---

# 92. Bulk Result Processing

For large exams:

```text
Validate All
 ↓
Calculate All
 ↓
Generate Errors
 ↓
Review
 ↓
Commit
```

Avoid silently publishing incomplete results.

---

# 93. Performance

The examination module should support large exams.

Use:

```text
Pagination
Indexed Queries
Bulk Operations
Server-Side Filtering
Efficient Result Aggregation
Background Processing
```

where appropriate.

---

# 94. Background Processing

Large result calculations may be processed asynchronously.

Example:

```text
Start Result Processing
 ↓
Processing
 ↓
Complete
 ↓
Notify Authorized User
```

The UI must clearly communicate processing status.

---

# 95. Mobile Exam Management

Mobile users should be able to:

```text
View Exams
View Schedules
Enter Marks where authorized
Review Results
```

Complex bulk operations may be optimized for desktop.

---

# 96. Mobile Marks Entry

Prioritize:

```text
Student
Marks
Status
Save
Next Student
```

Avoid excessive navigation.

---

# 97. Empty States

Examples:

```text
No exams scheduled.
```

```text
No students are eligible for this exam.
```

```text
Marks have not been entered yet.
```

---

# 98. Loading States

Provide clear loading indicators for:

```text
Exam List
Schedule
Eligible Students
Marks
Result Processing
Result Reports
```

---

# 99. Error Handling

Use actionable messages.

Example:

```text
Results cannot be published because 4 students are missing marks.
```

Not:

```text
ValidationException.
```

---

# 100. Examination Module Checklist

```text
☐ Exam creation
☐ Exam types
☐ Exam lifecycle
☐ Exam sessions
☐ Exam scheduling
☐ Subject association
☐ Exam eligibility
☐ Student registration
☐ Registration deadlines
☐ Exam attendance
☐ Marks entry
☐ Marks validation
☐ Absent handling
☐ Exemption handling
☐ Marks submission
☐ Marks locking
☐ Marks correction
☐ Marks audit
☐ Bulk marks entry
☐ Marks import
☐ Result calculation
☐ Passing rules
☐ Grading rules
☐ Weighted subjects
☐ Negative marking
☐ Ranking if enabled
☐ Result processing
☐ Result approval
☐ Result publishing
☐ Result revision
☐ Result versioning
☐ Rechecking
☐ Exam calendar
☐ Exam dashboard
☐ Student visibility
☐ Guardian visibility
☐ Teacher visibility
☐ Tenant isolation
☐ Branch isolation
☐ Academic-year isolation
☐ Permission enforcement
☐ Audit trail
☐ Concurrency protection
☐ Transaction safety
☐ Performance optimization
☐ Responsive UI
```

---

# 101. Definition of Done

The Examination module is complete when an authorized institution user can:

```text
Create Exam
     ↓
Configure Sessions
     ↓
Schedule Subjects
     ↓
Determine Eligibility
     ↓
Register Students
     ↓
Conduct Exam
     ↓
Record Attendance
     ↓
Enter Marks
     ↓
Validate Marks
     ↓
Lock Marks
     ↓
Calculate Results
     ↓
Approve Results
     ↓
Publish Results
     ↓
Handle Corrections / Rechecking
     ↓
Preserve Complete History
```

without compromising:

```text
Academic Context
Enrollment Integrity
Result Accuracy
Student Privacy
Tenant Isolation
Branch Isolation
Authorization
Auditability
Historical Records
```

---

# 102. Final Principle

> **An examination is a controlled academic event whose schedule, eligibility, attendance, marks, and results must remain historically consistent. Never overwrite published academic results without versioning and auditability. Marks must be validated against the correct exam session, student enrollment, and grading rules. Exam access and result visibility must always respect tenant, branch, academic, and permission boundaries.**

---

# 103. Next Document

```text
52-RESULTS-GRADING-REPORT-CARDS.md
```

The next document will specialize in:

```text
Result Processing
Grade Calculation
Percentage
GPA / Grade Points
Pass / Fail
Rank
Subject Results
Overall Results
Report Cards
Mark Sheets
Result Publishing
Result Revision
Result Versioning
Student Performance
Academic Analytics
```

---

# END OF DOCUMENT
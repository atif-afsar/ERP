# ATTENDANCE MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `50-ATTENDANCE-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Attendance Management Specification  
**Previous Document:** `49-STUDENT-ENROLLMENT-PROMOTION-MANAGEMENT.md`  
**Next Document:** `51-EXAMINATION-MANAGEMENT.md`

---

# 1. Purpose

The Attendance Management module records, manages, corrects, locks, and reports attendance across the institution.

It must support:

```text
Student Attendance
Staff Attendance
Daily Attendance
Subject Attendance
Class Attendance
Section Attendance
Batch Attendance
Present
Absent
Late
Half Day
Excused
Attendance Corrections
Bulk Attendance
Attendance Reports
Attendance Percentage
Attendance History
```

The module must work for both:

```text
School
Coaching Centre
```

without forcing both models into the same workflow.

---

# 2. Core Principle

Attendance belongs to an academic and/or employment context.

For students:

```text
Student
 ↓
Enrollment
 ↓
Academic Context
 ↓
Attendance
```

For staff:

```text
Staff
 ↓
Employment Context
 ↓
Attendance
```

Attendance must never depend only on the student's current class or batch because that can change over time.

---

# 3. Student Attendance vs Staff Attendance

These are separate domains.

```text
Student Attendance
→ Academic participation

Staff Attendance
→ Employee attendance
```

Do not mix them into one generic workflow merely to reduce implementation effort.

---

# 4. Attendance Record

Conceptually:

```text
Attendance
----------
id
studentId / staffId
enrollmentId / employmentContext
date
status
markedAt
markedBy
remarks
createdAt
updatedAt
```

The exact schema must follow the canonical database design.

---

# 5. Attendance Status

Core statuses:

```text
PRESENT
ABSENT
LATE
HALF_DAY
EXCUSED
```

The final status list must follow the product's configured attendance rules.

---

# 6. Status Meaning

### PRESENT

Student/staff member attended normally.

### ABSENT

Did not attend.

### LATE

Attended but arrived after the defined threshold.

### HALF_DAY

Attended for only part of the expected period.

### EXCUSED

Absence is officially excused.

---

# 7. Attendance Date

Every attendance record belongs to a specific date.

Example:

```text
2026-09-02
```

The system must use the organization's configured timezone when determining attendance dates.

---

# 8. Attendance Context

Attendance may be associated with:

```text
Academic Year
Branch
Class
Section
Batch
Subject
Enrollment
```

Only relevant relationships should be populated.

---

# 9. Daily Attendance

Daily attendance records overall attendance.

Example:

```text
Class 10A
2026-09-02

Ahmed → Present
Rahul → Present
Sara → Absent
```

---

# 10. Subject Attendance

Subject-based attendance records attendance for a particular class/session/subject.

Example:

```text
Mathematics
2026-09-02
10:00 AM

Ahmed → Present
Rahul → Late
Sara → Absent
```

---

# 11. Class Attendance

Class-level attendance allows authorized users to mark attendance for an entire class or section.

Example:

```text
Class 10
Section A
 ↓
Today's Attendance
```

---

# 12. Batch Attendance

Coaching centres may primarily operate through batches.

Example:

```text
JEE Batch A
 ↓
Today's Attendance
```

---

# 13. Session Attendance

If the scheduling system supports sessions, attendance can be linked to a specific session.

Example:

```text
Physics
 ↓
Batch A
 ↓
Session
 ↓
Attendance
```

This prevents ambiguity when multiple classes occur on the same day.

---

# 14. Attendance Workflow

Typical workflow:

```text
Select Academic Context
        ↓
Select Date
        ↓
Load Eligible Students
        ↓
Mark Attendance
        ↓
Review
        ↓
Save
        ↓
Lock / Finalize
```

---

# 15. Eligible Students

The system should load students based on valid active enrollment.

Example:

```text
Batch A
 ↓
Active Enrollments
 ↓
Attendance Roster
```

Withdrawn or inactive enrollments should not appear as normal attendance candidates.

---

# 16. Teacher Attendance Workflow

A teacher may see:

```text
My Classes
My Sections
My Batches
My Subjects
```

Then:

```text
Select Class
 ↓
Select Date / Session
 ↓
Mark Attendance
```

Access must be limited to authorized academic scope.

---

# 17. Attendance Roster

The roster should display:

```text
Student Name
Admission Number
Photo
Attendance Status
Remarks
```

Where useful, show:

```text
Current Attendance %
```

but avoid unnecessary clutter.

---

# 18. Quick Marking

Attendance should support fast actions:

```text
Mark All Present
Mark All Absent
Reset
```

The user can then adjust individual students.

These actions must be permission-controlled.

---

# 19. Individual Marking

Each student should allow direct selection:

```text
Present
Absent
Late
Half Day
Excused
```

Use a clear visual state.

---

# 20. Bulk Attendance

The system must support marking attendance for multiple students efficiently.

Example:

```text
50 Students
 ↓
Mark All Present
 ↓
Change 3 Students
 ↓
Save
```

---

# 21. Attendance Remarks

Remarks may be added when necessary.

Example:

```text
Late:
Traffic delay
```

or:

```text
Excused:
Medical leave
```

Remarks should not be mandatory unless configured.

---

# 22. Attendance Validation

Before saving:

```text
Valid Student
Valid Enrollment
Valid Date
Valid Academic Context
Valid Status
Valid Permission
Tenant Match
Branch Match
```

---

# 23. Duplicate Attendance Prevention

The system should prevent duplicate records for the same attendance context.

For example, if attendance is daily:

```text
Student
+
Enrollment
+
Date
```

should normally identify a unique attendance record.

If session-based attendance is used:

```text
Student
+
Session
```

may be the relevant uniqueness constraint.

---

# 24. Attendance Correction

Authorized users may correct attendance.

Example:

```text
Absent
 ↓
Correction
 ↓
Present
```

The correction should be audited.

---

# 25. Correction Reason

Important attendance corrections may require:

```text
Reason
```

Example:

```text
Teacher accidentally marked absent.
```

The requirement should depend on institutional configuration.

---

# 26. Correction Audit

Record:

```text
Old Status
New Status
Changed By
Changed At
Reason
```

This creates accountability.

---

# 27. Attendance Locking

Attendance may be locked after a defined period.

Example:

```text
Attendance Date
 ↓
Teacher Marks
 ↓
Save
 ↓
Lock
```

Once locked, ordinary users cannot modify it.

---

# 28. Attendance Unlock

If corrections are allowed after locking:

```text
Locked
 ↓
Authorized Unlock
 ↓
Correction
 ↓
Re-lock
```

Unlocking should be audited.

---

# 29. Lock Permissions

Potential permissions:

```text
attendance.lock
attendance.unlock
attendance.correct
```

The exact names must match the centralized permission model.

---

# 30. Automatic Locking

The institution may configure:

```text
Lock after 24 hours
Lock after 48 hours
Lock at end of day
Manual lock
```

Only configured policies should be applied.

---

# 31. Staff Attendance

Staff attendance may use:

```text
Present
Absent
Late
Half Day
Leave
```

The staff attendance status model may differ from student attendance.

Do not force student attendance statuses onto employees.

---

# 32. Staff Attendance Workflow

Example:

```text
Staff Attendance
 ↓
Select Branch
 ↓
Select Date
 ↓
Load Active Staff
 ↓
Mark Attendance
 ↓
Save
```

---

# 33. Staff Scope

A branch manager should normally see staff within their authorized branch.

A teacher should not automatically see all employee attendance.

---

# 34. Attendance Calendar

A calendar view may show attendance history.

Example:

```text
September 2026

1  P
2  P
3  A
4  P
5  L
```

This is useful for individual attendance review.

---

# 35. Attendance Percentage

For a student:

```text
Attendance %
=
Eligible Attendance Units Attended
÷
Eligible Attendance Units
× 100
```

The exact treatment of:

```text
Late
Half Day
Excused
```

must follow configured rules.

---

# 36. Attendance Calculation Rules

Example configuration:

```text
Present = 1
Late = 1
Half Day = 0.5
Absent = 0
Excused = Excluded
```

Do not hard-code these assumptions if the system supports configurable policies.

---

# 37. Subject Attendance Percentage

A student may have different attendance percentages by subject.

Example:

```text
Mathematics → 92%
Physics → 86%
Chemistry → 74%
```

---

# 38. Overall Attendance

Overall attendance should aggregate only attendance units belonging to the relevant academic context.

Do not mix:

```text
Previous Academic Year
```

into:

```text
Current Academic Year
```

unless explicitly requested.

---

# 39. Attendance Period

Reports may be generated for:

```text
Today
This Week
This Month
Academic Year
Custom Date Range
```

---

# 40. Attendance Dashboard

Administrators may see:

```text
Today's Attendance
Present Count
Absent Count
Late Count
Attendance Rate
Low Attendance Students
```

---

# 41. Teacher Dashboard

Teachers may see:

```text
Today's Classes
Attendance Pending
Attendance Completed
Recent Attendance
Low Attendance Students
```

Only within their authorized academic scope.

---

# 42. Student Dashboard

Students may see:

```text
Current Attendance %
Recent Attendance
Subject Attendance
Absent Days
Late Days
```

subject to permissions and product scope.

---

# 43. Parent / Guardian Visibility

If parent access is implemented, guardians may see:

```text
Child Attendance
Attendance Percentage
Recent Absences
Recent Late Marks
```

They should not receive unrestricted institutional attendance data.

---

# 44. Low Attendance Detection

The system may flag students below a configured threshold.

Example:

```text
Attendance < 75%
```

The threshold must be configurable.

---

# 45. Attendance Alerts

If notifications are supported:

```text
Student Absent
 ↓
Parent Notification
```

or:

```text
Attendance < Threshold
 ↓
Alert
```

Only configured notification workflows should execute.

---

# 46. Absence Notification

A parent notification may contain:

```text
Student Name
Date
Class / Batch
Attendance Status
```

Avoid exposing unnecessary information.

---

# 47. Attendance Reports

Reports may include:

```text
Daily Attendance
Monthly Attendance
Student Attendance
Class Attendance
Section Attendance
Batch Attendance
Subject Attendance
Teacher Attendance
Low Attendance Report
```

---

# 48. Daily Attendance Report

Example:

```text
Date: 2026-09-02
Class: 10A

Present: 35
Absent: 3
Late: 2
```

---

# 49. Student Attendance Report

Example:

```text
Ahmed Khan

Academic Year: 2026–27

Present: 164
Absent: 8
Late: 4
Attendance: 93.2%
```

---

# 50. Class Attendance Report

Example:

```text
Class 10A

Total Students: 40
Present: 36
Absent: 3
Late: 1
Attendance Rate: 92.5%
```

---

# 51. Subject Attendance Report

Example:

```text
Physics

Ahmed → 91%
Rahul → 88%
Sara → 73%
```

---

# 52. Batch Attendance Report

For coaching:

```text
JEE Batch A

Total Students: 50
Today's Present: 45
Absent: 3
Late: 2
```

---

# 53. Attendance Trends

The system may display:

```text
Week 1 → 91%
Week 2 → 88%
Week 3 → 94%
Week 4 → 92%
```

This can help identify attendance patterns.

---

# 54. Attendance Export

Authorized users may export:

```text
Student
Admission Number
Date
Class / Batch
Subject
Status
Marked By
```

Exports must respect scope and permissions.

---

# 55. Attendance Import

If supported:

```text
Upload File
 ↓
Validate Students
 ↓
Validate Dates
 ↓
Validate Context
 ↓
Preview
 ↓
Import
```

Invalid rows should be clearly reported.

---

# 56. Device / Biometric Integration

If external attendance devices are supported:

```text
Biometric Device
 ↓
Integration Layer
 ↓
Attendance Processing
 ↓
Attendance Record
```

External identifiers should not replace internal student/staff IDs.

---

# 57. Manual vs Imported Attendance

The system should distinguish where useful:

```text
MANUAL
IMPORTED
DEVICE
SYSTEM
```

This improves auditability.

---

# 58. Attendance Source

Conceptually:

```text
attendanceSource
```

may identify how the record was created.

---

# 59. Attendance Audit Trail

Important events:

```text
Attendance Created
Attendance Updated
Attendance Corrected
Attendance Locked
Attendance Unlocked
Attendance Imported
Bulk Attendance Marked
```

---

# 60. Bulk Attendance Audit

Record:

```text
Actor
Date
Context
Number of Students
Statuses Changed
Timestamp
```

---

# 61. Attendance Permissions

Potential permissions:

```text
attendance.read
attendance.create
attendance.update
attendance.correct
attendance.lock
attendance.unlock
attendance.export
attendance.import
attendance.manage
```

Use the centralized permission system.

---

# 62. Teacher Permissions

A teacher may have:

```text
Read Assigned Students
Mark Attendance
Correct Own Recent Attendance
```

depending on configuration.

They should not automatically receive:

```text
Global Attendance Management
```

---

# 63. Administrator Permissions

Authorized administrators may:

```text
View Attendance
Correct Attendance
Lock Attendance
Unlock Attendance
Generate Reports
Manage Attendance Policies
```

---

# 64. Branch Manager Permissions

Branch managers should operate within their authorized branch.

---

# 65. Tenant Isolation

Attendance queries must always enforce tenant boundaries.

Never allow:

```text
Tenant A
 ↓
Attendance
 ↓
Tenant B Student
```

---

# 66. Branch Isolation

Where branch restrictions apply:

```text
Branch A User
```

must not access:

```text
Branch B Attendance
```

unless explicitly authorized.

---

# 67. Academic Year Isolation

Attendance queries must respect academic context.

Example:

```text
2025–26 Attendance
```

must not silently appear in:

```text
2026–27 Current Attendance
```

---

# 68. Historical Attendance

Historical attendance must remain available after:

```text
Promotion
Transfer
Batch Change
Academic Year Closure
```

---

# 69. Transfer Handling

When a student changes batch:

```text
Old Batch Attendance
```

remains associated with the old academic context.

Future attendance uses:

```text
New Batch
```

---

# 70. Promotion Handling

After promotion:

```text
Class 9 Attendance
```

remains historical.

New attendance belongs to:

```text
Class 10 Enrollment
```

---

# 71. Withdrawal Handling

After withdrawal:

```text
Active Attendance Eligibility
 ↓
Stops
```

but historical attendance remains accessible.

---

# 72. Attendance Date Rules

The system should prevent attendance being recorded outside valid enrollment periods unless an authorized correction is performed.

Example:

```text
Enrollment starts:
2026-07-01

Attendance:
2026-06-15
```

should normally be rejected.

---

# 73. Future Attendance

Future attendance should normally not be created unless the system explicitly supports advance attendance scheduling.

---

# 74. Locked Record Protection

If attendance is locked:

```text
Teacher
 ↓
Edit
 ↓
Denied
```

Authorized correction workflows may still operate.

---

# 75. Concurrency

Prevent duplicate attendance when multiple users mark attendance simultaneously.

Example:

```text
Teacher A → Marks Class 10A
Teacher B → Marks Class 10A
```

The backend must handle the race safely.

---

# 76. Transaction Safety

Bulk attendance should be transaction-safe according to the selected consistency model.

A failed operation must not leave misleading partial state without clearly reporting what happened.

---

# 77. Performance

The system should efficiently support large rosters.

Use:

```text
Pagination
Batch Queries
Indexed Foreign Keys
Server-Side Filtering
Bulk Writes
Optimized Aggregations
```

where appropriate.

---

# 78. Mobile Attendance

Attendance marking must be optimized for mobile.

Priority:

```text
Select Class / Batch
 ↓
Today's Roster
 ↓
One-Tap Status
 ↓
Save
```

Avoid unnecessary navigation.

---

# 79. Mobile Quick Actions

Useful controls:

```text
Mark All Present
Search Student
Filter Absent
Filter Pending
Save
```

---

# 80. Desktop Attendance

Desktop may provide:

```text
Dense Roster
Bulk Controls
Filters
Summary Cards
Reports
```

while maintaining the same underlying logic.

---

# 81. Offline Consideration

If offline attendance is supported:

```text
Device
 ↓
Temporary Local Records
 ↓
Sync
 ↓
Conflict Detection
 ↓
Server Confirmation
```

Offline mode should not be assumed unless implemented.

---

# 82. Empty States

Examples:

```text
No students are currently enrolled in this batch.
```

```text
Attendance has not been marked for today.
```

```text
No attendance records found for this period.
```

---

# 83. Loading States

Provide loading states for:

```text
Roster
Attendance History
Reports
Dashboard
Attendance Calculations
```

---

# 84. Error Handling

Use actionable errors.

Example:

```text
Attendance cannot be saved because the selected enrollment is no longer active.
```

Not:

```text
Database constraint violation.
```

---

# 85. Permission-Aware UI

Example:

```text
No attendance.create
→ Hide Mark Attendance

No attendance.correct
→ Hide Correction

No attendance.unlock
→ Hide Unlock

No attendance.export
→ Hide Export
```

Backend authorization remains mandatory.

---

# 86. Attendance Module Checklist

```text
☐ Student attendance
☐ Staff attendance
☐ Daily attendance
☐ Subject attendance
☐ Class attendance
☐ Section attendance
☐ Batch attendance
☐ Session attendance
☐ Attendance statuses
☐ Attendance roster
☐ Quick marking
☐ Bulk marking
☐ Remarks
☐ Attendance correction
☐ Correction reason
☐ Attendance locking
☐ Unlock workflow
☐ Attendance percentage
☐ Attendance rules
☐ Low attendance detection
☐ Notifications if enabled
☐ Attendance dashboard
☐ Attendance reports
☐ Attendance export
☐ Attendance import if enabled
☐ Device integration if enabled
☐ Audit trail
☐ Historical attendance
☐ Promotion handling
☐ Transfer handling
☐ Withdrawal handling
☐ Tenant isolation
☐ Branch isolation
☐ Academic-year isolation
☐ Permission enforcement
☐ Mobile-first UI
☐ Performance optimization
```

---

# 87. Definition of Done

The Attendance module is complete when an authorized user can:

```text
Select Academic Context
        ↓
Load Eligible Roster
        ↓
Mark Attendance
        ↓
Review
        ↓
Save
        ↓
Correct When Authorized
        ↓
Lock
        ↓
Generate Reports
```

while preserving:

```text
Student History
Staff History
Academic Context
Enrollment Integrity
Tenant Isolation
Branch Isolation
Auditability
Authorization
```

---

# 88. Final Principle

> **Attendance is a historical operational record tied to a valid student enrollment, academic context, or staff employment context. Never overwrite historical attendance because a student is promoted, transferred, withdrawn, or moved between batches. Attendance corrections must be permission-controlled and auditable, locked records must remain protected, and every query must respect tenant, branch, academic-year, and user-access boundaries.**

---

# 89. Next Document

```text
51-EXAMINATION-MANAGEMENT.md
```

The next module will define:

```text
Exam Creation
Exam Types
Exam Schedules
Subjects
Exam Eligibility
Exam Sessions
Question / Assessment Context
Student Exam Registration
Marks Entry
Marks Validation
Result Processing
Teacher Marks Entry
Exam Status
Exam Publishing
Rechecking
Result History
```

---

# END OF DOCUMENT
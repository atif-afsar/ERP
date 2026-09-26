# ACADEMIC STRUCTURE & ENROLLMENT
# School + Coaching Centre ERP SaaS

**Document:** `12-ACADEMIC-STRUCTURE-AND-ENROLLMENT.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `11-CORE-USER-STAFF-STUDENT-PARENT-FLOWS.md`  
**Next Document:** `13-ATTENDANCE-MANAGEMENT.md`

---

# 1. Purpose

This document defines how the ERP organizes academic structures and connects students and teachers to them.

The system must support two primary institution models:

```text
SCHOOL
```

and:

```text
COACHING CENTRE
```

The architecture should share common concepts while allowing each institution type to use its own academic structure.

---

# 2. Core Academic Architecture

The common hierarchy is:

```text
TENANT
  ↓
ACADEMIC YEAR
  ↓
ACADEMIC STRUCTURE
  ↓
STUDENTS
  ↓
ENROLLMENTS
```

The exact academic structure depends on the tenant type.

---

# 3. School Academic Structure

For a school:

```text
School
 ↓
Academic Year
 ↓
Class
 ↓
Section
 ↓
Subject
 ↓
Teacher Assignment
 ↓
Student Enrollment
```

Example:

```text
2026–27
 ↓
Class 10
 ↓
Section A
 ↓
Mathematics
 ↓
Mr. Sharma
```

---

# 4. Coaching Centre Academic Structure

For a coaching centre:

```text
Coaching Centre
 ↓
Academic Year
 ↓
Course
 ↓
Batch
 ↓
Subject
 ↓
Teacher Assignment
 ↓
Student Enrollment
```

Example:

```text
2026–27
 ↓
JEE Preparation
 ↓
Morning Batch
 ↓
Physics
 ↓
Mr. Sharma
```

---

# 5. Academic Year

An Academic Year represents the period during which academic activity occurs.

Example:

```text
2026–27
```

It should have:

```text
Name
Start Date
End Date
Status
```

Possible statuses:

```text
Draft
Upcoming
Active
Completed
Archived
```

---

# 6. Academic Year Rules

Only one academic year should normally be marked as the current active year for a tenant unless the product explicitly supports multiple concurrent academic periods.

Historical years must remain accessible to authorized users.

---

# 7. Academic Year Creation

Flow:

```text
Settings
 ↓
Academic Years
 ↓
Create Academic Year
 ↓
Name
 ↓
Start Date
 ↓
End Date
 ↓
Save
```

---

# 8. Academic Year Activation

A year should not become active accidentally.

Recommended flow:

```text
Draft
 ↓
Review
 ↓
Activate
```

Activation should be restricted to authorized administrators.

---

# 9. Academic Year Completion

At the end of the period:

```text
Active
 ↓
Completed
```

Historical enrollments, attendance, fees, exams, and results must remain associated with the completed academic year.

---

# 10. School Class

A Class represents an academic grade/level.

Examples:

```text
Class 1
Class 2
Class 3
...
Class 10
Class 12
```

The system should not hard-code the class list.

---

# 11. Class Configuration

A class can contain:

```text
Name
Code
Display Order
Status
```

Example:

```text
Name: Class 10
Code: C10
Display Order: 10
```

---

# 12. Class Ordering

The display order should allow:

```text
Class 1
Class 2
Class 3
...
Class 10
Class 11
Class 12
```

rather than alphabetical ordering.

---

# 13. Section

A Section divides a class into groups.

Example:

```text
Class 10
 ├── Section A
 ├── Section B
 └── Section C
```

A section belongs to a class within an academic context.

---

# 14. Section Configuration

Typical fields:

```text
Name
Code
Capacity
Status
```

Example:

```text
Section A
Capacity: 40
```

---

# 15. Section Capacity

If capacity is enabled:

```text
Current Students >= Capacity
```

should trigger a warning or prevent additional enrollment according to tenant configuration.

Do not silently exceed configured limits.

---

# 16. Coaching Course

A Course represents the academic program offered by a coaching centre.

Examples:

```text
JEE Preparation
NEET Preparation
Foundation
Class 10 Board Preparation
Mathematics Crash Course
```

---

# 17. Course Configuration

Typical fields:

```text
Course Name
Course Code
Description
Duration
Status
```

---

# 18. Coaching Batch

A Batch represents a scheduled group of students following a course.

Example:

```text
JEE Preparation
 ├── Morning Batch
 ├── Evening Batch
 └── Weekend Batch
```

---

# 19. Batch Configuration

Typical fields:

```text
Batch Name
Batch Code
Course
Start Date
End Date
Capacity
Status
```

---

# 20. Batch Timing

Where supported, a batch can define:

```text
Start Time
End Time
Days
Room
```

Detailed scheduling belongs to the timetable module.

---

# 21. Subject

A Subject represents an academic discipline.

Examples:

```text
Mathematics
Physics
Chemistry
English
Biology
Computer Science
```

Subjects should be tenant-configurable.

---

# 22. Subject Configuration

Typical fields:

```text
Subject Name
Subject Code
Description
Status
```

---

# 23. Subject Availability

Not every subject needs to belong to every class or course.

Example:

```text
Class 10
 ├── Mathematics
 ├── Science
 └── English
```

while another class may have additional subjects.

---

# 24. Subject Assignment

A subject can be associated with an academic structure.

School:

```text
Class 10A
 ↓
Mathematics
```

Coaching:

```text
JEE Morning Batch
 ↓
Physics
```

---

# 25. Teacher Assignment

A teacher assignment connects a teacher to an academic context.

School:

```text
Teacher
 ↓
Class
 ↓
Section
 ↓
Subject
```

Coaching:

```text
Teacher
 ↓
Course
 ↓
Batch
 ↓
Subject
```

---

# 26. Teacher Assignment Example

```text
Mr. Sharma
 ↓
Class 10
 ↓
Section A
 ↓
Mathematics
```

This means Mr. Sharma can perform permitted teacher actions for that scope.

---

# 27. Multiple Teacher Assignments

A teacher can have multiple assignments.

Example:

```text
Mr. Sharma
 ├── Class 10A Mathematics
 ├── Class 10B Mathematics
 └── Class 9A Mathematics
```

Each assignment should be separately represented.

---

# 28. Multiple Teachers

An academic group may have multiple teachers.

Example:

```text
Class 10A
 ↓
Mathematics
 ├── Teacher A
 └── Teacher B
```

Whether this is permitted should be controlled by the tenant's configuration and academic workflow.

---

# 29. Student Enrollment

Enrollment connects a student to an academic structure for a specific period.

School:

```text
Student
 ↓
Enrollment
 ↓
Academic Year
 ↓
Class
 ↓
Section
```

Coaching:

```text
Student
 ↓
Enrollment
 ↓
Academic Year
 ↓
Course
 ↓
Batch
```

---

# 30. Enrollment Is Time-Bound

A student's enrollment belongs to an academic period.

Example:

```text
Student A

2025–26 → Class 9A
2026–27 → Class 10A
```

Do not overwrite the previous enrollment.

---

# 31. Enrollment Status

Recommended states:

```text
Pending
Active
Completed
Transferred
Withdrawn
Cancelled
```

---

# 32. Active Enrollment

A student should normally have one active enrollment per relevant academic program/context unless the product explicitly supports multiple simultaneous enrollments.

---

# 33. Multiple Enrollments

A coaching student may legitimately be enrolled in multiple programs.

Example:

```text
Student A
 ├── JEE Preparation
 └── Board Preparation
```

The implementation should support this if the tenant's business model requires it.

---

# 34. Enrollment Date

Each enrollment should record when it began.

Example:

```text
Enrollment Date: 01-Apr-2026
```

This is important for:

- Reporting
- Fees
- Attendance
- Historical records
- Student lifecycle

---

# 35. Enrollment End Date

Where applicable:

```text
Start Date
End Date
```

should define the period of enrollment.

---

# 36. Enrollment History

Example:

```text
Student: Rahul

2025–26
Class 9A
Status: Completed

2026–27
Class 10A
Status: Active
```

This history must remain intact.

---

# 37. Student Promotion

At the end of a school year:

```text
Class 9A
 ↓
Promotion
 ↓
Class 10A
```

Promotion should create/update the next academic enrollment rather than rewriting historical data.

---

# 38. Promotion Workflow

```text
Select Academic Year
 ↓
Select Current Class
 ↓
Review Students
 ↓
Select Destination Class
 ↓
Select Section
 ↓
Confirm Promotion
 ↓
Create New Enrollment
```

---

# 39. Promotion Preview

Before committing a bulk promotion:

```text
Current
Class 9A

Destination
Class 10A

Students
42
```

Allow administrators to review the list.

---

# 40. Promotion Exceptions

Some students may:

```text
Repeat
Transfer
Withdraw
Graduate
Move to another program
```

The system must allow individual exceptions.

---

# 41. Repeat Year

A student repeating a class should preserve the previous enrollment.

Example:

```text
2025–26 → Class 9A → Completed
2026–27 → Class 9A → Active
```

Do not create a duplicate student.

---

# 42. Section Transfer

A student can move:

```text
Class 10A
 ↓
Class 10B
```

This should create an auditable enrollment/assignment change.

---

# 43. Batch Transfer

A coaching student can move:

```text
Morning Batch
 ↓
Evening Batch
```

The current enrollment should be updated according to the system's transfer model while preserving historical information.

---

# 44. Course Transfer

A coaching student may move:

```text
Foundation
 ↓
JEE Preparation
```

This should be represented as a new or changed enrollment according to the business rules.

---

# 45. Transfer Rules

A transfer must verify:

```text
Destination exists
Destination is active
Student is eligible
Capacity is available if enforced
User has permission
```

---

# 46. Enrollment Conflict Detection

Prevent or warn about:

```text
Duplicate active enrollment
Conflicting batch schedules
Invalid academic year
Inactive destination
Over-capacity destination
```

---

# 47. Enrollment Cancellation

If an enrollment was created incorrectly:

```text
Active
 ↓
Cancelled
```

Do not delete historical records without a strong reason.

---

# 48. Enrollment Withdrawal

When a student leaves:

```text
Active
 ↓
Withdrawn
```

The student record remains.

---

# 49. Enrollment Completion

At the end of the academic period:

```text
Active
 ↓
Completed
```

Historical academic records remain linked to the enrollment.

---

# 50. Academic Structure and Fees

Fees may depend on:

```text
Academic Year
Course
Class
Batch
Enrollment
Fee Plan
```

The academic structure must therefore remain stable enough for financial records to reference it.

Detailed fee architecture belongs to the finance module.

---

# 51. Academic Structure and Attendance

Attendance should reference the relevant academic context.

Example:

```text
Attendance
 ↓
Student
 ↓
Enrollment
 ↓
Class/Section or Batch
```

This prevents historical attendance from being incorrectly associated with a new class/batch.

---

# 52. Academic Structure and Exams

Exams should belong to an academic context.

Example:

```text
Exam
 ↓
Academic Year
 ↓
Class/Section
 ↓
Subject
```

or:

```text
Exam
 ↓
Course
 ↓
Batch
 ↓
Subject
```

---

# 53. Academic Structure and Results

Results should be connected to:

```text
Student
Enrollment
Exam
Subject
```

This allows historical results to remain correct even after a student changes class or batch.

---

# 54. Academic Structure and Homework

Homework should identify its academic scope.

Example:

```text
Homework
 ↓
Teacher
 ↓
Class/Section or Batch
 ↓
Subject
```

Students should only see homework applicable to their enrollment/scope.

---

# 55. Academic Structure and Timetable

Timetable entries should reference the relevant:

```text
Class
Section
OR
Batch
```

and:

```text
Subject
Teacher
Room
Time
```

---

# 56. Academic Structure Permissions

Based on the RBAC specification:

### Tenant Admin

Can manage academic structures.

### Teacher

Can view assigned structures and assignments.

### Staff

Can view/manage according to permissions.

### Parent

Can view the academic structure relevant to their children.

### Student

Can view their own academic context.

---

# 57. Academic Structure Navigation

School:

```text
Academics
 ├── Academic Years
 ├── Classes
 ├── Sections
 ├── Subjects
 ├── Teacher Assignments
 └── Enrollments
```

Coaching:

```text
Academics
 ├── Academic Years
 ├── Courses
 ├── Batches
 ├── Subjects
 ├── Teacher Assignments
 └── Enrollments
```

---

# 58. Academic Dashboard

Tenant Admin should be able to see:

```text
Active Academic Year
Active Classes/Courses
Active Sections/Batches
Total Students
Teacher Assignments
Enrollment Status
```

---

# 59. Class List

School class list should show:

```text
Class
Sections
Student Count
Teacher Count
Status
```

---

# 60. Batch List

Coaching batch list should show:

```text
Batch
Course
Timing
Student Count
Teacher Count
Status
```

---

# 61. Section List

Example:

```text
Class 10

Section A — 38 Students
Section B — 40 Students
Section C — 31 Students
```

---

# 62. Batch List Example

```text
JEE Preparation

Morning — 42 Students
Evening — 37 Students
Weekend — 29 Students
```

---

# 63. Student Enrollment List

Admin should be able to filter by:

```text
Academic Year
Class
Section
Course
Batch
Status
Enrollment Date
```

Only applicable filters should appear for the tenant type.

---

# 64. Teacher Assignment List

Show:

```text
Teacher
Class/Batch
Section
Subject
Status
```

---

# 65. Assignment Creation

Flow:

```text
Teacher Assignments
 ↓
Create Assignment
 ↓
Select Teacher
 ↓
Select Academic Context
 ↓
Select Subject
 ↓
Save
```

---

# 66. Assignment Validation

Before saving:

```text
Teacher exists
Teacher active
Academic structure exists
Subject exists
Tenant matches
No invalid duplicate assignment
```

---

# 67. Teacher Assignment Removal

If a teacher leaves a class:

```text
Assignment
 ↓
Deactivate/End
```

Do not delete historical assignment data if historical reports depend on it.

---

# 68. Academic Structure Archiving

Classes, sections, courses, and batches should support controlled deactivation/archive.

Example:

```text
Batch
 ↓
Inactive
```

Historical enrollments remain accessible.

---

# 69. Deactivated Structure

A deactivated class/batch should:

- Not appear in new enrollment selection.
- Remain visible in historical records.
- Remain available to authorized reporting.
- Not break historical attendance/results.

---

# 70. Academic Structure Naming

Tenant admins should be able to define names appropriate to their organization.

Do not hard-code:

```text
Class
Section
Batch
Course
```

into business logic where the tenant model can differ.

---

# 71. School vs Coaching Configuration

At tenant creation, the institution type should determine available academic structures.

```text
Tenant Type = SCHOOL
```

enables:

```text
Class
Section
```

while:

```text
Tenant Type = COACHING
```

enables:

```text
Course
Batch
```

Shared modules:

```text
Academic Year
Subject
Teacher
Student
Enrollment
```

---

# 72. Avoid Duplicate Architecture

Do not build two completely independent academic systems.

Prefer:

```text
Shared Academic Core
        |
   +----+----+
   |         |
 SCHOOL   COACHING
```

with tenant-type-specific structure.

---

# 73. Academic Context

Introduce a conceptual academic context:

```text
Academic Context
```

which can represent:

```text
School Class + Section
```

or:

```text
Course + Batch
```

This allows shared functionality such as:

```text
Attendance
Homework
Exams
Timetable
Teacher Assignments
```

without duplicating logic.

---

# 74. Academic Context Example

School:

```text
Class 10A
```

Coaching:

```text
JEE Morning Batch
```

Both can be treated as an academic context for shared modules.

---

# 75. Current Academic Context

A student's current context should be easily resolvable.

Example:

```text
Student
 ↓
Active Enrollment
 ↓
Class 10A
```

or:

```text
Student
 ↓
Active Enrollment
 ↓
JEE Morning Batch
```

---

# 76. Historical Context

When displaying historical records, use the context that existed at the time.

Example:

```text
Attendance — 15-Jul-2025
Class 9A
```

even if the student is now in:

```text
Class 10A
```

---

# 77. Do Not Derive History From Current Assignment

This is critical.

Do not query:

```text
Current Student Class
```

to determine historical attendance/class information.

Historical records should reference their appropriate academic period/context.

---

# 78. Bulk Enrollment

Admin/staff can enroll multiple students.

Flow:

```text
Select Students
 ↓
Select Academic Year
 ↓
Select Class/Section or Course/Batch
 ↓
Review
 ↓
Confirm
```

---

# 79. Bulk Enrollment Validation

Check:

```text
Duplicate enrollment
Inactive student
Inactive academic structure
Capacity
Academic year
Tenant ownership
```

---

# 80. Enrollment Search

Search by:

```text
Student Name
Student ID
Enrollment ID
Class
Section
Course
Batch
```

---

# 81. Enrollment Detail

Enrollment detail should show:

```text
Student
Academic Year
Academic Context
Start Date
End Date
Status
Enrollment History
```

---

# 82. Promotion Bulk Action

Bulk promotion should provide:

```text
Eligible Students
Excluded Students
Reasons
Destination
Confirmation
```

Example:

```text
42 students selected

Eligible: 39
Excluded: 3

Reasons:
• Withdrawn
• Transferred
• Already enrolled
```

---

# 83. Capacity Rules

If capacity is enforced:

```text
Batch Capacity = 40
Current Students = 40
```

then attempting to add another student should:

```text
Warn / Block
```

based on tenant configuration.

---

# 84. Academic Structure Deletion Rules

Permanent deletion should be heavily restricted.

If a structure has historical dependencies:

```text
Class
 ↓
Enrollments
 ↓
Attendance
 ↓
Results
```

do not allow destructive deletion.

Archive instead.

---

# 85. Academic Data Integrity

Every academic record must belong to the same tenant.

Examples:

```text
Student.tenant_id
Enrollment.tenant_id
Class.tenant_id
Batch.tenant_id
Subject.tenant_id
Assignment.tenant_id
```

Cross-tenant references must be impossible.

---

# 86. RLS Requirement

All academic tables must respect the tenant isolation architecture.

A user from Tenant A must never be able to:

```text
View Tenant B class
Create Tenant B enrollment
Modify Tenant B batch
Assign Tenant B teacher
```

---

# 87. Teacher Scope Requirement

Even within the same tenant:

```text
Teacher A
```

must not automatically gain access to every academic context.

Access should be based on:

```text
Assignment
+
Permission
```

---

# 88. Parent Scope Requirement

Parent access:

```text
Parent
 ↓
Linked Student
 ↓
Active Enrollment
 ↓
Academic Context
```

Only relevant child information should be exposed.

---

# 89. Student Scope Requirement

Student access:

```text
Student User
 ↓
Own Student Record
 ↓
Own Active Enrollment
 ↓
Own Academic Context
```

---

# 90. Academic Year Transition

The ERP should eventually support a guided transition workflow:

```text
Current Year
 ↓
Review Active Students
 ↓
Promotion / Repeat / Transfer
 ↓
Create Next-Year Structures
 ↓
Create New Enrollments
 ↓
Verify
 ↓
Activate New Year
```

---

# 91. Transition Safety

Do not automatically modify production enrollment records without administrator confirmation.

Academic-year transition can affect:

```text
Fees
Attendance
Exams
Results
Homework
Timetable
Reports
```

---

# 92. Academic Setup Wizard

For a new tenant, a guided setup can be used:

```text
1. Create Academic Year
2. Create Classes/Courses
3. Create Sections/Batches
4. Create Subjects
5. Add Teachers
6. Assign Teachers
7. Add Students
8. Create Enrollments
```

---

# 93. New School Setup Example

```text
School
 ↓
2026–27
 ↓
Class 10
 ↓
Section A
 ↓
Mathematics
 ↓
Teacher
 ↓
Students
```

---

# 94. New Coaching Setup Example

```text
Coaching Centre
 ↓
2026–27
 ↓
JEE Preparation
 ↓
Morning Batch
 ↓
Physics
 ↓
Teacher
 ↓
Students
```

---

# 95. Implementation Checklist

Before considering the academic module complete:

- [ ] Academic year exists.
- [ ] Academic year lifecycle works.
- [ ] School classes work.
- [ ] School sections work.
- [ ] Coaching courses work.
- [ ] Coaching batches work.
- [ ] Subjects work.
- [ ] Teacher assignments work.
- [ ] Student enrollment works.
- [ ] Enrollment history is preserved.
- [ ] Promotion workflow works.
- [ ] Repeat-year workflow works.
- [ ] Transfers work.
- [ ] Enrollment status works.
- [ ] Capacity validation works where enabled.
- [ ] Academic structures can be archived.
- [ ] Historical records remain valid.
- [ ] Tenant isolation works.
- [ ] Teacher scope works.
- [ ] Parent scope works.
- [ ] Student scope works.
- [ ] Bulk enrollment works.
- [ ] Academic-year transition is safe.

---

# 96. Antigravity MUST NOT

Antigravity must NOT:

- Hard-code Class 1–12.
- Assume every tenant uses sections.
- Assume every tenant uses batches.
- Mix school and coaching structures unnecessarily.
- Overwrite previous enrollments.
- Delete historical academic records.
- Derive historical context from current enrollment.
- Allow teachers to access every class/batch.
- Allow parents to access unrelated students.
- Allow students to access other students.
- Allow cross-tenant academic references.
- Automatically promote students without review.
- Ignore capacity rules when capacity is configured.
- Delete classes/batches with historical dependencies.

---

# 97. Final Academic Architecture

```text
                         TENANT
                           |
                    ACADEMIC YEAR
                           |
              +------------+------------+
              |                         |
           SCHOOL                    COACHING
              |                         |
            CLASS                     COURSE
              |                         |
           SECTION                    BATCH
              |                         |
              +------------+------------+
                           |
                        SUBJECT
                           |
                    TEACHER ASSIGNMENT
                           |
                        ENROLLMENT
                           |
                         STUDENT
                           |
              +------------+------------+
              |            |            |
         ATTENDANCE     EXAMS       HOMEWORK
              |            |            |
           RESULTS      TIMETABLE     FEES
```

---

# 98. Final Principle

> **Academic structures define where learning happens. Enrollments define which academic context a student belongs to during a specific period. Assignments define which teachers operate within that context. Historical records must remain tied to the context in which they actually occurred.**

---

# 99. Next Document

The next specification is:

```text
13-ATTENDANCE-MANAGEMENT.md
```

It will define the complete attendance system:

```text
Teacher
 ↓
Class / Section / Batch
 ↓
Attendance Session
 ↓
Student
 ↓
Present / Absent / Late / Excused
 ↓
Attendance History
 ↓
Parent & Student Visibility
 ↓
Reports
```

It will also cover **daily attendance, batch attendance, bulk marking, corrections, attendance percentage, permissions, audit trails, and mobile-first teacher attendance workflows**.

---

# END OF DOCUMENT
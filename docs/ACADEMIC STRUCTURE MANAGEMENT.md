# ACADEMIC STRUCTURE MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `48-ACADEMIC-STRUCTURE-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Academic Structure Specification  
**Previous Document:** `47-STAFF-TEACHER-MANAGEMENT.md`  
**Next Document:** `49-STUDENT-ENROLLMENT-PROMOTION-MANAGEMENT.md`

---

# 1. Purpose

The Academic Structure module defines how the institution organizes its academic operations.

It provides the foundation for:

```text
Academic Years
Programs
Courses
Classes
Sections
Batches
Subjects
Academic Departments
```

Other modules depend on this structure.

The hierarchy must remain consistent so that students, teachers, attendance, fees, exams, and reports can reference the correct academic context.

---

# 2. Core Principle

Academic structure must be separated from individual student records.

Do not store everything directly inside a student.

Incorrect:

```text
Student
 ├── className
 ├── sectionName
 ├── subjectName
 └── batchName
```

Preferred:

```text
Student
 ↓
Enrollment
 ↓
Academic Context
 ├── Academic Year
 ├── Program
 ├── Class
 ├── Section
 └── Batch
```

---

# 3. Academic Hierarchy

The conceptual hierarchy is:

```text
Organization
    ↓
Branch
    ↓
Academic Year
    ↓
Program / Course
    ↓
Class / Level
    ↓
Section / Batch
    ↓
Subjects
```

Not every institution needs every level.

For example:

```text
School
 ↓
Academic Year
 ↓
Class 10
 ↓
Section A
```

Coaching:

```text
Branch
 ↓
Academic Year
 ↓
Program
 ↓
Batch
 ↓
Subjects
```

The system must support both models.

---

# 4. Academic Year

An academic year represents a defined academic period.

Example:

```text
2026–27
```

Conceptually:

```text
AcademicYear
------------
id
name
startDate
endDate
status
```

---

# 5. Academic Year Status

Potential statuses:

```text
DRAFT
UPCOMING
ACTIVE
CLOSED
ARCHIVED
```

Only one appropriate active state should be used according to the product's business rules.

---

# 6. Academic Year Lifecycle

Recommended:

```text
DRAFT
 ↓
UPCOMING
 ↓
ACTIVE
 ↓
CLOSED
 ↓
ARCHIVED
```

Transitions must be controlled.

---

# 7. Active Academic Year

The organization or branch should have a clear active academic year context.

Example:

```text
Current Academic Year
2026–27
```

The active year should be easy to identify throughout the application.

---

# 8. Academic Year Dates

Each academic year should have:

```text
Start Date
End Date
```

Validation:

```text
Start Date < End Date
```

Overlapping academic years should be prevented unless the product explicitly supports them.

---

# 9. Branch Scope

Academic years may be:

```text
Organization-Wide
```

or:

```text
Branch-Specific
```

The exact behavior must follow the tenancy/branch architecture.

Do not assume that every branch uses the same academic calendar if the product supports independent branches.

---

# 10. Program

A program represents a structured academic offering.

Examples:

```text
School Program
JEE Preparation
NEET Preparation
Foundation
Commerce
Arts
Science
```

Conceptually:

```text
Program
-------
id
name
code
description
status
```

---

# 11. Program Code

Programs may have unique codes.

Example:

```text
JEE
NEET
FOUNDATION
SCIENCE
```

Codes should be validated according to tenant scope.

---

# 12. Course

A course can represent a more specific academic offering under a program.

Example:

```text
Program:
JEE

Courses:
JEE Main
JEE Advanced
```

The system should only introduce Course as a separate level where it is actually required.

---

# 13. Class / Level

A class or academic level represents the student's academic level.

Examples:

```text
Class 6
Class 7
Class 8
Class 9
Class 10
Class 11
Class 12
```

Coaching environments may use:

```text
Foundation
Class 9 Foundation
JEE 11th
Dropper
```

---

# 14. Class Entity

Conceptually:

```text
Class
------
id
name
code
displayOrder
status
```

Classes should be sortable.

Example:

```text
Class 8
Class 9
Class 10
```

rather than alphabetical ordering.

---

# 15. Section

A section divides students within a class.

Example:

```text
Class 10
 ├── Section A
 ├── Section B
 └── Section C
```

Conceptually:

```text
Section
-------
id
name
classId
status
```

---

# 16. Section Scope

Sections should belong to a defined academic context.

Depending on architecture:

```text
Section
 ↓
Class
 ↓
Academic Year
 ↓
Branch
```

Historical sections must not be accidentally changed when a new academic year starts.

---

# 17. Batch

A batch is particularly important for coaching operations.

Example:

```text
JEE Batch A
NEET Morning
Foundation Evening
```

A batch may have:

```text
Name
Code
Program
Academic Year
Branch
Start Date
End Date
Status
```

---

# 18. Section vs Batch

These concepts must not be conflated.

Typical school model:

```text
Class 10
 ↓
Section A
```

Typical coaching model:

```text
JEE
 ↓
Batch A
```

A batch may represent scheduling and instructional grouping rather than a traditional school section.

---

# 19. Batch Status

Potential states:

```text
DRAFT
UPCOMING
ACTIVE
COMPLETED
CLOSED
ARCHIVED
```

---

# 20. Batch Lifecycle

Example:

```text
DRAFT
 ↓
UPCOMING
 ↓
ACTIVE
 ↓
COMPLETED
 ↓
ARCHIVED
```

The exact transitions should follow the product's business rules.

---

# 21. Batch Capacity

If capacity management is supported, a batch may have:

```text
Maximum Capacity
Current Enrollment
Available Seats
```

Example:

```text
Capacity: 50
Enrolled: 42
Available: 8
```

Capacity should be enforced during enrollment if configured.

---

# 22. Subject

A subject represents an academic subject.

Examples:

```text
Mathematics
Physics
Chemistry
English
Biology
Computer Science
```

Conceptually:

```text
Subject
-------
id
name
code
description
status
```

---

# 23. Subject Code

Subjects may have codes.

Examples:

```text
MATH
PHY
CHEM
BIO
ENG
```

Codes should remain stable enough for reporting and integration.

---

# 24. Subject Assignment

A subject can be associated with:

```text
Program
Class
Course
Batch
Academic Year
```

according to the institution's model.

---

# 25. Subject vs Teacher

A subject is an academic entity.

A teacher is a staff entity.

Their relationship should be explicit:

```text
Teacher
   ↕
Teacher Assignment
   ↕
Subject
```

Do not store teacher name directly inside the subject record.

---

# 26. Academic Department

Departments can organize academic subjects or staff.

Examples:

```text
Science
Mathematics
Languages
Commerce
Humanities
```

Department is organizational metadata and should not automatically grant application permissions.

---

# 27. Academic Structure Configuration

Authorized administrators should be able to configure:

```text
Academic Years
Programs
Courses
Classes
Sections
Batches
Subjects
Departments
```

The UI should present these as related configuration rather than disconnected records.

---

# 28. Configuration Navigation

Recommended:

```text
Academic Setup
 ├── Academic Years
 ├── Programs
 ├── Courses
 ├── Classes
 ├── Sections
 ├── Batches
 ├── Subjects
 └── Departments
```

---

# 29. Academic Year Setup Flow

Recommended:

```text
Create Academic Year
        ↓
Configure Programs
        ↓
Configure Classes / Levels
        ↓
Configure Sections / Batches
        ↓
Configure Subjects
        ↓
Assign Teachers
        ↓
Begin Enrollment
```

---

# 30. Academic Year Copy

A new academic year may optionally copy structure from the previous year.

Example:

```text
2025–26
 ↓
Copy Structure
 ↓
2026–27
```

Copying should create new academic-context records rather than modifying the old year.

---

# 31. Copy vs Reuse

Reference data may be reusable where appropriate.

Academic-context records should be treated carefully.

Do not make:

```text
2025–26 Class 10 Section A
```

the same physical academic-context record as:

```text
2026–27 Class 10 Section A
```

if historical independence is required.

---

# 32. Academic History

Historical academic structures must remain readable.

Example:

```text
2024–25
Class 8
Section A

2025–26
Class 9
Section B

2026–27
Class 10
Section A
```

---

# 33. Class Ordering

Classes should have configurable ordering.

Example:

```text
1 → Class 6
2 → Class 7
3 → Class 8
4 → Class 9
5 → Class 10
```

This is important for dropdowns, reports, and promotion workflows.

---

# 34. Section Ordering

Sections should also support ordering:

```text
A
B
C
D
```

Do not depend on database insertion order.

---

# 35. Batch Ordering

Batches may use:

```text
Display Order
Start Date
Custom Order
```

depending on UI needs.

---

# 36. Academic Structure Validation

The system must prevent invalid combinations.

Example:

```text
Student
 ↓
Batch
 ↓
Different Academic Year
```

should be rejected if the batch is scoped to a different year.

---

# 37. Branch Validation

Academic entities must belong to the appropriate branch/tenant context.

Example:

```text
Branch A
 ↓
Batch A
```

A student from Branch B must not accidentally be enrolled into Branch A's restricted batch.

---

# 38. Tenant Isolation

Every academic structure query must respect tenant boundaries.

No tenant should be able to access:

```text
Other Tenant's Classes
Other Tenant's Subjects
Other Tenant's Batches
Other Tenant's Academic Years
```

---

# 39. Branch Isolation

Where branch-level isolation applies:

```text
Branch A
```

must not expose:

```text
Branch B
```

academic structures to unauthorized users.

---

# 40. Academic Structure Search

Search should support:

```text
Academic Year Name
Program Name
Course Name
Class Name
Section Name
Batch Name
Subject Name
Code
```

---

# 41. Academic Structure Filters

Useful filters:

```text
Academic Year
Branch
Program
Course
Status
Class
```

---

# 42. Class List

Recommended columns:

```text
Class
Code
Academic Year
Sections
Subjects
Status
Actions
```

---

# 43. Batch List

Recommended columns:

```text
Batch
Code
Program
Academic Year
Branch
Teacher(s)
Students
Status
Actions
```

---

# 44. Subject List

Recommended columns:

```text
Subject
Code
Department
Programs
Classes
Status
Actions
```

---

# 45. Academic Year Detail

The academic-year page should provide a complete overview:

```text
Academic Year
 ↓
Programs
 ↓
Classes
 ↓
Sections
 ↓
Batches
 ↓
Subjects
```

---

# 46. Batch Detail

The batch page should show:

```text
Batch Header
 ↓
Overview
 ↓
Academic Context
 ↓
Teachers
 ↓
Students
 ↓
Subjects
 ↓
Schedule if enabled
 ↓
Attendance
 ↓
Exams
```

Only modules available to the current user should be visible.

---

# 47. Class Detail

Class detail may show:

```text
Class
 ↓
Sections
 ↓
Subjects
 ↓
Teachers
 ↓
Students
```

---

# 48. Subject Detail

Subject detail may show:

```text
Subject
 ↓
Classes
 ↓
Programs
 ↓
Teachers
 ↓
Batches
```

---

# 49. Teacher Assignment Integration

Academic structure must integrate with the teacher module.

Example:

```text
Academic Year
 ↓
Class 10
 ↓
Section A
 ↓
Mathematics
 ↓
Teacher Rahul
```

---

# 50. Student Enrollment Integration

Students should connect to academic structure through enrollment.

Example:

```text
Student
 ↓
Enrollment
 ↓
Academic Year
 ↓
Class 10
 ↓
Section A
```

For coaching:

```text
Student
 ↓
Enrollment
 ↓
Program
 ↓
Batch
```

---

# 51. Attendance Integration

Attendance should reference the relevant academic context.

Example:

```text
Attendance
 ↓
Student
 ↓
Enrollment
 ↓
Class / Batch
 ↓
Academic Year
```

This prevents attendance records from becoming ambiguous after promotion.

---

# 52. Exam Integration

Exams should belong to an academic context.

Example:

```text
Exam
 ↓
Academic Year
 ↓
Class
 ↓
Subject
```

or:

```text
Exam
 ↓
Program
 ↓
Batch
 ↓
Subject
```

depending on the institution type.

---

# 53. Fee Integration

Fees may be assigned using academic context.

Example:

```text
Fee Structure
 ↓
Academic Year
 ↓
Class / Program
 ↓
Student Enrollment
```

The exact financial model remains defined by the fee-management module.

---

# 54. Academic Context Snapshot

Where required, transactional records should preserve the relevant academic context at the time of the transaction.

This prevents historical records from changing merely because configuration changes later.

---

# 55. Academic Structure Editing

Editing an academic entity should distinguish between:

```text
Current Configuration
```

and:

```text
Historical Records
```

Changes should not corrupt historical data.

---

# 56. Rename Rules

Renaming:

```text
Class 10A
```

or:

```text
Batch Alpha
```

must be handled carefully if historical records depend on the previous name.

The application should preserve historical context where necessary.

---

# 57. Deactivation

Academic entities should generally be deactivated rather than hard-deleted when historical records reference them.

Example:

```text
ACTIVE
 ↓
INACTIVE
```

Historical references remain valid.

---

# 58. Academic Year Closure

When an academic year closes:

```text
ACTIVE
 ↓
CLOSED
```

The system should prevent inappropriate new enrollments into the closed year.

Historical records remain accessible.

---

# 59. Closed Academic Year

A closed year may still allow:

```text
View
Reports
Historical Search
Authorized Corrections
```

but should generally prevent normal operational creation.

---

# 60. Archive

After closure and retention rules:

```text
CLOSED
 ↓
ARCHIVED
```

Archived academic structures remain available to authorized users.

---

# 61. Hard Delete

Hard deletion should be highly restricted.

If an academic structure has dependencies:

```text
Students
Enrollments
Attendance
Fees
Exams
Results
Teacher Assignments
```

it should generally not be deleted.

---

# 62. Dependency Awareness

Before deactivation/deletion, show dependencies.

Example:

```text
This batch has:
42 students
3 teachers
6 subjects
18 attendance records
```

This helps administrators understand consequences.

---

# 63. Conflict Detection

The system should detect conflicts such as:

```text
Duplicate Class Code
Duplicate Subject Code
Duplicate Batch Code
Duplicate Section
Invalid Academic Year
Cross-Branch Assignment
```

according to configured uniqueness rules.

---

# 64. Academic Setup Wizard

For a new institution, an optional setup wizard may guide administrators:

```text
Organization
 ↓
Branch
 ↓
Academic Year
 ↓
Program
 ↓
Classes
 ↓
Sections
 ↓
Subjects
 ↓
Batches
 ↓
Teachers
```

The wizard should not bypass validation or permissions.

---

# 65. Mobile-First Configuration

Configuration screens must remain usable on mobile.

Use:

```text
Cards
Drawers
Steppers
Bottom Sheets
Responsive Forms
```

instead of forcing large desktop tables.

---

# 66. Desktop Configuration

Desktop can use richer layouts:

```text
Sidebar
Data Tables
Multi-Column Forms
Detail Panels
```

while preserving the same business logic.

---

# 67. Empty States

Examples:

```text
No academic years found.
```

```text
No batches configured for this program.
```

```text
No subjects assigned to this class.
```

Provide relevant actions where authorized.

---

# 68. Loading States

Provide loading states for:

```text
Academic Year List
Class List
Batch List
Subject List
Relationship Lists
```

---

# 69. Error Handling

Errors should be actionable.

Example:

```text
This batch cannot be archived because it has active student enrollments.
```

rather than displaying a raw database constraint error.

---

# 70. Permission-Aware UI

Examples:

```text
No academic.create
→ Hide Create

No academic.update
→ Hide Edit

No academic.delete
→ Hide Delete

No academic.assign
→ Hide Teacher Assignment
```

The backend must independently enforce these permissions.

---

# 71. API Structure

Conceptual resources:

```text
/academic-years
/programs
/courses
/classes
/sections
/batches
/subjects
/departments
```

Nested routes may be used where appropriate.

---

# 72. Service Architecture

Recommended:

```text
UI
 ↓
API
 ↓
Academic Structure Service
 ↓
Validation
 ↓
Repository
 ↓
Database
```

Do not duplicate academic business rules across individual pages.

---

# 73. Transactional Setup

Creating a complex academic structure may involve multiple records.

Example:

```text
Create Academic Year
 ↓
Create Class
 ↓
Create Section
 ↓
Create Subjects
```

Where multiple records must succeed together, use appropriate transaction handling.

---

# 74. Data Integrity Checklist

Antigravity must verify:

```text
☐ Academic year dates valid
☐ Academic year status valid
☐ Classes belong to valid context
☐ Sections belong to valid classes
☐ Batches belong to valid context
☐ Subjects belong to valid context
☐ Branch relationships valid
☐ Tenant relationships valid
☐ No invalid cross-year enrollment
☐ Historical references preserved
```

---

# 75. Module Checklist

```text
☐ Academic Years
☐ Academic Year Lifecycle
☐ Programs
☐ Courses
☐ Classes
☐ Sections
☐ Batches
☐ Subjects
☐ Departments
☐ Branch Scope
☐ Tenant Scope
☐ Academic Structure Search
☐ Filters
☐ Ordering
☐ Teacher Integration
☐ Student Enrollment Integration
☐ Attendance Integration
☐ Exam Integration
☐ Fee Integration
☐ Historical Context
☐ Deactivation
☐ Closure
☐ Archive
☐ Dependency Detection
☐ Auditability
☐ Permission Enforcement
☐ Responsive UI
```

---

# 76. Definition of Done

The Academic Structure module is complete when an authorized administrator can:

```text
Create Academic Year
        ↓
Create Programs / Courses
        ↓
Create Classes
        ↓
Create Sections
        ↓
Create Batches
        ↓
Create Subjects
        ↓
Assign Academic Relationships
        ↓
Connect Teachers
        ↓
Support Student Enrollment
        ↓
Run Academic Operations
        ↓
Close Academic Year
        ↓
Preserve Historical Records
```

without breaking:

```text
Tenant Isolation
Branch Isolation
Student History
Teacher History
Attendance History
Financial History
Exam History
Authorization
```

---

# 77. Final Principle

> **Academic structure is the foundation on which student enrollment, teacher assignment, attendance, fees, examinations, and reporting depend. Academic entities must be explicitly scoped to the correct tenant, branch, and academic year. Historical academic context must remain stable even when current configuration changes. Never overwrite or delete historical academic structures merely to represent a new academic year.**

---

# 78. Next Document

```text
49-STUDENT-ENROLLMENT-PROMOTION-MANAGEMENT.md
```

This will define:

```text
Student Enrollment
Academic Placement
Class Assignment
Section Assignment
Batch Assignment
Program Enrollment
Enrollment History
Transfers
Promotion
Demotion
Re-enrollment
Withdrawal
Academic Year Rollover
Bulk Promotion
Enrollment Validation
Capacity Checks
Enrollment Status
```

---

# END OF DOCUMENT
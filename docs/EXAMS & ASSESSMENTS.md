# EXAMS & ASSESSMENTS
# School + Coaching Centre ERP SaaS

**Document:** `16-EXAMS-AND-ASSESSMENTS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `15-HOMEWORK-AND-ASSIGNMENTS.md`  
**Next Document:** `17-RESULTS-AND-REPORT-CARDS.md`

---

# 1. Purpose

This document defines the complete Exams and Assessments module.

The system must support:

- Exams
- Tests
- Unit tests
- Monthly tests
- Mock tests
- Term examinations
- Mid-term examinations
- Final examinations
- Practice tests
- Internal assessments
- Subject-wise assessments
- Exam schedules
- Student participation
- Marks
- Evaluation
- Grades
- Exam status
- Results integration

The architecture must support both:

```text
SCHOOL
Academic Year
 → Class
 → Section
 → Subject
 → Exam
```

and:

```text
COACHING
Academic Year
 → Course
 → Batch
 → Subject
 → Test
```

---

# 2. Core Architecture

The high-level flow is:

```text
Academic Year
      ↓
Academic Context
      ↓
Assessment
      ↓
Subjects
      ↓
Exam Schedule
      ↓
Students
      ↓
Marks / Evaluation
      ↓
Results
```

---

# 3. Assessment vs Exam

The system should treat **assessment** as the broader concept.

```text
Assessment
 ├── Exam
 ├── Test
 ├── Quiz
 ├── Internal Assessment
 ├── Mock Test
 └── Practice Test
```

This allows the system to reuse the same underlying assessment architecture.

---

# 4. Assessment Types

Recommended initial types:

```text
UNIT_TEST
MONTHLY_TEST
MID_TERM
FINAL_EXAM
MOCK_TEST
PRACTICE_TEST
QUIZ
INTERNAL_ASSESSMENT
```

Institutions may configure visible labels.

---

# 5. Assessment Name

Every assessment must have a clear name.

Examples:

```text
First Unit Test
Mid-Term Examination
JEE Mock Test 01
Physics Monthly Test
Annual Examination
```

---

# 6. Academic Year

Every assessment must belong to an academic year.

Example:

```text
2026–27
 ↓
Mid-Term Examination
```

An assessment must not accidentally appear in another academic year.

---

# 7. Academic Context

School:

```text
Class
Section
```

Coaching:

```text
Course
Batch
```

The assessment must use the canonical academic context architecture defined in earlier specifications.

---

# 8. Assessment Scope

An assessment can apply to:

```text
Entire Class
Entire Section
Entire Batch
Specific Student Group
```

Individual student assessment may be supported where required.

---

# 9. Subjects

An assessment may contain one or multiple subjects.

Example:

```text
Mid-Term Examination

Mathematics
Physics
Chemistry
English
```

---

# 10. Subject Assessment

Each subject within an assessment should have its own configuration.

Example:

```text
Mid-Term
 ↓
Mathematics
 ├── Maximum Marks: 100
 ├── Passing Marks: 33
 └── Exam Date: 10-Oct
```

---

# 11. Maximum Marks

Each subject assessment should define:

```text
Maximum Marks
```

Example:

```text
Mathematics
Maximum: 100
```

---

# 12. Passing Marks

Optional configuration:

```text
Passing Marks: 33
```

If the institution does not use passing marks, this can remain disabled/null.

---

# 13. Passing Percentage

An institution may configure passing percentage instead of fixed marks.

Example:

```text
Passing Percentage: 40%
```

The system must avoid applying both conflicting rules unintentionally.

---

# 14. Weightage

Assessments may contribute a percentage to a final academic result.

Example:

```text
Unit Tests: 20%
Mid-Term: 30%
Final Exam: 50%
```

Weightage logic belongs to the result/calculation layer and must remain configurable.

---

# 15. Exam Schedule

Each subject can have a scheduled date/time.

Example:

```text
10-Oct-2026
09:00–12:00
Mathematics
Room 201
```

---

# 16. Exam Schedule Components

A scheduled subject exam may contain:

```text
Exam Date
Start Time
End Time
Duration
Room
Invigilator
```

Only fields supported by the institution should be required.

---

# 17. Exam Duration

Example:

```text
Duration:
3 Hours
```

The system should calculate duration consistently from start/end times where both are used.

---

# 18. Exam Room

If physical exams are supported:

```text
Room 201
Room 202
Lab 1
Hall A
```

Room assignment should use the same room architecture as the timetable.

---

# 19. Room Conflict

Two exams should not be scheduled in the same room at overlapping times unless explicitly allowed.

---

# 20. Invigilator

An exam may have one or more invigilators.

Example:

```text
Mathematics
Invigilator:
Mr. Sharma
```

---

# 21. Invigilator Conflict

The system should detect when an invigilator is assigned to overlapping exams.

---

# 22. Teacher Conflict

If a teacher is assigned to an exam as teacher/invigilator, the system must check their existing exam assignments and relevant timetable conflicts where applicable.

---

# 23. Student Conflict

A student should not normally be scheduled for two simultaneous examinations.

Example:

```text
10:00
Mathematics

10:30
Physics
```

for the same student/context should trigger a conflict.

---

# 24. Exam Schedule View

Admin should have a calendar/grid view.

Example:

```text
DATE        TIME        SUBJECT       ROOM

10-Oct      09:00       Mathematics   201
11-Oct      09:00       Physics       202
12-Oct      09:00       Chemistry     203
```

---

# 25. Student Exam Schedule

Student view:

```text
My Exams

10 Oct
Mathematics
09:00–12:00
Room 201

11 Oct
Physics
09:00–12:00
Room 202
```

---

# 26. Parent Exam Schedule

Parent can see:

```text
Rahul's Exams

10 Oct
Mathematics
09:00 AM
Room 201
```

Only authorized child information should be visible.

---

# 27. Teacher Exam Schedule

Teacher can see relevant:

```text
Assigned Exams
Invigilation
Evaluation Tasks
```

---

# 28. Assessment Status

Recommended statuses:

```text
DRAFT
SCHEDULED
ONGOING
COMPLETED
PUBLISHED
ARCHIVED
CANCELLED
```

---

# 29. Draft Assessment

A draft assessment is not yet visible as a finalized exam to students/parents.

Admin/authorized staff can edit it.

---

# 30. Scheduled Assessment

The exam is finalized enough to appear on relevant schedules.

---

# 31. Ongoing Assessment

The exam is currently taking place.

---

# 32. Completed Assessment

The exam has finished.

Marks can then proceed through evaluation.

---

# 33. Published Results

The assessment may be completed while its results are still unpublished.

Do not assume:

```text
Exam Completed = Results Published
```

These are separate lifecycle stages.

---

# 34. Cancelled Assessment

If an assessment is cancelled:

```text
Status:
CANCELLED
```

Historical scheduling information should remain available where appropriate.

---

# 35. Rescheduled Assessment

A subject exam may be rescheduled.

Example:

```text
Original:
10-Oct 09:00

New:
12-Oct 09:00
```

The change should be auditable.

---

# 36. Exam Schedule Exceptions

Specific subject exams may have:

```text
Room Change
Time Change
Date Change
Invigilator Change
Cancellation
```

These should not silently rewrite unrelated schedules.

---

# 37. Question Paper

An assessment may have a question paper.

Conceptually:

```text
Assessment
 ↓
Subject
 ↓
Question Paper
```

---

# 38. Question Paper Modes

The system may support:

```text
Uploaded Question Paper
System-Generated Question Paper
External Examination
```

The initial implementation may support uploaded papers even if online exams are not yet implemented.

---

# 39. Uploaded Question Paper

Teacher/admin can upload:

```text
PDF
Document
```

according to supported file rules.

---

# 40. Question Bank

Advanced functionality may support a reusable question bank:

```text
Question Bank
 ↓
Questions
 ↓
Assessment
 ↓
Question Paper
```

This should be modular so it does not complicate basic offline exam management.

---

# 41. Question Metadata

If question banks are implemented:

```text
Question
 ├── Subject
 ├── Chapter
 ├── Topic
 ├── Difficulty
 ├── Marks
 └── Question Type
```

---

# 42. Question Types

Possible types:

```text
MCQ
SHORT_ANSWER
LONG_ANSWER
NUMERICAL
TRUE_FALSE
DESCRIPTIVE
```

Only implement types required by the project's scope.

---

# 43. Online Exam

If online assessment is implemented, the architecture may support:

```text
Student
 ↓
Start Exam
 ↓
Question Paper
 ↓
Answers
 ↓
Submit
 ↓
Evaluation
```

Online examination must be treated as a separate layer from ordinary offline exam scheduling.

---

# 44. Offline Exam

For a normal school/coaching exam:

```text
Schedule
 ↓
Conduct Exam
 ↓
Collect Answer Sheets
 ↓
Evaluate
 ↓
Enter Marks
```

This should be the default assumption unless online testing is explicitly enabled.

---

# 45. Student Eligibility

Before adding a student to an assessment, validate:

```text
Student belongs to tenant
Student has active relevant enrollment
Student belongs to assessment scope
Academic year matches
```

---

# 46. Absent Student

A student may be absent.

Use a separate attendance/participation state:

```text
PRESENT
ABSENT
EXEMPT
```

Do not automatically convert absence into zero marks unless the institution explicitly configures that rule.

---

# 47. Exempt Student

Some students may be exempt from a particular subject/exam.

Example:

```text
Student:
Rahul

Chemistry:
EXEMPT
```

This must be distinct from absent.

---

# 48. Student Participation Record

Conceptually:

```text
Assessment
 ↓
Student Participation
 ├── Student
 ├── Status
 ├── Started At
 ├── Submitted At
 └── Notes
```

For offline exams, only relevant fields should be used.

---

# 49. Marks Entry

Teacher/evaluator can enter:

```text
Student
Subject
Marks
```

Example:

```text
Rahul
Mathematics
82 / 100
```

---

# 50. Marks Validation

Marks must satisfy:

```text
Marks >= 0
Marks <= Maximum Marks
```

unless a special status such as absent/exempt applies.

---

# 51. Decimal Marks

If supported, marks may allow decimals.

Example:

```text
82.5 / 100
```

The precision should be institution-configurable.

---

# 52. Negative Marks

Some competitive exams may use negative marking.

Example:

```text
Correct: +4
Incorrect: -1
```

This should be an optional assessment configuration.

---

# 53. Negative Marking Rules

If enabled, define:

```text
Correct Answer Marks
Incorrect Answer Penalty
Unanswered Marks
```

Do not apply negative marking to assessments that have it disabled.

---

# 54. Total Marks

For multi-subject exams:

```text
Mathematics: 80
Physics: 72
Chemistry: 76

Total: 228
```

The result layer should calculate totals from valid subject marks.

---

# 55. Percentage

If applicable:

```text
Percentage =
Obtained Marks / Maximum Marks × 100
```

Use the configured subject/assessment inclusion rules.

---

# 56. Grade

Grades may be derived from configured grading rules.

Example:

```text
90–100 = A+
80–89  = A
70–79  = B+
```

Do not hard-code these values.

---

# 57. Grade Scale

The institution may configure:

```text
Grade
Minimum Percentage
Maximum Percentage
```

or another supported grading model.

---

# 58. Pass / Fail

A result can be:

```text
PASS
FAIL
```

but this must be calculated according to configured rules.

---

# 59. Subject-Level Pass/Fail

Example:

```text
Mathematics
82/100
PASS

Physics
28/100
FAIL
```

The overall result may still depend on institution-specific rules.

---

# 60. Overall Result

Example:

```text
Total:
410 / 500

Percentage:
82%

Grade:
A

Status:
PASS
```

Detailed result architecture belongs in the next results document.

---

# 61. Evaluation Assignment

An assessment may assign evaluation work to teachers.

Example:

```text
Mathematics Papers
 ↓
Evaluator:
Mr. Sharma
```

---

# 62. Evaluator Permissions

Only authorized evaluators should be able to enter or modify marks.

A teacher assigned to a class should not automatically be able to modify every exam result.

---

# 63. Marks Lock

After finalization:

```text
Marks
 ↓
Locked
```

Further changes should require elevated permission.

---

# 64. Marks Unlock

If an authorized administrator needs to correct marks:

```text
Locked
 ↓
Authorized Override
 ↓
Edit
 ↓
Audit Event
 ↓
Relock
```

---

# 65. Marks Audit

Important information:

```text
Old Marks
New Marks
Changed By
Changed At
Reason
```

where audit functionality is available.

---

# 66. Bulk Marks Entry

For large classes, teachers should be able to enter marks in a table.

Example:

```text
Student       Marks

Rahul         82
Aman          76
Sameer        91
Arjun         68
```

---

# 67. Bulk Validation

Before saving:

```text
Invalid marks
Missing values
Absent status conflicts
Maximum marks violations
```

must be detected.

---

# 68. Spreadsheet-Like Entry

A spreadsheet-style UI may improve large-scale marks entry.

Example:

```text
Student | Marks | Status
```

with keyboard navigation where practical.

---

# 69. Autosave

If implemented, autosave should preserve drafts without finalizing marks.

Never treat autosave as final submission.

---

# 70. Evaluation Status

Recommended:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
LOCKED
```

---

# 71. Assessment Completion

An assessment should not be marked fully evaluated until required subject/student evaluation work is complete according to the configured rules.

---

# 72. Missing Marks

Admin should be able to identify:

```text
Missing Marks
```

before publishing results.

---

# 73. Missing Evaluation Dashboard

Example:

```text
Mid-Term Examination

Mathematics
100% evaluated

Physics
92% evaluated

Chemistry
78% evaluated
```

---

# 74. Publish Readiness

Before publishing results, validate:

```text
Required marks entered
Absent/exempt states resolved
Marks within limits
Grades calculable
Result rules valid
```

---

# 75. Exam Publication

Exam schedule publication and result publication are separate.

```text
Schedule
 ↓
Publish Schedule

Later:

Marks
 ↓
Finalize
 ↓
Publish Results
```

---

# 76. Student Visibility

Students may see:

```text
Upcoming Exam
Exam Schedule
Subject
Date
Time
Room
```

Before the exam.

After publication:

```text
Marks
Grade
Result
```

according to institution settings.

---

# 77. Parent Visibility

Parents may see:

```text
Exam Schedule
Results
Marks
Grades
```

according to tenant permissions.

---

# 78. Teacher Visibility

Teachers can see exams within their authorized scope.

Evaluation permissions should be more restrictive than general viewing permissions.

---

# 79. Admin Visibility

Authorized admins can manage:

```text
Assessments
Schedules
Subjects
Students
Evaluators
Marks
Publication
```

---

# 80. Exam Notifications

When an exam schedule is published:

```text
Exam Schedule Published

Mathematics
10-Oct
09:00 AM
Room 201
```

---

# 81. Schedule Change Notification

If the exam changes:

```text
Exam Schedule Updated

Mathematics

Previous:
10-Oct, 09:00

New:
12-Oct, 09:00
```

---

# 82. Exam Reminder

Optional notification:

```text
Reminder:
Mathematics exam is tomorrow.
```

Notification timing should be configurable.

---

# 83. Result Notification

After publication:

```text
Exam Result Published

Mid-Term Examination
Your result is now available.
```

---

# 84. Exam Dashboard

Admin dashboard:

```text
Assessments

Upcoming: 3
Ongoing: 1
Completed: 5
Pending Evaluation: 2
Results Pending Publication: 1
```

---

# 85. Teacher Dashboard

```text
My Assessments

Upcoming Exams: 2
To Evaluate: 48
Completed Evaluation: 120
```

---

# 86. Student Dashboard

```text
My Exams

Next Exam:
Mathematics
10-Oct
09:00 AM

Recent Result:
Physics
82/100
```

---

# 87. Parent Dashboard

```text
Rahul

Next Exam:
Mathematics
10-Oct

Latest Result:
Mid-Term
82%
```

---

# 88. Assessment Search

Admin can search by:

```text
Assessment Name
Type
Academic Year
Class
Section
Course
Batch
Subject
Date
Status
```

---

# 89. Assessment Filters

Useful filters:

```text
Draft
Scheduled
Ongoing
Completed
Cancelled
Published
Archived
```

---

# 90. Schedule Filters

```text
Date
Subject
Room
Teacher
Invigilator
Class
Batch
```

---

# 91. Exam Calendar

Provide:

```text
Month
Week
Day
```

views where useful.

The exam schedule should remain easy to understand on mobile.

---

# 92. Mobile Exam Schedule

Example:

```text
10 OCTOBER

Mathematics
09:00–12:00
Room 201

11 OCTOBER

Physics
09:00–12:00
Room 202
```

---

# 93. Mobile Marks Entry

Teacher:

```text
Student
Marks
Status
```

with quick navigation between students.

---

# 94. Exam Creation Flow

Recommended:

```text
Create Assessment
 ↓
Name
 ↓
Type
 ↓
Academic Year
 ↓
Class/Section/Batch
 ↓
Add Subjects
 ↓
Configure Marks
 ↓
Schedule Subjects
 ↓
Assign Rooms
 ↓
Assign Invigilators
 ↓
Validate
 ↓
Save / Publish
```

---

# 95. Add Subject Flow

```text
Assessment
 ↓
Add Subject
 ↓
Select Subject
 ↓
Maximum Marks
 ↓
Passing Rule
 ↓
Date
 ↓
Time
 ↓
Room
 ↓
Evaluator
```

---

# 96. Schedule Validation

Before publishing:

```text
Teacher conflicts
Student conflicts
Room conflicts
Invigilator conflicts
Invalid dates
Invalid times
Missing subject configuration
```

must be checked.

---

# 97. Academic Context Validation

Ensure:

```text
Assessment Academic Year
=
Student Enrollment Academic Year
```

and the student belongs to the intended class/section/batch.

---

# 98. Archived Academic Context

Do not create active exams for:

```text
Archived Class
Archived Batch
```

unless the action is explicitly historical/admin-only.

---

# 99. Assessment Copy

Admin may duplicate an assessment structure.

Example:

```text
Mid-Term 2025
 ↓
Copy
 ↓
Mid-Term 2026
```

The copy should require review.

---

# 100. What Must NOT Be Copied

When duplicating an assessment:

```text
Student Marks → DO NOT COPY
Results → DO NOT COPY
Evaluation History → DO NOT COPY
Student Participation → DO NOT COPY
```

Only configuration/template information should be copied.

---

# 101. Historical Integrity

Past assessment records must remain unchanged unless an authorized correction is explicitly performed.

---

# 102. Assessment Deletion

Draft assessments may be deleted according to permissions.

Completed or student-interacted assessments should generally be archived rather than hard-deleted.

---

# 103. Cancellation

A cancelled assessment must retain:

```text
Original Schedule
Cancellation Status
Cancelled At
Cancelled By
Reason
```

where audit fields are supported.

---

# 104. Rescheduling

When rescheduling:

```text
Validate New Schedule
 ↓
Check Conflicts
 ↓
Save Change
 ↓
Create Audit Event
 ↓
Notify Affected Users
```

---

# 105. Tenant Isolation

Every assessment must be tenant-scoped.

Tenant A must never access:

```text
Tenant B Exams
Tenant B Marks
Tenant B Students
Tenant B Question Papers
```

---

# 106. Authorization

Every operation must verify:

```text
Authenticated User
Tenant Membership
Role
Academic Scope
Assessment Permission
Evaluation Permission
```

---

# 107. Direct ID Security

Do not trust client-provided:

```text
assessment_id
subject_exam_id
student_id
mark_id
```

without server-side authorization checks.

---

# 108. Assessment Data Model Concept

Conceptually:

```text
ASSESSMENT
 ├── tenant
 ├── academic_year
 ├── academic_context
 ├── name
 ├── type
 ├── status
 └── configuration

ASSESSMENT SUBJECT
 ├── assessment
 ├── subject
 ├── maximum_marks
 ├── passing_rule
 └── weightage

EXAM SCHEDULE
 ├── assessment_subject
 ├── date
 ├── start_time
 ├── end_time
 ├── room
 └── status

INVIGILATOR ASSIGNMENT
 ├── exam_schedule
 └── teacher

STUDENT PARTICIPATION
 ├── assessment_subject
 ├── student
 └── status

MARK
 ├── assessment_subject
 ├── student
 ├── marks
 ├── grade
 └── evaluation metadata
```

Actual table names must follow the project's canonical schema.

---

# 109. Assessment Relationships

The primary relationship is:

```text
Tenant
 ↓
Academic Year
 ↓
Academic Context
 ↓
Assessment
 ↓
Assessment Subject
 ↓
Exam Schedule
 ↓
Student Participation
 ↓
Marks
 ↓
Results
```

---

# 110. Result Separation

The Exams module records:

```text
Assessment
Exam Schedule
Participation
Marks
Evaluation
```

The Results module should handle:

```text
Overall Result
Percentage
Grade
Rank
Report Card
Promotion Outcome
```

Do not duplicate result calculation logic across modules.

---

# 111. Business Rules

The system must enforce:

1. Every assessment belongs to one tenant.
2. Every assessment belongs to an academic year.
3. Every assessment uses a valid academic context.
4. Subjects must be valid for the relevant context.
5. Exam schedule conflicts must be detected.
6. Room conflicts must be detected.
7. Invigilator conflicts must be detected.
8. Student exam conflicts must be detected.
9. Marks cannot exceed maximum marks.
10. Negative marking is only applied when configured.
11. Absence must remain distinct from zero marks.
12. Exemption must remain distinct from absence.
13. Locked marks require elevated permission to modify.
14. Published results cannot be silently changed.
15. Historical assessment data must remain auditable.
16. Cross-tenant access is prohibited.

---

# 112. Antigravity MUST NOT

Antigravity must NOT:

- Hard-code grading scales.
- Automatically treat absent students as zero unless configured.
- Allow marks above maximum marks.
- Allow unauthorized teachers to change marks.
- Allow overlapping exam schedules without explicit override.
- Allow two exams for the same student at the same time.
- Allow room conflicts without appropriate authorization.
- Copy student marks when duplicating an exam.
- Delete historical assessment data just because an exam is archived.
- Publish incomplete results without passing configured validation.
- Expose another student's marks.
- Mix assessment data between tenants.
- Trust client-side authorization.
- Use a single global grading rule for every institution.

---

# 113. Complete School Workflow

```text
Admin
 ↓
Create Academic Year
 ↓
Create Class / Section
 ↓
Create Assessment
 ↓
Add Subjects
 ↓
Configure Marks
 ↓
Schedule Exams
 ↓
Assign Rooms
 ↓
Assign Invigilators
 ↓
Validate
 ↓
Publish Schedule
 ↓
Students Take Exams
 ↓
Teachers Evaluate
 ↓
Marks Entered
 ↓
Marks Locked
 ↓
Results Prepared
 ↓
Results Published
```

---

# 114. Complete Coaching Workflow

```text
Admin
 ↓
Create Academic Year
 ↓
Create Course / Batch
 ↓
Create Test
 ↓
Add Subjects
 ↓
Configure Marks
 ↓
Schedule Test
 ↓
Assign Room / Online Mode
 ↓
Students Take Test
 ↓
Evaluation
 ↓
Marks
 ↓
Results
```

---

# 115. Final Architecture

```text
                           TENANT
                              |
                        ACADEMIC YEAR
                              |
                       ACADEMIC CONTEXT
                              |
                         ASSESSMENT
                              |
                  +-----------+-----------+
                  |           |           |
                SUBJECT    CONFIG      WEIGHTAGE
                  |
            ASSESSMENT SUBJECT
                  |
             EXAM SCHEDULE
              /     |      \
             /      |       \
          ROOM   INVIGILATOR  DATE/TIME
             \      |       /
              \     |      /
               STUDENT PARTICIPATION
                       |
                     MARKS
                       |
                   EVALUATION
                       |
                RESULT PIPELINE
```

---

# 116. Final Principle

> **An assessment defines what academic evaluation is being conducted, while an exam schedule defines when and where it occurs. Student participation and marks belong to the specific assessment subject. Evaluation and result publication are separate lifecycle stages. The system must preserve academic context, enforce authorization and conflicts, and maintain historical integrity throughout the entire assessment lifecycle.**

---

# 117. Next Document

The next specification is:

```text
17-RESULTS-AND-REPORT-CARDS.md
```

It will define:

```text
Assessment Marks
      ↓
Subject Results
      ↓
Total Marks
      ↓
Percentage
      ↓
Grades
      ↓
Pass / Fail
      ↓
Overall Result
      ↓
Report Card
      ↓
Student / Parent View
```

It will cover **result calculation, grading systems, report cards, rank/position where applicable, subject performance, result publication, corrections, historical results, and academic reporting.**

---

# END OF DOCUMENT
# RESULTS & REPORT CARDS
# School + Coaching Centre ERP SaaS

**Document:** `17-RESULTS-AND-REPORT-CARDS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `16-EXAMS-AND-ASSESSMENTS.md`  
**Next Document:** `18-STUDENT-PERFORMANCE-AND-ANALYTICS.md`

---

# 1. Purpose

This document defines the complete Results and Report Cards module.

The module converts evaluated assessment data into structured academic results.

It must support:

- Subject-wise marks
- Total marks
- Maximum marks
- Percentage
- Grades
- Pass/fail status
- Assessment-wise results
- Term results
- Final results
- Report cards
- Student result history
- Parent result visibility
- Result publication
- Result corrections
- Result locking
- Result audit history

The system must support both:

```text
SCHOOL
Academic Year
 → Class
 → Section
 → Subjects
 → Assessments
 → Results
```

and:

```text
COACHING
Academic Year
 → Course
 → Batch
 → Subjects
 → Tests
 → Results
```

---

# 2. Core Principle

The Results module must **consume evaluated assessment data**.

It must not independently duplicate the entire examination/evaluation system.

The architecture is:

```text
Assessment
    ↓
Evaluation
    ↓
Marks
    ↓
Result Calculation
    ↓
Result
    ↓
Report Card
    ↓
Student / Parent
```

---

# 3. Result vs Marks

Marks represent an individual evaluation outcome.

Example:

```text
Mathematics
82 / 100
```

A result is the broader academic outcome generated from one or more marks.

Example:

```text
Mid-Term Result

Total: 410 / 500
Percentage: 82%
Grade: A
Status: PASS
```

---

# 4. Result Types

Recommended result types:

```text
ASSESSMENT_RESULT
TERM_RESULT
FINAL_RESULT
PERIODIC_RESULT
```

Institutions may configure which result types they use.

---

# 5. Assessment Result

An assessment result represents the result of one examination/test.

Example:

```text
Mid-Term Examination
 ↓
Mathematics: 82/100
Physics: 76/100
Chemistry: 80/100
```

---

# 6. Term Result

A term result combines configured assessments during a term.

Example:

```text
Term 1

Unit Test: 20%
Mid-Term: 30%
Assignments: 10%
Final Term Exam: 40%
```

The exact weighting must be configurable.

---

# 7. Final Result

A final result represents the overall academic outcome for the configured academic period.

Example:

```text
Academic Year 2026–27

Total: 820/1000
Percentage: 82%
Grade: A
Status: PASS
```

---

# 8. Result Scope

Results must be associated with:

```text
Tenant
Academic Year
Academic Context
Student
```

For example:

```text
Tenant
 ↓
2026–27
 ↓
Class 10
 ↓
Section A
 ↓
Rahul
```

---

# 9. Student Result

Each student's result must remain independent.

Example:

```text
Student:
Rahul Kumar

Assessment:
Mid-Term Examination

Result:
82%
```

Never expose another student's result through normal student/parent interfaces.

---

# 10. Subject Result

A result should contain subject-level outcomes.

Example:

```text
Subject        Marks       Max       Grade

Mathematics    82          100       A
Physics        76          100       B+
Chemistry      80          100       A
English        88          100       A+
```

---

# 11. Maximum Marks

Each subject result must know its maximum marks.

```text
Obtained:
82

Maximum:
100
```

---

# 12. Obtained Marks

Obtained marks come from the evaluation layer.

The result calculation should not silently overwrite source marks.

---

# 13. Total Marks

For included subjects:

```text
Total Obtained =
Sum of valid subject marks
```

Example:

```text
82 + 76 + 80 + 88 = 326
```

---

# 14. Total Maximum Marks

```text
Total Maximum =
Sum of included subject maximum marks
```

Example:

```text
100 + 100 + 100 + 100 = 400
```

---

# 15. Percentage

Default calculation:

```text
Percentage =
Total Obtained / Total Maximum × 100
```

Example:

```text
326 / 400 × 100
= 81.5%
```

If an institution uses another calculation model, it must be explicitly configured.

---

# 16. Percentage Precision

The institution may configure display precision.

Examples:

```text
81.5%
81.50%
82%
```

The underlying calculation should preserve sufficient precision.

---

# 17. Grade Calculation

Grades should be calculated from a configurable grading scale.

Example:

```text
90–100 → A+
80–89  → A
70–79  → B+
60–69  → B
```

These are examples only.

Do not hard-code them.

---

# 18. Grading Scale

Conceptually:

```text
GRADE SCALE
 ├── Grade
 ├── Minimum Percentage
 ├── Maximum Percentage
 └── Optional Grade Point
```

---

# 19. Grade Points

Institutions may use grade points.

Example:

```text
A+ = 10
A  = 9
B+ = 8
B  = 7
```

Grade-point calculations must use configured rules.

---

# 20. Subject Grade

A subject can have its own grade.

Example:

```text
Mathematics
82%
Grade A
```

---

# 21. Overall Grade

The overall grade is calculated from the configured overall percentage/result rules.

Do not simply average letter grades unless the institution explicitly defines that method.

---

# 22. Pass / Fail

A result may contain:

```text
PASS
FAIL
```

The status must be generated from configured passing rules.

---

# 23. Subject-Level Passing

Example:

```text
Mathematics
82/100
PASS

Physics
28/100
FAIL
```

If the institution requires passing every subject, the overall result may become:

```text
FAIL
```

The exact policy must be configurable.

---

# 24. Passing Marks

If configured:

```text
Maximum Marks: 100
Passing Marks: 33
```

Then:

```text
Marks >= 33 → PASS
Marks < 33  → FAIL
```

---

# 25. Passing Percentage

Alternatively:

```text
Passing Percentage: 40%
```

The calculation layer should use the configured rule.

---

# 26. Grace Marks

Some institutions may use grace marks.

Example:

```text
Required: 33
Obtained: 31
Grace: 2
Final: PASS
```

Grace-mark functionality should be configurable and explicitly recorded.

Do not silently modify source marks.

---

# 27. Grace Marks Audit

If grace marks are applied, record:

```text
Original Marks
Grace Marks
Final Result Marks
Applied By / Rule
Reason
```

---

# 28. Absent Students

Absent must remain distinct from zero.

Example:

```text
Mathematics
Status: ABSENT
Marks: —
```

Do not automatically store:

```text
0
```

unless the institution explicitly configures absence as zero.

---

# 29. Exempt Students

An exempt student should appear as:

```text
EXEMPT
```

rather than:

```text
FAIL
```

or:

```text
0
```

unless configured otherwise.

---

# 30. Result Status

Recommended statuses:

```text
DRAFT
CALCULATED
REVIEWED
LOCKED
PUBLISHED
ARCHIVED
```

---

# 31. Draft Result

The result is being prepared.

Students and parents cannot see it.

---

# 32. Calculated Result

The system has generated the result from available marks.

It may still require review.

---

# 33. Reviewed Result

An authorized user has checked the result.

---

# 34. Locked Result

The result is finalized.

Normal users cannot change it.

---

# 35. Published Result

The result is visible to authorized students/parents.

---

# 36. Archived Result

Historical result retained for record purposes.

---

# 37. Result Publication

Publishing must be an explicit action.

Recommended flow:

```text
Marks
 ↓
Calculate
 ↓
Validate
 ↓
Review
 ↓
Lock
 ↓
Publish
```

---

# 38. Publish Validation

Before publishing, check:

```text
Required marks complete
Invalid marks absent
Grades calculable
Passing rules valid
Student enrollment valid
No unresolved result errors
```

---

# 39. Partial Results

The system should distinguish:

```text
COMPLETE RESULT
```

from:

```text
PARTIAL RESULT
```

A partial result should not be published as a final result unless explicitly allowed.

---

# 40. Missing Marks

Example:

```text
Mathematics: 82
Physics: 76
Chemistry: Missing
```

The system should flag:

```text
Result Incomplete
```

rather than silently treating Chemistry as zero.

---

# 41. Result Calculation Engine

The calculation engine should be centralized.

Conceptually:

```text
Assessment Marks
       ↓
Eligibility Rules
       ↓
Subject Calculation
       ↓
Weightage
       ↓
Total
       ↓
Percentage
       ↓
Grade
       ↓
Pass/Fail
```

---

# 42. Weightage Calculation

Example:

```text
Unit Test
Score: 80%
Weight: 20%

Contribution:
16%

Mid-Term
Score: 70%
Weight: 30%

Contribution:
21%
```

The final result combines configured contributions.

---

# 43. Weightage Validation

For a weighted result:

```text
Sum of applicable weights = 100%
```

unless the institution explicitly supports another model.

---

# 44. Assessment Inclusion

Not every assessment must necessarily contribute to a final result.

Example:

```text
Practice Test
Contributes to Final Result: NO
```

while:

```text
Final Exam
Contributes to Final Result: YES
```

---

# 45. Result Rule Configuration

Institutions may configure:

```text
Included Assessments
Weightages
Passing Rules
Grading Scale
Grace Marks
Rounding
Subject Inclusion
```

---

# 46. Rounding

Rounding rules must be explicit.

Example:

```text
81.56 → 81.6
```

or:

```text
81.56 → 82
```

depending on configured policy.

Do not use inconsistent rounding across different result screens.

---

# 47. Source of Truth

The assessment/evaluation layer remains the source for raw marks.

The results layer should calculate derived values.

```text
RAW DATA
Marks
   ↓
RESULT ENGINE
   ↓
Derived Result
```

---

# 48. Result Snapshot

When results are published, the system may need to preserve a historical snapshot of the calculation inputs/output.

This ensures future configuration changes do not unexpectedly rewrite historical published results.

---

# 49. Historical Result Integrity

Changing a grading scale later must not silently change an already published result.

Example:

```text
2026 Result
Published under Grade Scale A

Later:
Grade Scale changed

2026 published result
MUST remain historically accurate.
```

---

# 50. Result Correction

Authorized users may correct an error.

Example:

```text
Published Result
 ↓
Authorized Correction
 ↓
Recalculate
 ↓
Review
 ↓
Republish
```

---

# 51. Correction Audit

Every correction should record:

```text
Old Value
New Value
Changed By
Changed At
Reason
```

---

# 52. Result Unlock

If results are locked:

```text
Locked
 ↓
Authorized Unlock
 ↓
Edit
 ↓
Audit
 ↓
Relock
```

Only authorized roles may do this.

---

# 53. Report Card

A report card presents a student's result in a user-friendly format.

Typical sections:

```text
Student Information
Academic Information
Assessment Results
Subject Marks
Grades
Attendance
Teacher Remarks
Overall Result
```

Only include attendance/remarks if those modules are enabled and authorized.

---

# 54. Report Card Header

Example:

```text
ABC SCHOOL

Academic Year 2026–27

Term 1 Report Card
```

Tenant branding should be configurable.

---

# 55. Student Information

Example:

```text
Name: Rahul Kumar
Student ID: STU-00124
Class: 10
Section: A
Roll No: 12
```

Only expose identifiers intended for the report.

---

# 56. Subject Table

Example:

```text
Subject        Max       Obtained     Grade

Mathematics    100       82           A
Physics        100       76           B+
Chemistry      100       80           A
English        100       88           A+
```

---

# 57. Total Section

Example:

```text
Total Marks:
326 / 400

Percentage:
81.5%

Grade:
A

Result:
PASS
```

---

# 58. Attendance Section

If integrated:

```text
Working Days: 180
Present: 165
Attendance: 91.67%
```

Attendance data must come from the attendance module.

---

# 59. Teacher Remarks

Authorized teachers may provide remarks.

Example:

```text
Good academic progress.
Continue working on numerical problem solving.
```

Remarks should be editable only by authorized users.

---

# 60. Principal/Admin Remarks

Optional:

```text
Promoted to next class.
```

This should use appropriate permissions.

---

# 61. Parent Report Card View

Parents can open:

```text
Child
 ↓
Results
 ↓
Term
 ↓
Report Card
```

---

# 62. Student Report Card View

Students can see their own published report cards.

---

# 63. Report Card Download

If supported, users may generate a printable/downloadable report card.

The generated document must respect tenant branding and permissions.

---

# 64. Report Card Version

If a published result is corrected, the system may maintain:

```text
Version 1
Version 2
```

for audit purposes.

Only the current authorized report should normally be presented to end users.

---

# 65. Report Card Publication

Report cards should only become visible when the corresponding result is published.

---

# 66. Result Dashboard

Admin:

```text
Mid-Term Results

Students: 120
Evaluated: 120
Reviewed: 120
Published: 120
```

---

# 67. Result Completion

Example:

```text
Class 10A

Mathematics    100%
Physics         98%
Chemistry       95%
English        100%
```

The dashboard should help administrators identify incomplete result work.

---

# 68. Teacher Result Dashboard

Teacher can see:

```text
Subjects
 ↓
Assessments
 ↓
Pending Evaluation
 ↓
Pending Review
```

according to permissions.

---

# 69. Student Result Dashboard

Example:

```text
My Results

Mid-Term
82%

Term 1
84%

Latest Grade
A
```

Only published results should appear in the normal student result view.

---

# 70. Parent Result Dashboard

Example:

```text
Rahul Kumar

Latest Result
Term 1

Percentage: 82%
Grade: A
Status: PASS
```

---

# 71. Result History

Students should be able to view historical published results where permitted.

Example:

```text
2024–25
Term 1
78%

2025–26
Term 1
81%

2026–27
Term 1
84%
```

---

# 72. Academic Year Isolation

Historical results must remain associated with their original academic year.

Never move a student's historical result into the current academic year simply because the student was promoted.

---

# 73. Promotion Relationship

Promotion should be handled by the student progression/promotion module.

The result module can provide:

```text
Result Status
Percentage
Pass/Fail
```

as input.

It should not independently perform student promotion unless explicitly designed to do so.

---

# 74. Rank / Position

If the institution supports rank:

```text
Rank:
12 / 120
```

Rank calculation must be configurable.

Some institutions may intentionally disable rank.

---

# 75. Rank Privacy

Student-facing rank information should only be displayed if the institution enables it.

Do not expose other students' marks simply to calculate/display rank.

---

# 76. Tie Handling

If ranking is enabled, the ranking algorithm must define how ties are handled.

Examples:

```text
1
2
2
4
```

or:

```text
1
2
2
3
```

This should be a configurable calculation rule.

---

# 77. Topper Lists

If enabled, authorized staff may view:

```text
Top Students
Subject Toppers
Class Performance
```

This is an administrative reporting function.

---

# 78. Student Comparison

Students should not automatically receive peer-level personal academic data.

A student can see their own result and institution-approved aggregate comparisons.

---

# 79. Class Average

Authorized teachers/admins may see:

```text
Class Average:
74.8%
```

This is aggregate data and should not reveal individual student results.

---

# 80. Subject Average

Example:

```text
Mathematics Average:
72.4%
```

---

# 81. Result Distribution

Admin may see:

```text
A+ : 8
A  : 22
B+ : 31
B  : 40
C  : 15
```

subject to configured grading rules.

---

# 82. Performance Summary

Example:

```text
Class 10A

Average: 74.8%
Highest: 96%
Lowest: 42%
Pass Rate: 91%
```

This belongs to analytics/reporting and must respect privacy rules.

---

# 83. Result Search

Admin can search by:

```text
Student Name
Student ID
Class
Section
Batch
Assessment
Academic Year
```

---

# 84. Result Filters

Useful filters:

```text
Pass
Fail
Incomplete
Published
Draft
Locked
```

---

# 85. Result Export

Authorized administrators may export result data.

Possible formats:

```text
CSV
Excel
PDF
```

depending on the project's supported artifact/export architecture.

---

# 86. Export Security

Exports must:

```text
Respect tenant scope
Respect user permissions
Contain only authorized data
Be logged where appropriate
```

---

# 87. Result Notification

When a result is published:

```text
Result Published

Your Mid-Term Examination result
is now available.
```

---

# 88. Corrected Result Notification

If a published result changes:

```text
Result Updated

Your Mid-Term Examination result
has been updated after an authorized correction.
```

---

# 89. Result Data Model Concept

Conceptually:

```text
RESULT
 ├── tenant
 ├── academic_year
 ├── academic_context
 ├── student
 ├── result_type
 ├── status
 ├── total_marks
 ├── maximum_marks
 ├── percentage
 ├── grade
 └── result_status

RESULT SUBJECT
 ├── result
 ├── subject
 ├── obtained_marks
 ├── maximum_marks
 ├── grade
 ├── status
 └── source_assessment

GRADE SCALE
 ├── tenant
 ├── name
 └── rules

RESULT CALCULATION
 ├── result
 ├── assessment
 ├── weight
 └── contribution

RESULT AUDIT
 ├── result
 ├── action
 ├── old_value
 ├── new_value
 ├── changed_by
 └── changed_at
```

Actual table names must follow the project's canonical schema.

---

# 90. Result Relationships

The primary relationship:

```text
Tenant
 ↓
Academic Year
 ↓
Academic Context
 ↓
Student
 ↓
Assessment Marks
 ↓
Result Calculation
 ↓
Result
 ↓
Report Card
```

---

# 91. Result Calculation Separation

The system should separate:

```text
RAW MARKS
```

from:

```text
CALCULATED RESULT
```

and:

```text
PRESENTATION
```

Architecture:

```text
Marks
 ↓
Calculation Service
 ↓
Result Record
 ↓
Report Card Renderer
```

---

# 92. Calculation Reproducibility

Given the same:

```text
Marks
Assessment Configuration
Weightage
Grade Scale
Passing Rules
```

the calculation engine should produce the same result.

---

# 93. Configuration Versioning

Where practical, published results should retain the calculation configuration/version used to generate them.

This prevents future configuration changes from unexpectedly altering historical results.

---

# 94. Result Validation

Before finalization:

```text
Student exists
Academic year valid
Enrollment valid
Source marks valid
Maximum marks valid
Required subjects resolved
Grade scale available
Passing rules available
Weightages valid
```

---

# 95. Result Calculation Errors

Examples:

```text
Cannot calculate result:
Missing Physics marks.

Cannot publish:
Grade scale is not configured.

Cannot finalize:
Weightage total is 90%.
```

Errors should explain what must be fixed.

---

# 96. Result Locking

Once locked:

```text
Marks
Grades
Percentage
Pass/Fail
```

must not be directly editable through normal interfaces.

---

# 97. Result Recalculation

If source marks are corrected before publication:

```text
Correct Marks
 ↓
Recalculate Result
 ↓
Validate
 ↓
Review
```

---

# 98. Published Result Recalculation

Published results must not automatically recalculate because an unrelated configuration changed.

Any post-publication recalculation should be an explicit authorized operation.

---

# 99. Tenant Branding

Report cards may include:

```text
Institution Logo
Institution Name
Address
Contact Information
Academic Year
```

using tenant configuration.

---

# 100. Mobile Result View

The result UI must be mobile-first.

Recommended:

```text
Term 1 Result

82.0%
A
PASS

[View Subjects]

Mathematics   82/100
Physics       76/100
Chemistry     80/100
```

Avoid requiring horizontal scrolling for basic result viewing.

---

# 101. Mobile Report Card

On mobile:

```text
Student Information
 ↓
Overall Result
 ↓
Subject Results
 ↓
Remarks
 ↓
Report Card
```

should be easy to navigate.

---

# 102. Empty States

Example:

```text
No published results yet.
```

or:

```text
Result is currently being prepared.
```

Do not show misleading zeros.

---

# 103. Loading States

Examples:

```text
Loading result...
Calculating result...
Generating report card...
```

---

# 104. Error States

Examples:

```text
Unable to load result.
Result calculation failed.
Report card could not be generated.
You do not have permission to view this result.
```

---

# 105. Multi-Tenant Security

Every result must be tenant-scoped.

Tenant A must never access:

```text
Tenant B Results
Tenant B Marks
Tenant B Report Cards
Tenant B Students
```

---

# 106. Authorization

Every result operation must verify:

```text
Authenticated User
Tenant Membership
Role
Academic Scope
Student Relationship
Result Permission
```

---

# 107. Parent Authorization

A parent may only view results for children linked to their account.

---

# 108. Student Authorization

A student may only view their own published results.

---

# 109. Teacher Authorization

Teachers may view results for students within their authorized academic scope.

Modification rights must be separately controlled.

---

# 110. Admin Authorization

Authorized administrators may manage result configuration and corrections according to permissions.

---

# 111. Direct ID Protection

Never trust:

```text
result_id
student_id
assessment_id
```

from the client.

Every request requires server-side authorization.

---

# 112. Audit Events

Important events:

```text
result.calculated
result.reviewed
result.locked
result.published
result.unlocked
result.corrected
result.archived
report_card.generated
```

---

# 113. Business Rules

The system must enforce:

1. Every result belongs to one tenant.
2. Every result belongs to an academic year.
3. Every result belongs to a valid student/enrollment context.
4. Raw marks come from authorized assessment/evaluation data.
5. Marks cannot exceed maximum marks.
6. Absent and exempt are distinct from zero.
7. Grade scales are configurable.
8. Passing rules are configurable.
9. Weightages are configurable.
10. Historical published results must remain stable.
11. Locked results require elevated permission to change.
12. Corrections must be auditable.
13. Students only see their own published results.
14. Parents only see linked children's results.
15. Cross-tenant access is prohibited.

---

# 114. Antigravity MUST NOT

Antigravity must NOT:

- Hard-code grading scales.
- Hard-code passing percentages.
- Automatically convert absent into zero.
- Automatically convert exempt into fail.
- Change published historical results because configuration changed.
- Allow students to edit results.
- Allow parents to edit results.
- Allow unauthorized teachers to change marks.
- Recalculate published results silently.
- Expose other students' marks.
- Mix academic years.
- Mix tenants.
- Copy historical results into new academic years.
- Delete audit history for corrected results.

---

# 115. Complete Result Workflow

```text
Assessment
    ↓
Exam Completed
    ↓
Evaluation
    ↓
Marks Entered
    ↓
Marks Validated
    ↓
Calculate Result
    ↓
Subject Results
    ↓
Total / Percentage
    ↓
Grade
    ↓
Pass / Fail
    ↓
Review
    ↓
Lock
    ↓
Publish
    ↓
Student / Parent
    ↓
Report Card
```

---

# 116. Complete Correction Workflow

```text
Published Result
      ↓
Correction Requested
      ↓
Authorized User
      ↓
Unlock
      ↓
Correct Source Data
      ↓
Recalculate
      ↓
Validate
      ↓
Review
      ↓
Lock
      ↓
Republish
      ↓
Audit Record
```

---

# 117. Final Architecture

```text
                         TENANT
                           |
                     ACADEMIC YEAR
                           |
                    ACADEMIC CONTEXT
                           |
                         STUDENT
                           |
                    ASSESSMENT MARKS
                           |
                    RESULT ENGINE
                           |
              +------------+------------+
              |            |            |
           SUBJECT       TOTAL       WEIGHTAGE
            RESULT        |            |
              |        PERCENTAGE      |
              |            |           |
              +------------+-----------+
                           |
                         GRADE
                           |
                      PASS / FAIL
                           |
                     RESULT STATUS
                           |
                 +---------+---------+
                 |                   |
            STUDENT VIEW        REPORT CARD
                 |                   |
              PARENT              EXPORT/PDF
```

---

# 118. Final Principle

> **Results are derived academic outcomes generated from evaluated assessment data. The system must keep raw marks separate from calculated results, use configurable grading and passing rules, preserve historical published outcomes, enforce strict tenant and student-level authorization, and provide a clear path from marks to subject results, overall results, and report cards.**

---

# 119. Next Document

The next specification is:

```text
18-STUDENT-PERFORMANCE-AND-ANALYTICS.md
```

It will define:

```text
Student Academic Data
        ↓
Attendance
        ↓
Homework
        ↓
Assessments
        ↓
Results
        ↓
Performance Metrics
        ↓
Student Analytics
        ↓
Teacher Analytics
        ↓
Parent Insights
        ↓
Admin Dashboard
```

It will cover **student performance tracking, academic trends, subject analysis, attendance-performance relationships, assignment performance, assessment trends, class/batch analytics, dashboards, KPIs, and privacy-safe reporting.**

---

# END OF DOCUMENT
# STUDENT PERFORMANCE & ANALYTICS
# School + Coaching Centre ERP SaaS

**Document:** `18-STUDENT-PERFORMANCE-AND-ANALYTICS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `17-RESULTS-AND-REPORT-CARDS.md`  
**Next Document:** `19-FEES-AND-FINANCE.md`

---

# 1. Purpose

This document defines the Student Performance and Analytics module.

The purpose of this module is to convert academic activity into useful, understandable insights for:

- Students
- Parents
- Teachers
- Academic coordinators
- Administrators

The module combines data from existing academic modules such as:

```text
Attendance
Homework
Assignments
Exams
Assessments
Marks
Results
```

and converts it into:

```text
Performance Metrics
Trends
Subject Analysis
Progress Indicators
Academic Insights
Dashboards
Reports
```

---

# 2. Core Principle

Analytics must be a **reporting and insight layer**.

It must not become a second source of truth.

The architecture is:

```text
Source Modules
     ↓
Attendance
Assignments
Assessments
Results
     ↓
Analytics Layer
     ↓
Metrics
     ↓
Trends
     ↓
Dashboards
```

---

# 3. Supported Contexts

The system must support both:

```text
SCHOOL
Academic Year
 → Class
 → Section
 → Subject
 → Student
```

and:

```text
COACHING
Academic Year
 → Course
 → Batch
 → Subject
 → Student
```

Analytics must always preserve the correct academic context.

---

# 4. Analytics Audiences

Different users require different views.

```text
Student
 ↓
Personal Performance

Parent
 ↓
Child Performance

Teacher
 ↓
Class / Subject Performance

Academic Coordinator
 ↓
Academic Trends

Admin
 ↓
Institution-Level Analytics
```

---

# 5. Student Performance Overview

A student's overview may include:

```text
Overall Percentage
Average Marks
Attendance
Assignments Completed
Assignments Pending
Assessment Count
Subject Performance
Performance Trend
```

Only metrics supported by available data should be displayed.

---

# 6. Student Dashboard

Example:

```text
MY PERFORMANCE

Overall Score
82%

Attendance
91%

Assignments
18 / 21 Completed

Latest Assessment
84%

Trend
Improving
```

---

# 7. Parent Dashboard

Example:

```text
RAHUL'S PERFORMANCE

Overall:
82%

Attendance:
91%

Assignments:
18 / 21

Latest Test:
84%

Strongest Subject:
Mathematics

Needs Attention:
Physics
```

Insights must be based on actual available data.

---

# 8. Teacher Dashboard

Teacher may see:

```text
CLASS PERFORMANCE

Students:
40

Average:
74.8%

Pass Rate:
91%

Assignment Completion:
86%

Attendance:
89%
```

---

# 9. Admin Dashboard

Admin may see institution-level metrics:

```text
STUDENT PERFORMANCE

Students:
1,250

Average Score:
76.4%

Pass Rate:
88%

Average Attendance:
91%

Assignment Completion:
84%
```

---

# 10. Performance Metrics

The analytics engine may calculate:

```text
Average Score
Percentage
Pass Rate
Attendance Rate
Assignment Completion Rate
Assessment Completion
Subject Average
Score Trend
```

---

# 11. Average Score

For a defined scope:

```text
Average Score =
Sum of Valid Scores / Number of Valid Scores
```

The exact aggregation must respect assessment weighting rules.

---

# 12. Percentage

Percentage should come from the result calculation layer where possible.

Do not independently calculate a different percentage in analytics if an authoritative result percentage already exists.

---

# 13. Attendance Rate

If attendance is available:

```text
Attendance Rate =
Present Days / Applicable Attendance Days × 100
```

Use the attendance module's canonical calculation where available.

---

# 14. Assignment Completion Rate

Example:

```text
Completed Assignments:
18

Applicable Assignments:
21

Completion Rate:
85.71%
```

Do not count assignments that were not actually assigned to the student.

---

# 15. Late Submission Rate

Optional metric:

```text
Late Submissions /
Submitted Assignments × 100
```

---

# 16. Missing Assignment Rate

Example:

```text
Not Submitted:
3

Assigned:
21

Missing Rate:
14.29%
```

---

# 17. Assessment Participation

Example:

```text
Assessments:
10

Participated:
9

Absent:
1
```

Participation must distinguish:

```text
PRESENT
ABSENT
EXEMPT
```

---

# 18. Subject Performance

Student analytics should show subject-level performance.

Example:

```text
SUBJECT PERFORMANCE

Mathematics     88%
Physics         74%
Chemistry       79%
English         85%
```

---

# 19. Strongest Subject

If enabled, identify the subject with the highest valid performance metric.

Example:

```text
Strongest:
Mathematics — 88%
```

Avoid displaying this if insufficient data exists.

---

# 20. Weakest Subject

If enabled:

```text
Needs Attention:
Physics — 74%
```

The wording should be supportive rather than punitive.

---

# 21. Subject Trend

Example:

```text
Mathematics

Test 1    72%
Test 2    78%
Test 3    84%
Test 4    88%

Trend:
Improving
```

---

# 22. Performance Trend

The system may classify trends as:

```text
IMPROVING
STABLE
DECLINING
INSUFFICIENT_DATA
```

The threshold must be configurable.

---

# 23. Trend Calculation

A simple trend model may compare recent performance against earlier performance.

Example:

```text
Previous Average:
72%

Recent Average:
81%

Difference:
+9 percentage points
```

The system should avoid declaring a trend from extremely small datasets.

---

# 24. Minimum Data Requirement

Trend insights should require a configurable minimum number of observations.

Example:

```text
Minimum:
3 assessments
```

If insufficient:

```text
Not enough data to determine a trend.
```

---

# 25. Time-Based Performance

Analytics may support:

```text
Weekly
Monthly
Term
Academic Year
```

depending on the underlying data.

---

# 26. Academic Year Filter

Users with appropriate permissions can select:

```text
2024–25
2025–26
2026–27
```

Historical analytics must remain associated with their original academic year.

---

# 27. Term Filter

If terms are configured:

```text
Term 1
Term 2
Term 3
```

Analytics should support term-level filtering.

---

# 28. Assessment Filter

Teachers/admins may analyze:

```text
Unit Tests
Mid-Term
Final Exam
Mock Tests
```

---

# 29. Subject Filter

Analytics can be filtered by:

```text
Mathematics
Physics
Chemistry
English
```

---

# 30. Class Filter

School analytics:

```text
Class 9
Class 10
Class 11
Class 12
```

---

# 31. Section Filter

Where applicable:

```text
10A
10B
10C
```

---

# 32. Batch Filter

Coaching analytics:

```text
JEE Morning Batch
NEET Evening Batch
Foundation Batch
```

---

# 33. Student-Level Analytics

Student performance page:

```text
Student
 ↓
Overall
 ↓
Subjects
 ↓
Assessments
 ↓
Assignments
 ↓
Attendance
 ↓
Trends
```

---

# 34. Teacher-Level Analytics

Teacher may view:

```text
My Students
 ↓
Class Performance
 ↓
Subject Performance
 ↓
Assessment Performance
 ↓
Assignment Completion
```

---

# 35. Class Performance

Example:

```text
CLASS 10A

Students: 40

Average Score: 74.8%
Highest: 96%
Lowest: 42%
Pass Rate: 91%
```

---

# 36. Subject Class Performance

Example:

```text
MATHEMATICS

Average:
78.4%

Pass Rate:
94%

Students Assessed:
40
```

---

# 37. Subject Comparison

Authorized users may compare subjects:

```text
Subject        Average

Mathematics    78%
Physics        71%
Chemistry      76%
English        84%
```

---

# 38. Class Comparison

Admin may compare classes:

```text
Class       Average

9A          72%
9B          76%
10A         79%
10B         74%
```

Only authorized users may access aggregate institutional comparisons.

---

# 39. Batch Comparison

For coaching:

```text
Batch               Average

JEE Morning          81%
JEE Evening          76%
Foundation           73%
```

---

# 40. Assessment Analysis

For an assessment:

```text
Assessment:
Mid-Term Examination

Average:
74%

Highest:
96%

Lowest:
42%

Pass Rate:
91%
```

---

# 41. Grade Distribution

Example:

```text
A+   8 students
A   22 students
B+  31 students
B   40 students
C   15 students
```

Use the configured grading scale.

---

# 42. Score Distribution

Analytics may show score ranges:

```text
90–100
80–89
70–79
60–69
Below 60
```

These ranges should be configurable or derived from the configured grading system.

---

# 43. Pass Rate

Default:

```text
Pass Rate =
Passed Students /
Eligible Students × 100
```

Do not count exempt students as failed.

---

# 44. Failure Rate

```text
Failure Rate =
Failed Students /
Eligible Students × 100
```

---

# 45. Attendance vs Performance

Where both datasets are available, authorized users may compare:

```text
Attendance
        +
Academic Performance
```

Example:

```text
Student A
Attendance: 96%
Average: 88%

Student B
Attendance: 72%
Average: 61%
```

This is descriptive analytics only.

The system must not claim that attendance caused the performance outcome.

---

# 46. Assignment vs Performance

The system may compare:

```text
Assignment Completion
+
Assessment Performance
```

Example:

```text
High completion:
88% average

Low completion:
64% average
```

Again, this is an observed relationship, not proof of causation.

---

# 47. Risk Indicators

Analytics may provide configurable indicators such as:

```text
Low Attendance
Declining Scores
Missing Assignments
Repeated Failures
Low Assessment Participation
```

---

# 48. Risk Status

Possible states:

```text
NORMAL
WATCH
ATTENTION
```

The exact thresholds must be configurable.

---

# 49. Risk Example

```text
Student:
Rahul

Status:
ATTENTION

Reasons:
• Attendance below configured threshold
• Recent scores declining
• 4 assignments overdue
```

The system should show the actual underlying reasons.

---

# 50. No Unsupported Predictions

The analytics system must NOT make unsupported claims such as:

```text
"You will fail."
"You will get 90%."
"You are guaranteed to qualify."
```

Analytics should describe observed patterns.

---

# 51. Academic Insight

A safe insight:

```text
Your Mathematics scores increased
from 72% to 86% across the last
four assessments.
```

Avoid unsupported psychological or predictive statements.

---

# 52. Teacher Insights

Example:

```text
Mathematics performance improved
by 8 percentage points compared
with the previous assessment.
```

---

# 53. Parent Insights

Example:

```text
Rahul's recent Mathematics results
are higher than his earlier results.
```

Keep parent messaging factual and constructive.

---

# 54. Student Insights

Example:

```text
Your recent Physics scores have
been below your previous average.
```

---

# 55. Privacy

Analytics must never become a way to bypass normal authorization.

A teacher should not be able to retrieve unrelated students' personal data through analytics APIs.

---

# 56. Aggregate Privacy

Institution-level analytics may show:

```text
Average
Median
Pass Rate
Distribution
```

without exposing unnecessary individual student information.

---

# 57. Student Privacy

Students can see:

```text
Own Performance
Own Results
Own Attendance
Own Assignments
```

but not private detailed analytics for other students.

---

# 58. Parent Privacy

Parents can only access analytics for linked children.

---

# 59. Teacher Privacy

Teachers can access analytics for students within their authorized academic scope.

---

# 60. Admin Privacy

Administrators may access broader analytics according to role permissions.

---

# 61. Dashboard Design

The analytics UI should prioritize:

```text
Most Important KPI
 ↓
Trend
 ↓
Subject Breakdown
 ↓
Assessment Breakdown
 ↓
Supporting Details
```

Avoid overwhelming users with dozens of charts.

---

# 62. Mobile-First Analytics

Mobile dashboard example:

```text
MY PERFORMANCE

82%
Overall

↑ 6%
vs Previous Period

Attendance
91%

Assignments
86%

Subjects

Math       88%
Physics    74%
Chemistry  79%
```

Cards should stack vertically on small screens.

---

# 63. Desktop Analytics

Desktop can use:

```text
KPI Cards
Charts
Tables
Filters
Detailed Breakdowns
```

while preserving the same underlying metrics.

---

# 64. Chart Types

Useful visualizations:

```text
Line Chart
Bar Chart
Progress Card
Donut / Distribution
Table
```

Use the simplest chart that communicates the metric.

---

# 65. Performance Trend Chart

Example:

```text
Score %

90 |             ●
80 |       ●  ●
70 |  ●
60 |
   +----------------
      T1 T2 T3 T4
```

---

# 66. Subject Comparison Chart

Example:

```text
Mathematics   █████████ 88%
Physics       ███████   74%
Chemistry     ████████  79%
English       █████████ 85%
```

The exact UI implementation is up to the frontend architecture.

---

# 67. Date Range

Where applicable:

```text
This Month
This Term
This Academic Year
Custom Range
```

---

# 68. Analytics Refresh

Analytics should reflect source data changes according to the application's consistency requirements.

If metrics are cached, define an explicit refresh/invalidation strategy.

---

# 69. No Stale Critical Data

Critical academic information such as published marks should come from authoritative records.

Do not display stale cached marks as current without an appropriate consistency strategy.

---

# 70. Performance Optimization

Analytics can become computationally expensive.

Use:

```text
Aggregations
Indexes
Precomputed Metrics
Caching
Pagination
Materialized/summary tables
```

where justified by actual scale.

---

# 71. Avoid N+1 Queries

Analytics APIs must avoid repeatedly querying individual students/subjects when aggregated queries can be used.

---

# 72. Pagination

Large student lists must be paginated.

Example:

```text
Students 1–50
Next
```

---

# 73. Filtering

Filtering should preferably happen at the database/query layer rather than loading an entire dataset into the browser.

---

# 74. Analytics Data Model Concept

The analytics layer should generally derive from canonical modules.

Conceptually:

```text
ATTENDANCE
       |
ASSIGNMENTS
       |
ASSESSMENTS
       |
RESULTS
       |
       v
ANALYTICS SERVICE
       |
       +---- STUDENT METRICS
       |
       +---- SUBJECT METRICS
       |
       +---- CLASS METRICS
       |
       +---- BATCH METRICS
       |
       +---- INSTITUTION METRICS
```

Do not create duplicate source-of-truth records unnecessarily.

---

# 75. Metric Definition

Every metric should have a clear definition.

Example:

```text
Metric:
Assignment Completion Rate

Definition:
Completed applicable assignments /
Total applicable assignments × 100
```

---

# 76. Metric Scope

Every metric should define its scope:

```text
Student
Subject
Class
Section
Batch
Assessment
Term
Academic Year
Tenant
```

---

# 77. Metric Date Context

Every time-based metric should specify:

```text
Start Date
End Date
Academic Year
Term
```

where applicable.

---

# 78. Missing Data

Analytics must distinguish:

```text
0
```

from:

```text
No Data
```

Example:

```text
Attendance:
No data recorded
```

must not be displayed as:

```text
0%
```

---

# 79. Insufficient Data

Example:

```text
Trend unavailable.

At least 3 assessments are required.
```

---

# 80. Deleted / Archived Source Records

Analytics should respect the source module's historical rules.

Archiving an assignment should not automatically erase historical analytics.

---

# 81. Academic Year Isolation

Analytics for:

```text
2025–26
```

must not accidentally include:

```text
2026–27
```

data.

---

# 82. Enrollment Changes

If a student changes section or batch:

```text
Historical Data
```

must remain associated with the original academic context.

Current analytics may use the student's current context depending on the selected reporting scope.

---

# 83. Student Promotion

Promotion must not rewrite historical performance.

Example:

```text
2025–26
Class 9
 ↓
2026–27
Class 10
```

Class 9 performance remains Class 9 historical data.

---

# 84. Transfer

If a student transfers between contexts within the same tenant, analytics must preserve the original context of historical records.

---

# 85. Multi-Tenant Security

All analytics queries must be tenant-scoped.

Example:

```text
Tenant A Analytics
      X
Tenant B Data
```

Cross-tenant aggregation must never happen accidentally.

---

# 86. Authorization

Every analytics endpoint must verify:

```text
Authenticated User
Tenant Membership
Role
Academic Scope
Student Relationship
```

---

# 87. Direct ID Protection

Never trust client-provided:

```text
student_id
class_id
section_id
batch_id
assessment_id
```

without server-side authorization.

---

# 88. Teacher Scope

A teacher assigned to:

```text
Class 10A Mathematics
```

must not automatically gain access to:

```text
Class 12
Other Subjects
Other Batches
```

unless permissions explicitly allow it.

---

# 89. Parent Scope

Parent analytics must be restricted to linked children.

---

# 90. Student Scope

Student analytics must be restricted to the authenticated student.

---

# 91. Admin Scope

Admins may access wider analytics according to their assigned role.

---

# 92. Audit Events

Important events may include:

```text
analytics.viewed
analytics.exported
report.generated
```

where audit logging is appropriate.

---

# 93. Export

Authorized users may export analytics.

Possible formats:

```text
CSV
Excel
PDF
```

depending on supported export functionality.

---

# 94. Export Security

Exports must respect:

```text
Tenant
Role
Academic Scope
Student Relationships
```

and should not expose hidden fields.

---

# 95. Dashboard Empty States

Example:

```text
No performance data available yet.
```

---

# 96. Dashboard Loading

Example:

```text
Loading performance...
Calculating insights...
```

---

# 97. Dashboard Error

Example:

```text
Unable to load performance data.
Please try again.
```

---

# 98. Analytics Business Rules

The system must enforce:

1. Analytics are derived from canonical source modules.
2. Every metric has a defined calculation.
3. Metrics are tenant-scoped.
4. Academic year boundaries are respected.
5. Historical context is preserved.
6. Missing data is not treated as zero.
7. Trends require sufficient data.
8. Student-level data requires student-level authorization.
9. Parent analytics are limited to linked children.
10. Teacher analytics are limited to authorized academic scope.
11. Aggregate analytics must not expose unnecessary personal data.
12. Published result data must remain consistent with the result module.
13. Analytics must not silently alter source academic data.
14. Predictions must not be presented as facts.
15. Exported analytics must respect all permissions.

---

# 99. Antigravity MUST NOT

Antigravity must NOT:

- Create a second source of truth for marks.
- Recalculate official results differently from the Results module.
- Mix academic years.
- Mix tenants.
- Show another student's private data.
- Show parent analytics for an unrelated student.
- Treat missing data as zero.
- Declare trends from insufficient data.
- Claim causal relationships without evidence.
- Make unsupported predictions about student outcomes.
- Allow teachers to access analytics outside their scope.
- Expose hidden data through exports.
- Hard-code grading rules.
- Hard-code institutional thresholds.
- Delete historical analytics context when students are promoted or transferred.

---

# 100. Recommended Student Dashboard

```text
+--------------------------------+
| MY PERFORMANCE                 |
+--------------------------------+

Overall
82%

↑ 6% vs Previous Period

Attendance
91%

Assignments
86%

--------------------------------

SUBJECT PERFORMANCE

Mathematics       88%
Physics           74%
Chemistry         79%
English           85%

--------------------------------

RECENT ASSESSMENTS

Mid-Term          82%
Test 04           84%
Test 03           78%

--------------------------------

INSIGHTS

Mathematics performance
has improved across recent tests.

Physics performance needs
additional attention.
```

---

# 101. Recommended Teacher Dashboard

```text
+--------------------------------+
| CLASS PERFORMANCE              |
+--------------------------------+

Students              40
Average               74.8%
Pass Rate             91%
Attendance            89%

--------------------------------

SUBJECT PERFORMANCE

Mathematics           78%
Physics               71%
Chemistry             76%

--------------------------------

ASSIGNMENTS

Completion            86%
Late                  8%
Missing               6%

--------------------------------

ATTENTION AREAS

• 4 students declining
• 6 students low attendance
• Physics average below target
```

---

# 102. Recommended Admin Dashboard

```text
+--------------------------------+
| ACADEMIC PERFORMANCE           |
+--------------------------------+

Students             1,250
Average              76.4%
Pass Rate             88%
Attendance            91%

--------------------------------

CLASS PERFORMANCE

Class 9               72%
Class 10              77%
Class 11              75%
Class 12              81%

--------------------------------

SUBJECT PERFORMANCE

Mathematics            78%
Physics                71%
Chemistry              76%
English                84%
```

---

# 103. Final Architecture

```text
                         TENANT
                           |
                     ACADEMIC YEAR
                           |
                    ACADEMIC CONTEXT
                           |
                         STUDENT
                           |
        +------------------+------------------+
        |                  |                  |
    ATTENDANCE        ASSIGNMENTS        ASSESSMENTS
        |                  |                  |
        +------------------+------------------+
                           |
                        RESULTS
                           |
                           ↓
                  ANALYTICS SERVICE
                           |
        +----------+-------+--------+----------+
        |          |                |          |
     STUDENT    SUBJECT          CLASS       BATCH
     METRICS    METRICS         METRICS     METRICS
        |          |                |          |
        +----------+-------+--------+----------+
                           |
                       DASHBOARDS
                           |
          +----------------+----------------+
          |                |                |
       STUDENT           PARENT          TEACHER
                                             |
                                           ADMIN
```

---

# 104. Final Principle

> **Analytics is an interpretation layer over authoritative academic data. It must provide clear, useful, privacy-safe insights while preserving the source modules as the system of record. Every metric must have a defined scope and calculation, historical academic context must remain intact, and analytics must never bypass authorization or invent unsupported conclusions.**

---

# 105. Next Document

The next specification is:

```text
19-FEES-AND-FINANCE.md
```

It will define:

```text
Fee Structure
      ↓
Student Fee Assignment
      ↓
Invoices / Dues
      ↓
Payments
      ↓
Receipts
      ↓
Discounts
      ↓
Concessions
      ↓
Late Fees
      ↓
Outstanding Balance
      ↓
Financial Reports
```

It will cover **fee structures, fee heads, student dues, installments, payments, receipts, discounts, concessions, refunds, late fees, outstanding balances, parent payment workflows, finance dashboards, and financial security.**

---

# END OF DOCUMENT
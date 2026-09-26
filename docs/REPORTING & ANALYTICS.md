# REPORTING & ANALYTICS
# School + Coaching Centre ERP SaaS

**Document:** `23-REPORTING-AND-ANALYTICS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `22-AUDIT-LOGGING-AND-ACTIVITY.md`  
**Next Document:** `24-SEARCH-FILTERING-AND-DATA-EXPORT.md`

---

# 1. Purpose

The Reporting & Analytics module converts ERP data into useful information for decision-making.

It provides:

```text
Dashboards
Reports
KPIs
Charts
Tables
Analytics
Filters
Comparisons
Exports
Scheduled Reports
```

The module must work across:

```text
Students
Admissions
Attendance
Academics
Homework
Exams
Results
Fees
Payments
Teachers
Branches
Communication
```

---

# 2. Core Principle

Reports must be based on authoritative business data.

```text
Business Modules
       ↓
Canonical Data
       ↓
Reporting Layer
       ↓
Metrics / Aggregations
       ↓
Reports & Dashboards
```

Reporting must **not modify transactional data**.

---

# 3. Reporting Architecture

```text
                  ERP DATABASE
                       |
        +--------------+--------------+
        |              |              |
     Students       Academics       Finance
        |              |              |
     Attendance       Exams         Payments
        |              |              |
        +--------------+--------------+
                       ↓
               REPORTING SERVICE
                       ↓
              METRIC CALCULATION
                       ↓
        +--------------+--------------+
        |              |              |
     Dashboards      Reports       Analytics
        |              |              |
        +--------------+--------------+
                       ↓
                Export / Schedule
```

---

# 4. Reporting Categories

The system should support:

```text
ACADEMIC
ATTENDANCE
STUDENT
ADMISSION
FINANCE
PAYMENTS
TEACHER
HOMEWORK
EXAM
RESULT
COMMUNICATION
BRANCH
OPERATIONAL
```

---

# 5. Dashboard

The dashboard is the primary high-level reporting surface.

It should show:

```text
Important KPIs
Recent Activity
Trends
Alerts
Pending Actions
Charts
Quick Reports
```

---

# 6. Role-Based Dashboard

Different roles should see different analytics.

### Admin

```text
Students
Admissions
Attendance
Fees
Payments
Academic Performance
Teachers
Branches
```

### Teacher

```text
My Classes
Attendance
Homework
Exams
Student Performance
```

### Finance

```text
Fees
Collections
Outstanding
Payments
Refunds
```

### Parent

```text
Child Attendance
Homework
Results
Fees
```

### Student

```text
Attendance
Homework
Exams
Results
```

---

# 7. Dashboard Permission

A user should only see metrics they are authorized to access.

Frontend visibility is not sufficient.

Backend authorization must enforce the same boundary.

---

# 8. KPI Cards

Example:

```text
┌──────────────┐
│ TOTAL STUDENTS│
│    2,450      │
│    +4.2%      │
└──────────────┘

┌──────────────┐
│ ATTENDANCE    │
│    87.4%      │
│    +2.1%      │
└──────────────┘

┌──────────────┐
│ COLLECTION    │
│ ₹18.4 Lakh    │
│    +8.5%      │
└──────────────┘

┌──────────────┐
│ OUTSTANDING   │
│ ₹4.2 Lakh     │
│    -5.2%      │
└──────────────┘
```

---

# 9. KPI Definition

Every KPI must have a clearly defined calculation.

Example:

```text
Attendance Rate =
Present Attendance / Applicable Attendance × 100
```

The exact business definition must follow the attendance module.

Do not create conflicting definitions in the reporting layer.

---

# 10. Date Range

Reports should support:

```text
Today
Yesterday
This Week
Last Week
This Month
Last Month
This Quarter
This Year
Academic Year
Custom Range
```

---

# 11. Date Semantics

Date filtering must use the relevant business date.

Examples:

```text
Attendance → attendance date
Payment → payment/transaction date
Admission → application/admission date
Exam → exam date
```

Do not blindly use `created_at` for every report.

---

# 12. Academic Year

Academic reports should support academic-year filtering.

Example:

```text
2026–27
```

Academic-year logic must follow the canonical academic configuration.

---

# 13. Branch Filter

For multi-branch tenants:

```text
All Branches
Branch A
Branch B
Branch C
```

Users only see branches they are authorized to access.

---

# 14. Class Filter

Possible filters:

```text
Class
Section
Batch
Course
Subject
```

---

# 15. Student Filters

Reports may filter by:

```text
Status
Gender
Class
Section
Batch
Admission Date
Branch
```

Only fields actually supported by the canonical student model should be implemented.

---

# 16. Academic Analytics

Academic analytics should provide:

```text
Average Marks
Pass Rate
Subject Performance
Class Performance
Student Performance
Exam Performance
Trend Analysis
```

---

# 17. Student Performance

Example:

```text
STUDENT PERFORMANCE

Mathematics      82%
Science          76%
English          89%
Social Science   81%

Overall:
82%
```

---

# 18. Class Performance

Example:

```text
CLASS 10-A

Average:
78%

Highest:
96%

Lowest:
42%

Pass Rate:
91%
```

---

# 19. Subject Performance

Example:

```text
MATHEMATICS

Average:
74%

Pass Rate:
88%

Students:
120
```

---

# 20. Performance Trend

Example:

```text
Exam 1 → 68%
Exam 2 → 72%
Exam 3 → 78%
Exam 4 → 81%
```

The chart should clearly communicate whether performance is improving or declining.

---

# 21. Attendance Analytics

Attendance reporting should include:

```text
Overall Attendance
Student Attendance
Class Attendance
Teacher Attendance
Daily Attendance
Monthly Attendance
Absenteeism
Attendance Trends
```

---

# 22. Attendance KPI

Example:

```text
Attendance Rate:
87.4%

Present:
8,740

Absent:
1,260
```

The denominator must follow the attendance business rules.

---

# 23. Attendance Trend

Example:

```text
June      84%
July      86%
August    87%
```

---

# 24. Low Attendance Report

Example:

```text
LOW ATTENDANCE

Student       Class      Attendance
Rahul         10-A       61%
Aman          10-B       65%
Sara          9-A        68%
```

The threshold should be configurable according to the institution's rules.

---

# 25. Attendance Alerts

Analytics can identify:

```text
Students below threshold
Classes with low attendance
Attendance anomalies
Repeated absences
```

These are analytical insights, not replacements for attendance records.

---

# 26. Admission Analytics

Reports:

```text
Applications
Approved
Rejected
Pending
Conversion Rate
Admissions by Source
Admissions by Class
Admissions by Branch
```

---

# 27. Admission Funnel

Example:

```text
Applications
     1,200
       ↓
Shortlisted
       900
       ↓
Approved
       720
       ↓
Confirmed
       650
```

---

# 28. Admission Conversion

Example:

```text
Conversion Rate =
Confirmed Admissions / Applications × 100
```

The definition should remain consistent throughout the application.

---

# 29. Admission Trend

Example:

```text
June      120
July      180
August    240
```

---

# 30. Finance Dashboard

Finance users should see:

```text
Total Fees
Collected
Outstanding
Overdue
Refunds
Discounts
Waivers
Payment Success Rate
```

---

# 31. Collection KPI

Example:

```text
Total Due:
₹25,00,000

Collected:
₹20,80,000

Outstanding:
₹4,20,000

Collection Rate:
83.2%
```

---

# 32. Collection Rate

Conceptually:

```text
Collection Rate =
Collected Amount / Applicable Due Amount × 100
```

The exact treatment of discounts, waivers, cancellations and refunds must follow the finance module.

---

# 33. Outstanding Report

Example:

```text
STUDENT        DUE       PAID      OUTSTANDING

Rahul          ₹50,000   ₹40,000   ₹10,000
Aman           ₹45,000   ₹30,000   ₹15,000
Sara           ₹40,000   ₹40,000   ₹0
```

---

# 34. Overdue Report

Show:

```text
Student
Invoice/Fee
Due Date
Days Overdue
Outstanding
```

---

# 35. Payment Analytics

Reports may include:

```text
Payment Count
Payment Amount
Successful Payments
Failed Payments
Refunds
Payment Methods
Daily Collection
Monthly Collection
```

---

# 36. Payment Method Report

Example:

```text
UPI:
₹8,20,000

Card:
₹4,10,000

Cash:
₹2,80,000

Bank Transfer:
₹5,00,000
```

Only payment methods actually supported by the finance architecture should be shown.

---

# 37. Daily Collection

Example:

```text
DATE          COLLECTION

01 Aug        ₹52,000
02 Aug        ₹64,000
03 Aug        ₹48,000
```

---

# 38. Monthly Collection

Example:

```text
April         ₹12.4L
May           ₹14.1L
June          ₹15.8L
July          ₹17.2L
August        ₹18.4L
```

---

# 39. Refund Analytics

Report:

```text
Refund Requests
Approved Refunds
Rejected Refunds
Processed Refunds
Refund Amount
```

---

# 40. Discount Analytics

Report:

```text
Total Discounts
Discount Count
Discount by Class
Discount by Branch
Discount by Fee Type
```

Access should be restricted because discount data may be financially sensitive.

---

# 41. Teacher Analytics

Possible metrics:

```text
Classes Assigned
Students
Attendance Completion
Homework Published
Homework Graded
Exam Activities
Average Class Performance
```

Do not interpret these metrics as employee-performance scores unless explicitly designed as such.

---

# 42. Teacher Workload

Example:

```text
Teacher:
Mr. Khan

Classes:
5

Students:
180

Subjects:
Mathematics

Homework:
24

Exams:
4
```

---

# 43. Homework Analytics

Reports:

```text
Homework Published
Submission Rate
Pending Submissions
Late Submissions
Average Score
```

---

# 44. Submission Rate

Conceptually:

```text
Submission Rate =
Submitted / Expected Submissions × 100
```

The denominator must account for exemptions or withdrawn students according to the homework module.

---

# 45. Exam Analytics

Reports:

```text
Exam Participation
Average Marks
Pass Rate
Subject Performance
Highest Marks
Lowest Marks
Distribution
```

---

# 46. Result Analytics

Reports:

```text
Published Results
Average Score
Pass Rate
Top Performers
Students At Risk
Subject Trends
```

"At Risk" must be defined by explicit rules rather than arbitrary assumptions.

---

# 47. Student Risk Indicators

Potential analytical indicators:

```text
Low Attendance
Declining Marks
Missing Homework
Outstanding Fees
```

These should be shown as indicators, not definitive judgments about a student.

---

# 48. Student Overview Report

Example:

```text
STUDENT OVERVIEW

Name:
Rahul Kumar

Class:
10-A

Attendance:
82%

Academic Average:
76%

Homework Completion:
91%

Outstanding:
₹5,000
```

Only authorized users should see financial information.

---

# 49. Parent Reporting

Parents should see reports only for their linked children.

Example:

```text
MY CHILD

Attendance:
92%

Homework:
88%

Average:
81%

Fees:
Paid
```

---

# 50. Branch Analytics

For multi-branch tenants:

```text
Branch
Students
Admissions
Attendance
Collections
Outstanding
Academic Performance
```

---

# 51. Branch Comparison

Example:

```text
BRANCH          STUDENTS   ATTENDANCE   COLLECTION

Main            1,200      89%          ₹12.4L
North             800      86%          ₹8.1L
South             450      91%          ₹4.8L
```

---

# 52. Institution Overview

Admin-level overview:

```text
Total Students
Total Teachers
Total Classes
Admissions
Attendance
Collection
Outstanding
Academic Average
```

---

# 53. Charts

Supported chart types may include:

```text
Line
Bar
Stacked Bar
Area
Donut
Pie
Table
```

Use the simplest visualization appropriate for the metric.

---

# 54. Chart Guidelines

### Trends

Use:

```text
Line Chart
```

### Category Comparison

Use:

```text
Bar Chart
```

### Composition

Use:

```text
Donut/Pie
```

when the number of categories is small.

### Exact Values

Use:

```text
Table
```

---

# 55. Avoid Misleading Charts

Do not use charts that exaggerate differences through inappropriate axis manipulation.

Financial and academic data must remain visually honest.

---

# 56. Report Tables

Tables should support:

```text
Sorting
Filtering
Pagination
Column Selection
Export
```

---

# 57. Report Columns

Columns should be role/context appropriate.

Example:

```text
Student
Class
Attendance
Average
Outstanding
```

A parent should not see another student's information.

---

# 58. Drill Down

Analytics should allow users to move:

```text
Institution
   ↓
Branch
   ↓
Class
   ↓
Student
```

where the user's permissions allow it.

---

# 59. Example Drill Down

```text
Attendance:
87%

Click
 ↓
Branch:
86%

Click
 ↓
Class 10-A:
81%

Click
 ↓
Student List
```

---

# 60. Report Filters

Common filters:

```text
Date
Academic Year
Branch
Class
Section
Batch
Course
Subject
Teacher
Student
Status
```

---

# 61. Filter Persistence

Users may optionally retain commonly used filters during a session.

Do not allow filter state to bypass authorization.

---

# 62. Saved Reports

Authorized users may save report configurations.

Example:

```text
My Monthly Collection
```

with:

```text
Date:
Current Month

Branch:
All

Payment Status:
Successful
```

---

# 63. Saved Report Permissions

Saved reports may be:

```text
PRIVATE
TEAM
TENANT
```

depending on the authorization model.

---

# 64. Custom Reports

If custom report building is implemented, users may select:

```text
Dataset
Columns
Filters
Grouping
Sorting
Metrics
Chart Type
```

---

# 65. Custom Report Safety

Custom reporting must not expose fields outside the user's authorization scope.

The backend must enforce the data model.

---

# 66. Export Formats

Reports may support:

```text
CSV
XLSX
PDF
```

where implemented.

---

# 67. Export Rules

Exports must respect:

```text
Current Filters
Current Permissions
Tenant Scope
Branch Scope
Selected Columns
```

---

# 68. Export Audit

Exporting sensitive reports should create an audit event.

Example:

```text
report.exported
```

---

# 69. Large Exports

Large reports should be processed asynchronously.

```text
Generate Export
      ↓
Background Job
      ↓
Processing
      ↓
Ready
      ↓
Download
```

---

# 70. Export Progress

Example:

```text
Generating Report

██████████████░░ 82%

8,200 / 10,000 rows
```

---

# 71. Scheduled Reports

Authorized users may schedule reports.

Example:

```text
Every Monday
08:00 AM
Attendance Report
```

---

# 72. Scheduled Report Delivery

Reports may be delivered through configured channels such as:

```text
Email
In-App
```

Additional channels depend on implementation and policy.

---

# 73. Scheduled Report Permissions

Only authorized users should create scheduled reports.

The schedule must retain the creator's authorized data scope or use a clearly defined service account/scope model.

---

# 74. Report Recipients

Recipients must be validated.

A report containing financial data must not accidentally be sent to a user without financial permissions.

---

# 75. Report Snapshot

For scheduled reports, the generated report should represent the data available at generation time.

---

# 76. Report Metadata

Each generated report should identify:

```text
Report Name
Generated At
Generated By
Date Range
Filters
Tenant
```

---

# 77. Data Freshness

Reports should indicate freshness where relevant.

Example:

```text
Last Updated:
11:32 AM
```

For cached analytics:

```text
Data updated 15 minutes ago
```

Do not imply real-time data when the report is cached.

---

# 78. Real-Time vs Cached

Use:

```text
Transactional queries
```

for smaller/current reports where practical.

Use:

```text
Aggregations / cached metrics
```

for expensive analytics at scale.

---

# 79. Analytics Aggregation

At scale:

```text
Raw Data
   ↓
Aggregation
   ↓
Metric Store / Cache
   ↓
Dashboard
```

The implementation should prevent expensive dashboard queries from repeatedly scanning massive transactional datasets.

---

# 80. Metric Consistency

A KPI shown on:

```text
Dashboard
```

must use the same definition when shown in:

```text
Report
```

Avoid:

```text
Dashboard Attendance = 87%
Report Attendance = 84%
```

unless the filters/definitions genuinely differ and are clearly displayed.

---

# 81. Report Definitions

Each standard report should define:

```text
Purpose
Data Source
Metrics
Filters
Permissions
Date Semantics
Calculation Rules
```

---

# 82. Report Registry

Conceptually:

```text
ReportDefinition
 ├── id
 ├── name
 ├── category
 ├── description
 ├── permissions
 ├── supported_filters
 └── metric_definitions
```

---

# 83. Metric Registry

Conceptually:

```text
MetricDefinition
 ├── name
 ├── description
 ├── calculation
 ├── data_source
 └── access_scope
```

This helps keep metrics consistent.

---

# 84. Reporting API

Possible endpoints:

```text
GET /reports
GET /reports/{report}
POST /reports/{report}/run
```

---

# 85. Dashboard API

Possible:

```text
GET /dashboard
GET /dashboard/metrics
GET /dashboard/activity
```

Exact routes should follow the project's API conventions.

---

# 86. Analytics API

Example:

```text
GET /analytics/attendance
GET /analytics/academic
GET /analytics/finance
GET /analytics/admissions
```

---

# 87. Report Query

Conceptually:

```text
{
  report: "attendance-summary",
  date_from: "...",
  date_to: "...",
  branch_id: "...",
  class_id: "..."
}
```

Backend must validate every filter.

---

# 88. Report Response

Conceptually:

```text
{
  "summary": {
    "attendance_rate": 87.4
  },
  "rows": [],
  "generated_at": "..."
}
```

---

# 89. Error Handling

Examples:

```text
Invalid Date Range
Unauthorized Report
Invalid Filter
Report Generation Failed
Export Failed
```

Messages should be user-friendly.

---

# 90. Empty Reports

Example:

```text
No data available for the selected filters.

Try selecting a different date range or class.
```

---

# 91. Loading Experience

Dashboard cards and charts should support independent loading states where possible.

Avoid blocking the entire dashboard because one analytics query is slow.

---

# 92. Failure Isolation

If:

```text
Finance Analytics
```

fails, the dashboard should ideally still display:

```text
Student Count
Attendance
Academic Metrics
```

where possible.

---

# 93. Mobile Dashboard

Mobile-first requirements:

```text
Stack KPI cards
Scrollable charts
Responsive tables
Compact filters
Bottom sheets for filter controls
```

---

# 94. Desktop Dashboard

Desktop can use:

```text
Multi-column KPI Grid
Side-by-side Charts
Large Tables
Advanced Filters
```

---

# 95. Accessibility

Reports should support:

```text
Readable contrast
Keyboard navigation
Accessible labels
Screen-reader-friendly tables
Meaningful chart descriptions
```

Do not rely solely on color to communicate status.

---

# 96. Security

Reporting must enforce:

```text
Authentication
RBAC
Tenant Isolation
Branch Scope
Student Scope
Financial Permissions
```

---

# 97. Financial Data Security

Financial reports require stronger permissions.

Examples:

```text
Revenue
Outstanding Fees
Refunds
Payment Details
Discounts
```

should not automatically be visible to teachers or students.

---

# 98. Student Data Security

Student-level analytics must respect the user's authorized student scope.

---

# 99. Parent Scope

Parents can only access:

```text
Their linked children
```

---

# 100. Teacher Scope

Teachers may access:

```text
Assigned Classes
Assigned Students
Assigned Subjects
```

according to the project's RBAC/data-scope rules.

---

# 101. Admin Scope

Admins may have:

```text
Tenant-wide
Branch-wide
```

access depending on their role.

---

# 102. Audit Integration

Important reporting actions should integrate with the audit system.

Examples:

```text
report.exported
report.schedule.created
report.schedule.updated
report.viewed
```

The exact audit level should follow the audit policy.

---

# 103. Performance Requirements

Reports must avoid:

```text
N+1 queries
Unbounded queries
Full-table scans for every dashboard request
Large synchronous exports
```

where the architecture can reasonably prevent them.

---

# 104. Pagination

Large reports must use pagination.

Example:

```text
Page 1:
1–50

Page 2:
51–100
```

---

# 105. Aggregation Performance

Large analytical datasets should use:

```text
Indexed queries
Pre-aggregation
Caching
Materialized summaries
Background jobs
```

where appropriate.

---

# 106. Caching

Dashboard metrics may be cached when:

```text
The metric is expensive
Real-time accuracy is not required
```

Cache invalidation/freshness must be explicit.

---

# 107. Cache Isolation

Cached analytics must never leak across tenants.

Cache keys must include appropriate tenant/scope dimensions.

---

# 108. Testing

Test:

```text
KPI Calculations
Date Filters
Academic Year
Branch Filters
Role Permissions
Tenant Isolation
Pagination
Exports
Charts
Scheduled Reports
Caching
Empty States
Large Datasets
```

---

# 109. KPI Calculation Test

For:

```text
Present = 80
Applicable = 100
```

Expected:

```text
Attendance = 80%
```

The test should use the attendance module's actual applicability rules.

---

# 110. Finance Calculation Test

Verify:

```text
Due
Collected
Outstanding
Refunds
Discounts
```

produce the expected values according to the finance rules.

---

# 111. Authorization Test

Teacher attempts:

```text
Finance Report
```

Expected:

```text
ACCESS DENIED
```

unless explicitly authorized.

---

# 112. Parent Test

Parent requests:

```text
Student Analytics
```

Expected:

```text
Only linked child/children
```

---

# 113. Tenant Test

Tenant A requests analytics.

Expected:

```text
Only Tenant A data.
```

---

# 114. Export Test

Apply:

```text
Branch A
August
```

Export.

Expected:

```text
Only Branch A + August records.
```

---

# 115. Large Dataset Test

Generate a report with:

```text
100,000+
```

records.

Verify:

```text
Pagination
Performance
Export Processing
Memory Usage
```

---

# 116. Final Reporting Flow

```text
AUTHORITATIVE ERP DATA
          ↓
REPORTING SERVICE
          ↓
FILTER + AUTHORIZATION
          ↓
METRIC CALCULATION
          ↓
AGGREGATION
          ↓
REPORT / DASHBOARD
          ↓
DRILL DOWN / EXPORT
          ↓
AUDIT
```

---

# 117. Final Principle

> **Reporting is a read-only analytical layer over authoritative ERP data. Every metric must have a consistent definition, every report must enforce tenant and role scope, financial/student data must remain protected, and expensive analytics or exports should be handled in a scalable way.**

---

# 118. Next Document

The next specification is:

```text
24-SEARCH-FILTERING-AND-DATA-EXPORT.md
```

It will define:

```text
Global Search
Module Search
Advanced Filters
Sorting
Pagination
Saved Filters
Search Suggestions
Search Indexing
Student Search
Parent Search
Teacher Search
Fee Search
Payment Search
Audit Search
Export Engine
CSV
XLSX
PDF
Bulk Export
Import/Export Security
```

---

# END OF DOCUMENT
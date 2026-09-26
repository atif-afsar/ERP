# RESULTS, GRADING & REPORT CARDS
# School + Coaching Centre ERP SaaS

**Document:** `52-RESULTS-GRADING-REPORT-CARDS.md`  
**Version:** 1.0  
**Status:** Canonical Results & Report Card Specification  
**Previous Document:** `51-EXAMINATION-MANAGEMENT.md`  
**Next Document:** `53-FEES-BILLING-PAYMENTS.md`

---

# 1. Purpose

This module converts validated examination marks into structured academic results.

It manages:

```text
Result Processing
Grade Calculation
Percentage
Grade Points
Pass / Fail
Subject Results
Overall Results
Ranking
Report Cards
Mark Sheets
Result Publishing
Result Revision
Result Histo
Performance Summaries
```

The module must support both:

```text
School
Coaching Centre
```

while allowing each institution to configure its own grading and result rules.

---

# 2. Core Principle

The result is a **derived academic record**.

The source of truth is:

```text
Exam
 ↓
Exam Session
 ↓
Student
 ↓
Marks / Attendance / Status
 ↓
Result Calculation
 ↓
Published Result
```

Do not manually duplicate calculated values when they can be deterministically derived from the underlying marks and configured rules.

---

# 3. Result Context

Every result must belong to an identifiable academic context.

Conceptually:

```text
Result
 ↓
Exam
 ↓
Academic Year
 ↓
Branch
 ↓
Program / Course
 ↓
Class / Batch
 ↓
Student Enrollment
```

Historical results must retain their original context.

---

# 4. Result Entity

Conceptually:

```text
Result
------
id
examId
studentId
enrollmentId
totalMarks
maximumMarks
percentage
grade
gradePoint
passStatus
rank
status
version
publishedAt
createdAt
updatedAt
```

The exact schema must follow the canonical database architecture.

---

# 5. Result Status

Recommended lifecycle:

```text
PROCESSING
 ↓
READY
 ↓
APPROVED
 ↓
PUBLISHED
 ↓
REVISED
```

A result should never become visible to students merely because marks have been entered.

---

# 6. Result Processing

Processing converts marks into calculated outcomes.

Example:

```text
Mathematics → 84 / 100
Physics     → 76 / 100
Chemistry   → 91 / 100

Total       → 251 / 300
Percentage  → 83.67%
Grade       → A
```

---

# 7. Subject Result

Each subject should have an individual result.

Conceptually:

```text
Subject Result
--------------
studentId
examSessionId
subjectId
marksObtained
maximumMarks
percentage
grade
gradePoint
passStatus
```

---

# 8. Overall Result

The overall result aggregates eligible subject results.

Example:

```text
Mathematics → 84
Physics     → 76
Chemistry   → 91

Overall:
251 / 300
83.67%
Grade A
PASS
```

---

# 9. Maximum Marks

Maximum marks must come from the configured exam/session.

Do not assume every subject is out of 100.

Example:

```text
Mathematics → 100
Practical   → 50
Internal    → 20
```

---

# 10. Marks Obtained

Marks obtained must respect the examination configuration.

Invalid values must be rejected before result processing.

```text
marks < 0
```

or:

```text
marks > maximumMarks
```

should not produce a valid result.

---

# 11. Percentage

Basic percentage:

```text
Percentage =
Marks Obtained / Maximum Marks × 100
```

Example:

```text
251 / 300 × 100
= 83.67%
```

The institution may use a configured precision.

---

# 12. Rounding

Rounding must be deterministic.

Example:

```text
83.666666...
→ 83.67%
```

Do not use inconsistent rounding between:

```text
Dashboard
Report Card
API
Export
```

---

# 13. Grade System

The institution may configure grade bands.

Example:

```text
90–100 → A+
80–89  → A
70–79  → B+
60–69  → B
50–59  → C
40–49  → D
<40    → F
```

These are examples only.

They must not be globally hard-coded.

---

# 14. Grade Configuration

Conceptually:

```text
Grade Scale
-----------
Name
Minimum Percentage
Maximum Percentage
Grade
Grade Point
Pass / Fail
```

Example:

```text
90–100 → A+ → 10
80–89  → A  → 9
70–79  → B+ → 8
```

---

# 15. Grade Point

If enabled:

```text
Grade
 ↓
Grade Point
```

Example:

```text
A+ → 10
A  → 9
B+ → 8
```

The actual mapping must come from the institution's grading configuration.

---

# 16. GPA

If GPA is supported:

```text
GPA =
Σ(Grade Point × Credit)
÷
Σ(Credits)
```

Only use credits when the academic model supports them.

Do not introduce GPA into institutions that use simple percentage grading.

---

# 17. CGPA

For multi-term academic systems:

```text
Term Results
 ↓
Cumulative Calculation
 ↓
CGPA
```

The exact formula must follow configured academic rules.

---

# 18. Pass / Fail

Passing rules may be:

```text
Overall Percentage
Subject Minimum
Grade Threshold
Combined Conditions
```

Example:

```text
Overall ≥ 40%
AND
Every Required Subject ≥ 33%
```

---

# 19. Subject Failure

A student may pass overall but fail a required subject depending on configured rules.

Example:

```text
Overall → 55%
Physics → 28%
```

If Physics requires 33%, the student may be:

```text
FAIL
```

---

# 20. Grace Marks

If supported, grace marks must be explicitly configured.

Example:

```text
Required = 33
Obtained = 31
Grace = 2
Final = 33
```

Do not automatically apply grace marks.

---

# 21. Grace Mark Audit

If grace marks are applied, record:

```text
Original Marks
Grace Marks
Final Marks
Rule Used
Approved By
Timestamp
```

---

# 22. Moderation

If marks moderation is supported:

```text
Original Marks
 ↓
Moderation Rule
 ↓
Adjusted Marks
 ↓
Result Calculation
```

Moderation must be auditable.

---

# 23. Weighted Results

Some institutions may weight components.

Example:

```text
Theory       → 70%
Practical    → 20%
Internal     → 10%
```

The result engine must apply configured weights.

---

# 24. Component Result

Conceptually:

```text
Assessment
 ↓
Component
 ↓
Weight
 ↓
Weighted Score
```

This allows complex academic structures without hard-coding them into the UI.

---

# 25. Internal + External Marks

Example:

```text
Theory:
72 / 80

Internal:
18 / 20

Total:
90 / 100
```

The result system should support this when configured.

---

# 26. Practical Marks

Practical marks may be separate:

```text
Theory
Practical
Viva
Project
Internal
```

The system should preserve the component structure where required.

---

# 27. Absent Result

An absent student should be represented according to the configured exam policy.

Possible states:

```text
ABSENT
EXEMPTED
WITHHELD
```

Do not automatically convert every absence to zero.

---

# 28. Withheld Result

A result may be withheld because of:

```text
Pending Verification
Administrative Review
Academic Investigation
Incomplete Marks
```

A withheld result must not appear as a normal pass/fail result.

---

# 29. Incomplete Result

If required marks are missing:

```text
Result
→ INCOMPLETE
```

rather than calculating a misleading result.

---

# 30. Result Calculation Engine

Conceptually:

```text
Input
 ↓
Validate Marks
 ↓
Apply Components
 ↓
Apply Weights
 ↓
Calculate Total
 ↓
Calculate Percentage
 ↓
Apply Grade Scale
 ↓
Apply Passing Rules
 ↓
Calculate GPA if enabled
 ↓
Calculate Rank if enabled
 ↓
Generate Result
```

---

# 31. Deterministic Calculation

Given identical:

```text
Marks
Exam Configuration
Grading Configuration
```

the result must always be identical.

---

# 32. Calculation Snapshot

When results are published, preserve the configuration used to generate them where required.

This protects historical results if grading rules later change.

Example:

```text
Published Result
 ↓
Uses Grade Scale Version 2
```

Changing the current grade scale must not silently rewrite historical results.

---

# 33. Result Versioning

A published result may have:

```text
Version 1
Version 2
Version 3
```

Example:

```text
Version 1 → 78%
Version 2 → 81%
```

The reason for revision must be auditable.

---

# 34. Result Revision

Workflow:

```text
Published
 ↓
Authorized Revision
 ↓
Update Source Marks / Rules
 ↓
Recalculate
 ↓
Review
 ↓
Approve
 ↓
Publish New Version
```

---

# 35. Published Result Protection

Normal users must not edit published results directly.

Published results require an authorized revision workflow.

---

# 36. Report Card

A report card presents the student's result in a human-readable format.

Possible sections:

```text
Student Information
Academic Information
Exam Information
Subject Results
Overall Result
Grade
Attendance
Remarks
Rank if enabled
Institution Information
```

---

# 37. Student Information

Example:

```text
Student Name
Admission Number
Class
Section
Roll Number
Academic Year
```

Only fields applicable to the institution should appear.

---

# 38. Subject Result Table

Example:

```text
Subject      Max Marks   Obtained   Grade
Mathematics  100         84         A
Physics      100         76         B+
Chemistry    100         91         A+
```

---

# 39. Report Card Summary

Example:

```text
Total: 251 / 300
Percentage: 83.67%
Grade: A
Result: PASS
```

---

# 40. Attendance on Report Card

If configured:

```text
Attendance: 92%
```

may appear alongside academic results.

Attendance data must come from the Attendance module.

---

# 41. Teacher Remarks

If supported:

```text
Academic performance is strong.
```

Remarks may be entered by authorized staff.

---

# 42. Principal / Administrator Remarks

If configured, authorized administrators may add final remarks.

---

# 43. Report Card Templates

Institutions may have different layouts.

Example:

```text
School Template
Coaching Template
Branch Template
Program Template
```

Template configuration must not alter the underlying result calculation.

---

# 44. Report Card Branding

Possible configurable elements:

```text
Institution Logo
Institution Name
Address
Contact Details
Academic Year
Footer
Signature Area
```

---

# 45. Signature Areas

Optional:

```text
Class Teacher
Principal
Director
Authorized Signatory
```

Do not create fake digital signatures.

---

# 46. Mark Sheet

A mark sheet may provide a more detailed academic breakdown than a report card.

Example:

```text
Subject
Theory
Practical
Internal
Total
Grade
```

---

# 47. Result Certificate

If supported, certificates should be generated from verified published results.

Never generate official certificates from draft results.

---

# 48. Result Publishing

Publishing workflow:

```text
Marks Complete
 ↓
Result Calculated
 ↓
Validation
 ↓
Approval
 ↓
Publish
 ↓
Student / Guardian Visibility
```

---

# 49. Publishing Rules

Before publishing verify:

```text
All Required Marks Complete
Calculation Successful
Grading Configuration Valid
Passing Rules Valid
Required Approval Complete
```

---

# 50. Student Result Visibility

Students should see only:

```text
Their Own Results
```

and only after publication.

---

# 51. Guardian Result Visibility

Guardians should see results for children they are authorized to access.

---

# 52. Teacher Result Visibility

Teachers may see:

```text
Assigned Students
Assigned Classes
Assigned Subjects
```

depending on their permissions.

---

# 53. Administrator Result Visibility

Administrators may access broader result data according to role and branch scope.

---

# 54. Result Search

Search by:

```text
Student
Admission Number
Exam
Academic Year
Class
Batch
Subject
Result Status
```

---

# 55. Result Filters

Useful filters:

```text
Pass
Fail
Incomplete
Absent
Withheld
Published
Unpublished
```

---

# 56. Result Dashboard

Possible administrator metrics:

```text
Students Appeared
Students Passed
Students Failed
Pass Percentage
Average Percentage
Highest Percentage
Lowest Percentage
Average Subject Score
```

---

# 57. Class Performance

Example:

```text
Class 10A

Students: 40
Passed: 36
Failed: 4
Pass Rate: 90%
Average: 74.2%
```

---

# 58. Subject Performance

Example:

```text
Physics

Average: 68.4%
Highest: 96%
Lowest: 31%
Pass Rate: 84%
```

---

# 59. Batch Performance

For coaching:

```text
JEE Batch A

Students: 50
Average Score: 71%
Top Score: 94%
```

---

# 60. Performance Comparison

Where enabled, compare:

```text
Exam 1
Exam 2
Exam 3
```

for the same academic context.

Historical data must remain correctly scoped.

---

# 61. Student Performance Trend

Example:

```text
Test 1 → 62%
Test 2 → 68%
Test 3 → 74%
Test 4 → 81%
```

This helps identify academic progress.

---

# 62. Rank

Ranking should only exist when explicitly enabled.

Possible ranking scopes:

```text
Class
Section
Batch
Program
Branch
Institution
```

The scope must be configured.

---

# 63. Rank Tie Handling

If two students have identical qualifying scores, the system must follow the configured tie-breaking rule.

Never invent a ranking rule in the UI.

---

# 64. Rank Privacy

If ranking is disabled:

```text
Do not show rank
Do not expose rank through API
Do not include rank in exports
```

unless another authorized workflow requires it.

---

# 65. Result Export

Authorized users may export:

```text
Student
Admission Number
Subject Marks
Total
Percentage
Grade
Pass Status
Rank if enabled
```

Exports must follow permissions.

---

# 66. Bulk Result Export

Administrators may export results for:

```text
Class
Section
Batch
Exam
Academic Year
```

according to their scope.

---

# 67. PDF Report Cards

If PDF generation is implemented:

```text
Published Result
 ↓
Report Card Template
 ↓
PDF
```

The generated document must reflect the exact published result version.

---

# 68. Report Card Regeneration

Regenerating a report card must not recalculate academic results unexpectedly.

It should render the stored published result/version.

---

# 69. Historical Report Cards

Old report cards must remain associated with the result version from which they were generated.

---

# 70. Result Correction

If marks change:

```text
Original Result
 ↓
Correction
 ↓
Recalculate
 ↓
New Result Version
```

Do not simply overwrite the old published result.

---

# 71. Result Audit Trail

Important events:

```text
Result Calculated
Result Approved
Result Published
Result Revised
Result Unpublished if supported
Report Card Generated
Marks Changed
Grade Changed
Rank Changed
```

---

# 72. Calculation Audit

For important revisions, preserve enough information to determine:

```text
What data was used
Which rules were used
Who processed it
When it was processed
Which version was published
```

---

# 73. Academic Year Isolation

Results must remain associated with their original academic year.

Promotion must not move historical results into the new year.

---

# 74. Enrollment Integrity

A result must reference the correct enrollment context.

Example:

```text
2025–26 Class 9 Result
```

must remain connected to the student's Class 9 academic context even after promotion to Class 10.

---

# 75. Transfer Handling

If a student transfers:

```text
Historical Result
→ Remains Historical
```

Do not rewrite old branch/class information simply because the student moved.

---

# 76. Withdrawal Handling

Withdrawal does not delete historical results.

---

# 77. Tenant Isolation

Every result query must enforce tenant boundaries.

Never allow one tenant to access another tenant's:

```text
Results
Marks
Report Cards
Student Performance
```

---

# 78. Branch Isolation

Branch-restricted users should only see results within their authorized branches.

---

# 79. Permission Model

Potential permissions:

```text
result.read
result.process
result.approve
result.publish
result.revise
result.recheck
result.export
report_card.generate
report_card.view
```

Use the centralized permission system.

---

# 80. Permission-Aware UI

Example:

```text
No result.process
→ Hide Process Results

No result.approve
→ Hide Approve

No result.publish
→ Hide Publish

No result.revise
→ Hide Revise

No result.export
→ Hide Export
```

Backend authorization remains mandatory.

---

# 81. Result Privacy

Never expose another student's results through:

```text
Client-side filtering
Guessable IDs
Unauthorized API requests
Exports
Search
```

---

# 82. Concurrency

Result processing must safely handle multiple users attempting operations simultaneously.

Example:

```text
Teacher enters marks
Administrator processes result
```

The system should prevent inconsistent calculation states.

---

# 83. Transaction Safety

Operations such as:

```text
Result Processing
Result Approval
Result Publishing
Result Revision
Bulk Result Calculation
```

must maintain consistent state.

---

# 84. Performance

Large examination results should support:

```text
Pagination
Indexed Queries
Bulk Processing
Background Jobs
Efficient Aggregations
Cached Derived Metrics where appropriate
```

without compromising correctness.

---

# 85. Background Result Processing

For large exams:

```text
Start Processing
 ↓
PROCESSING
 ↓
Validation
 ↓
Calculation
 ↓
READY
```

The UI should communicate progress/status where practical.

---

# 86. Mobile Results

Students and guardians should be able to comfortably view:

```text
Exam
Subject Marks
Grades
Percentage
Result Status
Report Card
```

on mobile devices.

---

# 87. Responsive Report Card

The report-card web view should remain readable on small screens.

PDF output can use a print-optimized layout.

---

# 88. Empty States

Examples:

```text
No published results are available.
```

```text
Result processing has not started.
```

```text
No report card is available for this exam.
```

---

# 89. Loading States

Provide loading states for:

```text
Result Dashboard
Student Result
Performance Analytics
Report Card
PDF Generation
```

---

# 90. Error Handling

Use actionable messages.

Example:

```text
Results cannot be published because 3 required subject marks are missing.
```

instead of:

```text
CalculationException.
```

---

# 91. Result Engine Safety

The result engine must never silently:

```text
Change Marks
Change Maximum Marks
Change Grade Rules
Change Pass Rules
```

during calculation.

Every transformation must come from explicit configuration.

---

# 92. Configuration Changes

If grading rules change after results were published:

```text
Existing Published Results
→ Remain unchanged
```

unless an authorized revision explicitly recalculates them.

---

# 93. Result Integrity

The system must guarantee:

```text
Published Result
=
Published Marks
+
Published Calculation Rules
```

for the corresponding result version.

---

# 94. Report Card Integrity

A report card must represent the same result version that the user selected.

Do not mix:

```text
Old Marks
+
New Percentage
+
Old Grade
```

---

# 95. Result Module Checklist

```text
☐ Result processing
☐ Subject results
☐ Overall results
☐ Total marks
☐ Maximum marks
☐ Percentage
☐ Rounding rules
☐ Grade scales
☐ Grade points
☐ GPA
☐ CGPA if enabled
☐ Pass/fail rules
☐ Subject minimum rules
☐ Grace marks if enabled
☐ Moderation if enabled
☐ Weighted components
☐ Theory/practical/internal marks
☐ Absent handling
☐ Exempted handling
☐ Withheld results
☐ Incomplete results
☐ Result calculation engine
☐ Calculation snapshot/version
☐ Result approval
☐ Result publishing
☐ Result revision
☐ Result versioning
☐ Report cards
☐ Mark sheets
☐ Certificates if enabled
☐ Result dashboards
☐ Student performance
☐ Class performance
☐ Subject performance
☐ Batch performance
☐ Rank if enabled
☐ Result export
☐ PDF generation
☐ Historical result preservation
☐ Tenant isolation
☐ Branch isolation
☐ Academic-year isolation
☐ Enrollment integrity
☐ Permission enforcement
☐ Audit trail
☐ Concurrency protection
☐ Transaction safety
☐ Performance optimization
☐ Mobile-responsive UI
```

---

# 96. Definition of Done

The Results module is complete when the system can:

```text
Receive Validated Marks
        ↓
Apply Configured Calculation Rules
        ↓
Generate Subject Results
        ↓
Generate Overall Results
        ↓
Calculate Grades / GPA if Enabled
        ↓
Determine Pass / Fail
        ↓
Review
        ↓
Approve
        ↓
Publish
        ↓
Generate Report Card
        ↓
Preserve Historical Version
        ↓
Handle Authorized Revisions
```

while guaranteeing:

```text
Calculation Accuracy
Historical Integrity
Result Privacy
Tenant Isolation
Branch Isolation
Academic Context Integrity
Permission Enforcement
Auditability
```

---

# 97. Final Principle

> **A published result is an auditable academic record, not a disposable calculation. Results must be generated deterministically from validated marks and explicit grading rules, preserved by version, and protected from silent changes. Report cards must render the exact published result version, while revisions must create an auditable history rather than overwrite the past.**

---

# 98. Next Document

```text
53-FEES-BILLING-PAYMENTS.md
```

The next module will define:

```text
Fee Structures
Fee Heads
Student Fees
Invoices
Installments
Discounts
Scholarships
Late Fees
Payments
Receipts
Refunds
Dues
Payment Status
Fee Collection
Online Payments
Cash / Bank Payments
Financial Reports
```

---

# END OF DOCUMENT
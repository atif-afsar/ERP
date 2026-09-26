# SEARCH, FILTERING & DATA EXPORT
# School + Coaching Centre ERP SaaS

**Document:** `24-SEARCH-FILTERING-AND-DATA-EXPORT.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `23-REPORTING-AND-ANALYTICS.md`  
**Next Document:** `25-IMPORT-AND-BULK-OPERATIONS.md`

---

# 1. Purpose

This document defines the ERP's search, filtering, sorting, pagination, export, and data-discovery architecture.

The goal is to allow users to quickly find and work with ERP records without exposing data outside their authorized scope.

The system must support:

```text
Global Search
Module Search
Advanced Filters
Sorting
Pagination
Saved Filters
Search Suggestions
Bulk Selection
Data Export
CSV
XLSX
PDF
```

---

# 2. Core Principle

Search and export are **read/access layers**.

They must never bypass:

```text
Authentication
Authorization
RBAC
Tenant Isolation
Branch Scope
Student Scope
```

The rule is:

```text
User Request
     ↓
Authentication
     ↓
Authorization
     ↓
Tenant Scope
     ↓
Search / Filter
     ↓
Results
```

---

# 3. Search Architecture

```text
                 USER
                   |
                   ↓
             SEARCH BAR
                   |
          +--------+--------+
          |                 |
     Global Search      Module Search
          |                 |
          +--------+--------+
                   |
                   ↓
            SEARCH SERVICE
                   |
        +----------+----------+
        |                     |
   Authorization          Search Index /
      Scope                Database Query
        |                     |
        +----------+----------+
                   |
                   ↓
               RESULTS
```

---

# 4. Global Search

Global search allows users to find records across modules from one interface.

Possible searchable entities:

```text
Students
Parents
Teachers
Classes
Courses
Batches
Admissions
Fees
Payments
Exams
Homework
Announcements
```

Only entities relevant to the user's role should appear.

---

# 5. Global Search UI

Example:

```text
┌─────────────────────────────────────────┐
│ 🔍 Search students, parents, payments… │
└─────────────────────────────────────────┘

Results

STUDENTS
Rahul Kumar
Class 10-A

PARENTS
Amit Kumar

PAYMENTS
REC-2026-00128
```

---

# 6. Search Suggestions

While typing:

```text
Rah
```

the system may suggest:

```text
Rahul Kumar
Raghav Sharma
Rahul Verma
```

Suggestions must respect the user's authorization scope.

---

# 7. Search Debouncing

Frontend search should avoid sending a request on every keystroke.

Conceptually:

```text
User Types
   ↓
Debounce
   ↓
Search Request
```

The exact debounce interval should be selected according to UX and performance testing.

---

# 8. Minimum Search Length

Short queries such as:

```text
a
```

may produce excessive results.

The system may require a minimum query length for global search, except where exact lookup is intentionally supported.

---

# 9. Search Normalization

Search should handle common differences such as:

```text
Uppercase / lowercase
Extra spaces
```

where appropriate.

Example:

```text
rahul kumar
```

should be able to find:

```text
Rahul Kumar
```

---

# 10. Search Ranking

Results should be ordered by relevance.

Possible ranking:

```text
Exact Match
↓
Prefix Match
↓
Strong Partial Match
↓
Other Relevant Match
```

The ranking implementation depends on the selected search technology.

---

# 11. Global Search Result Groups

Results can be grouped:

```text
Students
Parents
Teachers
Admissions
Finance
Academic
```

---

# 12. Search Result Navigation

Clicking a result should take the user directly to the authorized detail page.

Example:

```text
Search
 ↓
Rahul Kumar
 ↓
Student Profile
```

---

# 13. Search Security

Search must never reveal records merely because a user knows the person's name.

Example:

```text
Teacher A
```

must not be able to search and discover unrelated financial records unless authorized.

---

# 14. Module Search

Each major module should provide its own search.

Examples:

```text
Student Search
Parent Search
Teacher Search
Admission Search
Fee Search
Payment Search
Exam Search
Homework Search
Audit Search
```

---

# 15. Student Search

Searchable fields may include:

```text
Name
Student ID
Admission Number
Phone
Email
Class
Section
Batch
```

Only fields supported by the canonical student model should be included.

---

# 16. Student Search UI

```text
┌──────────────────────────────────┐
│ Search students...          🔍  │
├──────────────────────────────────┤
│ Class       [All ▼]              │
│ Section     [All ▼]              │
│ Status      [Active ▼]           │
│ Branch      [All ▼]              │
├──────────────────────────────────┤
│ Rahul Kumar   STU-1024           │
│ Class 10-A    Active              │
└──────────────────────────────────┘
```

---

# 17. Parent Search

Search:

```text
Name
Phone
Email
Linked Student
```

Parents should only appear within the user's authorized scope.

---

# 18. Teacher Search

Search:

```text
Name
Employee ID
Subject
Class
Branch
Status
```

---

# 19. Admission Search

Search:

```text
Application Number
Student Name
Applicant Name
Phone
Status
Class
Branch
```

---

# 20. Fee Search

Search:

```text
Fee ID
Student
Invoice/Reference
Fee Type
Status
```

---

# 21. Payment Search

Search:

```text
Payment ID
Transaction ID
Receipt Number
Student
Amount
Payment Method
Status
```

---

# 22. Audit Search

Audit search should support:

```text
Actor
Action
Category
Entity
Entity ID
Date
Status
```

and must follow the audit module's permission model.

---

# 23. Filter Architecture

Filters should be structured rather than encoded as arbitrary client-side logic.

```text
Filter
 ├── Field
 ├── Operator
 └── Value
```

Example:

```text
Field:
attendance

Operator:
less_than

Value:
75
```

---

# 24. Filter Operators

Depending on the field type:

### Text

```text
Contains
Starts With
Equals
```

### Number

```text
Equals
Greater Than
Less Than
Between
```

### Date

```text
Before
After
Between
Equals
```

### Boolean

```text
Yes
No
```

---

# 25. Multi-Filter Logic

Example:

```text
Class = 10-A
AND
Attendance < 75%
AND
Status = Active
```

The backend should construct this query securely.

---

# 26. OR Filters

Where supported:

```text
Class = 10-A
OR
Class = 10-B
```

The UI should make the logical relationship clear.

---

# 27. Advanced Filter Builder

Example:

```text
FILTERS

Class        [10-A ▼]
Status       [Active ▼]
Attendance   [Less than ▼] [75]

+ Add Filter

[Apply Filters]
```

---

# 28. Filter Validation

The backend must validate:

```text
Field
Operator
Value
Relationship
User Scope
```

Never trust arbitrary filter fields from the frontend.

---

# 29. Filterable Fields

Each module should define its supported filter fields.

Example:

```text
Student:
class
section
status
branch
batch
```

The API should reject unsupported fields.

---

# 30. Date Range Filters

Common presets:

```text
Today
Yesterday
Last 7 Days
Last 30 Days
This Month
Last Month
This Year
Custom
```

---

# 31. Date Boundary Handling

Date filtering must account for the relevant tenant/business timezone.

Example:

```text
Today
```

must mean the tenant/user's configured business date rather than blindly interpreting UTC boundaries.

---

# 32. Sorting

Tables should support sorting where appropriate.

Example:

```text
Name ↑
Attendance ↓
Amount ↓
Date ↓
```

---

# 33. Sort Validation

The backend must maintain an allowlist of sortable fields.

Never directly inject a client-provided sort field into a database query.

---

# 34. Default Sorting

Examples:

### Students

```text
Name ASC
```

### Payments

```text
Payment Date DESC
```

### Audit

```text
Created At DESC
```

### Admissions

```text
Created At DESC
```

The final choice should follow each module's UX requirements.

---

# 35. Pagination

Large result sets must be paginated.

Example:

```text
Showing 1–50 of 2,450
```

---

# 36. Page Size

Possible values:

```text
25
50
100
```

The backend should enforce a maximum page size.

---

# 37. Cursor Pagination

For large or continuously changing datasets, cursor-based pagination may be preferable.

Example:

```text
First Request
     ↓
Cursor
     ↓
Next Request
     ↓
Next Cursor
```

---

# 38. Offset Pagination

Offset pagination may be acceptable for smaller, stable datasets.

Example:

```text
?page=2&page_size=50
```

---

# 39. Pagination Consistency

The backend should use deterministic sorting so users do not see records duplicated or skipped unexpectedly between pages.

---

# 40. Saved Filters

Users may save frequently used filters.

Example:

```text
Low Attendance Students
```

Configuration:

```text
Attendance < 75%
Status = Active
```

---

# 41. Saved Filter Scope

Saved filters may be:

```text
PRIVATE
TEAM
TENANT
```

depending on the RBAC model.

---

# 42. Saved Filter Security

A saved filter must not permanently grant access to data.

When executed:

```text
Saved Filter
     ↓
Current User Permissions
     ↓
Authorized Results
```

---

# 43. Recent Searches

The UI may optionally display:

```text
Recent Searches
```

Example:

```text
Rahul Kumar
Class 10-A
REC-2026-00128
```

Sensitive searches should be handled according to privacy/security requirements.

---

# 44. Search History

If search history is stored, define:

```text
Retention
Visibility
Privacy
Deletion
```

Do not retain unnecessary search history indefinitely.

---

# 45. Export Architecture

Export should use the same authorization and filtering layer as normal reports.

```text
User Filters
     ↓
Authorization
     ↓
Query
     ↓
Export Formatter
     ↓
File
```

---

# 46. Export Formats

Supported formats may include:

```text
CSV
XLSX
PDF
```

---

# 47. CSV Export

Best for:

```text
Large Tables
Data Analysis
Import into Other Systems
Simple Data Exchange
```

---

# 48. XLSX Export

Best for:

```text
Business Reports
Formatting
Multiple Columns
Spreadsheet Analysis
```

---

# 49. PDF Export

Best for:

```text
Printable Reports
Official Statements
Readable Documents
```

---

# 50. Export Columns

Users may optionally choose columns.

Example:

```text
☑ Student Name
☑ Class
☑ Attendance
☐ Phone
☐ Email
```

Only permitted columns may be selected.

---

# 51. Export Filters

Export should respect the current filters.

Example:

```text
Class:
10-A

Status:
Active

Date:
August
```

The export must contain only matching records.

---

# 52. Export Authorization

The user must have permission for:

```text
View Data
+
Export Data
```

Having view permission alone does not necessarily imply export permission.

---

# 53. Export Permission

Possible permission:

```text
data.export
```

or module-specific permissions such as:

```text
students.export
payments.export
reports.export
```

Exact names must follow the project's RBAC convention.

---

# 54. Sensitive Export

Exports containing:

```text
Student Personal Data
Financial Data
Contact Information
```

should receive appropriate access controls.

---

# 55. Export Audit

Every sensitive export should create an audit event.

Example:

```text
students.exported
```

Include:

```text
Actor
Time
Filters
Record Count
Format
```

---

# 56. Small Export

For small datasets:

```text
User clicks Export
       ↓
Generate
       ↓
Download
```

may be sufficient.

---

# 57. Large Export

For large datasets:

```text
User clicks Export
       ↓
Create Export Job
       ↓
Queue
       ↓
Generate
       ↓
Ready
       ↓
Download
```

---

# 58. Export Job

Conceptually:

```text
ExportJob
 ├── id
 ├── tenant_id
 ├── created_by
 ├── report/type
 ├── filters
 ├── format
 ├── status
 ├── progress
 ├── file_reference
 ├── created_at
 └── completed_at
```

---

# 59. Export Status

Recommended:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
EXPIRED
CANCELLED
```

---

# 60. Export Progress

Example:

```text
Generating Export

████████████░░░░ 76%

7,600 / 10,000 records
```

---

# 61. Export Expiration

Generated files should not necessarily remain downloadable forever.

Use a defined expiration policy.

---

# 62. Export File Security

Generated files should:

```text
Have access control
Use secure storage
Expire appropriately
Not be publicly accessible
```

---

# 63. Signed Download

If object storage is used, temporary signed access may be appropriate.

The implementation must ensure only authorized users can obtain the file.

---

# 64. Export Naming

Use meaningful filenames.

Example:

```text
students-class-10A-2026-08.xlsx
```

Avoid including unnecessary sensitive information in filenames.

---

# 65. Export Metadata

Include where appropriate:

```text
Report Name
Generated At
Date Range
Filters
```

Do not include sensitive internal system metadata.

---

# 66. PDF Layout

PDF reports should support:

```text
Title
Institution
Date Range
Filters
Table
Page Numbers
Generated Date
```

---

# 67. XLSX Layout

Spreadsheet exports may include:

```text
Header Row
Data
Optional Summary
Filters
```

Formatting should remain useful without making the file unnecessarily complex.

---

# 68. CSV Rules

CSV should:

```text
Use consistent encoding
Escape delimiters
Handle commas safely
Handle quotes safely
Handle line breaks safely
```

---

# 69. Spreadsheet Injection Protection

When exporting user-controlled strings to spreadsheets, protect against spreadsheet formula injection.

Values beginning with characters interpreted as formulas should be safely escaped according to the export implementation.

---

# 70. Export Row Limits

The system should define sensible limits for synchronous exports.

Example:

```text
Small Export
→ Synchronous

Large Export
→ Background Job
```

Do not hard-code a number without considering infrastructure capacity.

---

# 71. Bulk Selection

Tables may allow:

```text
☐ Select All
☑ Selected Rows
```

---

# 72. Bulk Action Scope

Bulk actions must clearly communicate whether selection means:

```text
Current Page
```

or:

```text
All Matching Results
```

---

# 73. Select All Warning

Example:

```text
50 records selected.

[Select all 2,450 matching records]
```

If the user chooses all matching records, the system must explicitly communicate the scope.

---

# 74. Bulk Export

Example:

```text
2,450 Students
        ↓
Select All
        ↓
Export XLSX
```

This should use the asynchronous export mechanism where necessary.

---

# 75. Bulk Operation Safety

Before destructive or sensitive bulk actions:

```text
Selected:
2,450

Action:
Archive Students

[Cancel]
[Confirm]
```

---

# 76. Bulk Action Authorization

The backend must validate every selected record against the user's scope.

Never trust the frontend selection.

---

# 77. Search API

Possible:

```text
GET /search
?q=rahul
```

---

# 78. Module Search API

Example:

```text
GET /students
?q=rahul
&class_id=...
&status=active
```

The exact API structure must follow the project's existing conventions.

---

# 79. Filter Query

Conceptually:

```text
{
  "filters": [
    {
      "field": "status",
      "operator": "equals",
      "value": "active"
    }
  ]
}
```

The backend must validate the schema and allowed fields.

---

# 80. Sort Query

Conceptually:

```text
{
  "sort": {
    "field": "created_at",
    "direction": "desc"
  }
}
```

---

# 81. Export Request

Conceptually:

```text
{
  "format": "xlsx",
  "filters": {},
  "columns": []
}
```

The backend should derive authorization scope from the authenticated user.

---

# 82. Search Result Response

Conceptually:

```text
{
  "results": [],
  "pagination": {
    "next_cursor": "..."
  }
}
```

---

# 83. Empty Search

Example:

```text
No results found.

Try:
• checking the spelling
• removing a filter
• using a broader search
```

---

# 84. Empty Filter Results

Example:

```text
No students match these filters.
```

Provide:

```text
[Clear Filters]
```

---

# 85. Search Error

Example:

```text
Search couldn't be completed.

Please try again.
```

Do not expose database errors.

---

# 86. Export Error

Example:

```text
We couldn't generate this export.

Please try again or reduce the selected data.
```

---

# 87. Search Performance

The search architecture should prevent:

```text
Unbounded queries
N+1 queries
Full table scans where avoidable
Excessively large responses
```

---

# 88. Search Index

For larger installations, use a dedicated search index when justified.

Possible architecture:

```text
ERP Database
      ↓
Indexing Pipeline
      ↓
Search Index
      ↓
Search Service
```

---

# 89. Search Index Consistency

The database remains authoritative.

The search index is a derived representation.

```text
Database = Source of Truth
Search Index = Search Optimization
```

---

# 90. Search Index Updates

When a student changes:

```text
Student Updated
      ↓
Index Update
```

Failures should be recoverable.

---

# 91. Eventual Consistency

Search results may briefly lag behind transactional changes if a search index is asynchronous.

The UI should avoid claiming search is perfectly real-time unless it is.

---

# 92. Search Reindexing

The system should support rebuilding/reindexing where a dedicated search index exists.

Example:

```text
Start Reindex
      ↓
Process Records
      ↓
Validate
      ↓
Complete
```

---

# 93. Tenant-Aware Indexing

Search documents must contain appropriate tenant/scope information.

Never allow cross-tenant search.

---

# 94. Branch-Aware Search

Where branch access exists:

```text
Search
 ↓
Tenant
 ↓
Authorized Branches
 ↓
Results
```

---

# 95. Parent Search Scope

Parents must only discover records allowed by their relationship and role.

---

# 96. Student Search Scope

Students should only access search results appropriate to their account.

---

# 97. Teacher Search Scope

Teachers should only access student/class records within their authorized teaching scope.

---

# 98. Admin Search Scope

Admins may search tenant-wide data if their role grants tenant-wide access.

---

# 99. Search Privacy

Do not expose sensitive fields in search previews.

For example, a search result may show:

```text
Rahul Kumar
Class 10-A
```

without exposing unnecessary:

```text
Phone
Email
Financial Balance
```

unless required and authorized.

---

# 100. Export Privacy

The same privacy rules apply to exports.

A user must not gain access to sensitive information simply because export functionality exists.

---

# 101. Report + Search Relationship

Reporting and search should use consistent filter semantics.

Example:

```text
Student Search:
Class = 10-A

Student Report:
Class = 10-A
```

Both should resolve the same class scope.

---

# 102. Audit Integration

Important actions should be audited:

```text
Sensitive Export
Bulk Export
Saved Filter Creation
Saved Filter Sharing
```

Search itself may be logged only where the product/security policy requires it.

---

# 103. Testing

Test:

```text
Global Search
Module Search
Suggestions
Filters
Sorting
Pagination
Saved Filters
Authorization
Tenant Isolation
Branch Isolation
Export
Large Export
CSV
XLSX
PDF
Bulk Selection
Search Index
```

---

# 104. Search Authorization Test

User from Branch A searches:

```text
Student B
```

where Student B belongs to Branch B and the user lacks Branch B access.

Expected:

```text
No unauthorized result.
```

---

# 105. Tenant Search Test

Tenant A searches:

```text
common student name
```

Expected:

```text
Only Tenant A records.
```

---

# 106. Filter Test

Apply:

```text
Status = Active
Class = 10-A
```

Verify every returned record satisfies both conditions.

---

# 107. Sort Test

Sort:

```text
Amount DESC
```

Verify records are correctly ordered.

---

# 108. Pagination Test

For:

```text
125 records
```

with:

```text
50 per page
```

verify:

```text
Page 1 = 50
Page 2 = 50
Page 3 = 25
```

without duplicates or missing records.

---

# 109. Export Test

Apply:

```text
Class = 10-A
Status = Active
```

Export.

Verify the file contains only matching records.

---

# 110. Export Permission Test

User without export permission:

```text
Export → DENIED
```

---

# 111. Large Export Test

Request a large export.

Verify:

```text
Job Created
Progress Updated
File Generated
Secure Download
Expiration
Audit Record
```

---

# 112. Spreadsheet Security Test

Export names containing:

```text
=...
+...
-...
@...
```

Verify spreadsheet formula injection is safely handled.

---

# 113. Search Index Test

Update a student.

Verify:

```text
Database Updated
↓
Index Updated
↓
Search Finds New Data
```

---

# 114. Reindex Test

Delete/rebuild search index where supported.

Verify:

```text
Reindex
↓
All authorized records searchable again
```

---

# 115. Final Search Flow

```text
USER
 ↓
SEARCH / FILTER
 ↓
AUTHORIZATION
 ↓
TENANT + DATA SCOPE
 ↓
QUERY / SEARCH INDEX
 ↓
SORT
 ↓
PAGINATE
 ↓
RESULTS
```

---

# 116. Final Export Flow

```text
USER
 ↓
SELECT REPORT / DATASET
 ↓
FILTER
 ↓
AUTHORIZATION
 ↓
QUERY
 ↓
GENERATE FILE
 ↓
SECURE STORAGE
 ↓
DOWNLOAD
 ↓
AUDIT
```

---

# 117. Final Principle

> **Search, filtering and export must make ERP data easy to discover without ever weakening authorization. The database remains authoritative, search indexes are derived optimization layers, filters and sorting are backend-validated, large exports are asynchronous, sensitive exports are audited, and every operation remains tenant- and scope-aware.**

---

# 118. Next Document

The next specification is:

```text
25-IMPORT-AND-BULK-OPERATIONS.md
```

It will define:

```text
CSV Import
XLSX Import
Student Import
Parent Import
Teacher Import
Fee Import
Bulk Creation
Bulk Update
Bulk Archive
Validation
Duplicate Detection
Preview
Error Handling
Import Jobs
Progress Tracking
Rollback Strategy
Import Templates
Data Mapping
Import Security
Audit
```

---

# END OF DOCUMENT
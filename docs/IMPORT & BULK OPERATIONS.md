# IMPORT & BULK OPERATIONS
# School + Coaching Centre ERP SaaS

**Document:** `25-IMPORT-AND-BULK-OPERATIONS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `24-SEARCH-FILTERING-AND-DATA-EXPORT.md`  
**Next Document:** `26-NOTIFICATIONS-AND-REAL-TIME-UPDATES.md`

---

# 1. Purpose

This document defines how large amounts of ERP data can be imported, created, updated, archived, or processed in bulk.

The system must make bulk operations:

```text
Safe
Validated
Auditable
Recoverable
Permission-aware
Tenant-aware
```

Supported operations may include:

```text
CSV Import
XLSX Import
Student Import
Parent Import
Teacher Import
Fee Import
Bulk Create
Bulk Update
Bulk Archive
Bulk Assignment
Bulk Export
```

---

# 2. Core Principle

Bulk operations must never bypass normal business rules.

```text
Bulk Input
    ↓
Validation
    ↓
Authorization
    ↓
Business Rules
    ↓
Preview
    ↓
Execution
    ↓
Audit
```

A bulk operation is simply a scalable way of performing valid individual operations.

---

# 3. Supported File Formats

Import should support:

```text
CSV
XLSX
```

PDF should **not** be treated as a structured import format unless a separate document-extraction workflow is explicitly implemented.

---

# 4. Import Architecture

```text
              USER
                |
                ↓
          Upload File
                |
                ↓
         Create Import Job
                |
                ↓
         Parse File
                |
                ↓
        Validate Structure
                |
                ↓
       Validate Each Row
                |
                ↓
            PREVIEW
                |
                ↓
        User Confirmation
                |
                ↓
       Execute Import Job
                |
        +-------+-------+
        |               |
      Success          Error
        |               |
        ↓               ↓
     Complete        Report
        |
        ↓
       Audit
```

---

# 5. Import Job

Every import should be represented as a job.

Conceptually:

```text
ImportJob
 ├── id
 ├── tenant_id
 ├── created_by
 ├── module
 ├── file_reference
 ├── file_name
 ├── format
 ├── status
 ├── total_rows
 ├── processed_rows
 ├── successful_rows
 ├── failed_rows
 ├── created_at
 ├── started_at
 └── completed_at
```

---

# 6. Import Status

Recommended statuses:

```text
UPLOADED
PARSING
VALIDATING
READY
PROCESSING
COMPLETED
COMPLETED_WITH_ERRORS
FAILED
CANCELLED
```

---

# 7. Import Security

Uploaded files must:

```text
Be authenticated
Be authorized
Have size limits
Have type validation
Be stored securely
Not be publicly accessible
Be scanned where appropriate
```

---

# 8. File Validation

Before parsing:

```text
File Extension
MIME Type
File Size
File Integrity
```

must be validated.

Do not trust only the filename extension.

---

# 9. Import Size Limits

The system should define:

```text
Maximum File Size
Maximum Rows
Maximum Columns
Maximum Processing Time
```

These limits should be configurable where appropriate.

---

# 10. Import Templates

Each importable module should provide a template.

Example:

```text
students-import-template.xlsx
```

The template should contain:

```text
Column Names
Example Values
Required Fields
Optional Fields
Instructions
```

---

# 11. Student Import

Student import may contain fields such as:

```text
Student Name
Admission Number
Date of Birth
Gender
Class
Section
Batch
Phone
Email
Address
Status
```

Only fields supported by the canonical student model should be accepted.

---

# 12. Parent Import

Parent import may contain:

```text
Parent Name
Phone
Email
Relationship
Student Identifier
```

Relationship linking must follow the canonical student-parent model.

---

# 13. Teacher Import

Teacher import may contain:

```text
Teacher Name
Employee ID
Email
Phone
Subject
Branch
Status
```

Only valid teacher fields should be accepted.

---

# 14. Fee Import

Financial imports require additional validation.

Possible fields:

```text
Student
Fee Type
Amount
Due Date
Status
Reference
```

Do not create financial records without validating the institution's fee rules.

---

# 15. Payment Import

If payment import is supported, validate:

```text
Student
Amount
Transaction Reference
Payment Date
Payment Method
Status
```

Duplicate transaction references must be detected.

---

# 16. Exam Import

If supported:

```text
Exam
Class
Subject
Date
Maximum Marks
```

must be validated against existing academic entities.

---

# 17. Result Import

If supported:

```text
Student
Exam
Subject
Marks
Grade
```

must reference valid students, exams, and subjects.

---

# 18. Referential Integrity

Imported records must reference valid entities.

Example:

```text
Student:
Rahul Kumar

Class:
10-A
```

If Class 10-A does not exist:

```text
IMPORT ERROR
```

Do not silently create unrelated entities unless the import workflow explicitly supports creation.

---

# 19. Column Mapping

Users may map uploaded columns to system fields.

Example:

```text
Uploaded Column       ERP Field

Student Name     →    name
Admission No     →    admission_number
Phone Number     →    phone
Class Name       →    class
```

---

# 20. Automatic Mapping

The system may automatically map common column names.

Example:

```text
Student Name
Student_Name
student name
```

may map to:

```text
name
```

The user should be able to review the mapping.

---

# 21. Unknown Columns

Unknown columns should not automatically become database fields.

Example:

```text
Favorite Color
```

If unsupported:

```text
Ignored / Warning
```

or:

```text
Mapping Required
```

depending on the import design.

---

# 22. Required Fields

Required fields must be clearly identified.

Example:

```text
✓ Student Name
✓ Admission Number
✓ Class
```

---

# 23. Optional Fields

Optional fields may be empty.

Example:

```text
Phone
Email
Address
```

---

# 24. Row Validation

Every row should be independently validated.

Example:

```text
Row 24
Student Name: Rahul
Class: INVALID
```

Result:

```text
ERROR
Invalid class
```

---

# 25. Validation Categories

Errors can be:

```text
REQUIRED_FIELD
INVALID_FORMAT
INVALID_VALUE
DUPLICATE
REFERENCE_NOT_FOUND
PERMISSION_ERROR
BUSINESS_RULE_ERROR
```

---

# 26. Validation Example

```text
Row 18

Name:
Rahul Kumar ✓

Class:
10-Z ✗

Error:
Class does not exist.
```

---

# 27. Duplicate Detection

The system must detect duplicate records using canonical identifiers.

Possible identifiers:

```text
Student ID
Admission Number
Employee ID
Payment Transaction ID
Application Number
```

The exact unique fields depend on the module.

---

# 28. Duplicate Strategies

For duplicates, the import may offer:

```text
Skip
Update Existing
Fail Row
```

The available strategy must be explicitly selected.

---

# 29. Never Silently Overwrite

The system must not automatically replace existing data simply because an import contains the same identifier.

Users must explicitly choose the update behavior.

---

# 30. Import Preview

Before execution:

```text
IMPORT PREVIEW

Total Rows:
2,450

Valid:
2,390

Errors:
60

New:
2,100

Updates:
290
```

---

# 31. Error Preview

Show errors clearly:

```text
Row 18
Invalid Class

Row 42
Duplicate Admission Number

Row 97
Missing Student Name
```

---

# 32. Download Error Report

Users should be able to download a file containing:

```text
Original Row
Error Code
Error Message
```

Example:

```text
Row 18 | INVALID_REFERENCE | Class 10-Z not found
```

---

# 33. Fix-and-Reupload Flow

Recommended workflow:

```text
Upload
 ↓
Validate
 ↓
Download Errors
 ↓
Fix File
 ↓
Upload Again
 ↓
Validate
 ↓
Confirm
```

---

# 34. Import Preview Must Not Modify Data

Validation and preview should not create transactional records.

```text
Preview ≠ Commit
```

---

# 35. Import Confirmation

After validation:

```text
2,390 rows will be imported.

100 rows will be skipped.

[Cancel]
[Confirm Import]
```

The user must explicitly confirm.

---

# 36. Import Execution

After confirmation:

```text
READY
 ↓
PROCESSING
 ↓
COMPLETED
```

---

# 37. Background Processing

Large imports must run asynchronously.

```text
Upload
 ↓
Job Queue
 ↓
Worker
 ↓
Database
```

The user should not need to keep the browser request open.

---

# 38. Import Progress

Example:

```text
Importing Students

████████████░░░░ 76%

1,900 / 2,500 rows
```

---

# 39. Import Summary

After completion:

```text
IMPORT COMPLETE

Total:
2,500

Created:
2,100

Updated:
290

Skipped:
50

Failed:
60
```

---

# 40. Partial Success

The system may support:

```text
COMPLETED_WITH_ERRORS
```

where valid rows are committed and invalid rows are rejected.

This behavior must be explicit to the user.

---

# 41. Atomic Import

For some critical operations, the system may require:

```text
All rows succeed
OR
No rows are committed
```

Use atomic behavior where business correctness requires it.

---

# 42. Import Mode

The import UI should clearly identify the mode:

```text
Create Only
Update Existing
Create + Update
```

---

# 43. Update Existing

Example:

```text
Admission Number:
ADM-1001

Existing Student:
Rahul Kumar

New Phone:
98XXXXXXXX
```

The import updates the permitted field.

---

# 44. Field-Level Update Rules

Some fields may not be editable through bulk import.

Example:

```text
System ID
Created At
Tenant ID
Internal Audit Fields
```

These must never be imported as ordinary user-controlled values.

---

# 45. Immutable Fields

System-generated fields should remain server-controlled.

Examples:

```text
Primary Key
Tenant ID
Created Timestamp
Audit Metadata
```

---

# 46. Tenant Assignment

The tenant must come from the authenticated user's context.

Never accept:

```text
tenant_id
```

from an uploaded spreadsheet as the authority for tenancy.

---

# 47. Branch Assignment

If branch assignment is allowed:

```text
Branch
```

must be validated against the user's permitted branches.

---

# 48. Role Authorization

Before import:

```text
Can User Import This Module?
Can User Create?
Can User Update?
Can User Assign Branch?
```

must be checked.

---

# 49. Bulk Create

Bulk create can be used for:

```text
Students
Parents
Teachers
Classes
Subjects
Batches
```

only where supported by the module.

---

# 50. Bulk Update

Bulk update should support only explicitly permitted fields.

Example:

```text
Select 150 Students

Update:
Section → B
```

---

# 51. Bulk Archive

Bulk archive should require explicit confirmation.

Example:

```text
150 students selected.

Archive these students?

[Cancel]
[Archive]
```

---

# 52. Bulk Delete

Permanent deletion should be restricted.

Where possible, use:

```text
Archive
Deactivate
Cancel
```

instead of destructive deletion.

---

# 53. Bulk Assignment

Possible operations:

```text
Assign Students → Batch
Assign Students → Section
Assign Teacher → Subject
Assign Teacher → Class
```

All relationships must be validated.

---

# 54. Bulk Status Update

Example:

```text
150 students

Status:
Inactive
```

The system must ensure the transition is allowed by business rules.

---

# 55. Bulk Operations API

Possible endpoints:

```text
POST /imports
GET /imports/{id}
POST /imports/{id}/validate
POST /imports/{id}/confirm
POST /imports/{id}/cancel
```

Exact routes should follow the project's API conventions.

---

# 56. Bulk Update API

Possible:

```text
POST /students/bulk-update
```

with a validated payload.

---

# 57. Bulk Archive API

Possible:

```text
POST /students/bulk-archive
```

The backend must re-check authorization for every record.

---

# 58. Import Validation API

Conceptually:

```text
{
  "job_id": "...",
  "status": "READY",
  "total_rows": 2500,
  "valid_rows": 2390,
  "invalid_rows": 110
}
```

---

# 59. Import Confirmation API

The confirmation request should reference the validated import job.

Do not trust the frontend's row counts.

---

# 60. Idempotency

Critical bulk operations should support idempotency where appropriate.

Example:

```text
Import Job
    ↓
Retry
    ↓
Do not duplicate records
```

---

# 61. Retry Strategy

Transient failures may be retried.

Permanent validation failures should not be blindly retried.

---

# 62. Failure Recovery

If processing fails:

```text
PROCESSING
    ↓
FAILED
```

the system should retain enough information to diagnose and safely retry where possible.

---

# 63. Import Logs

Each import should retain:

```text
Who
What
When
Module
File
Rows
Results
Errors
```

according to the retention policy.

---

# 64. Audit Integration

Important actions:

```text
import.created
import.validated
import.confirmed
import.completed
import.failed
bulk.updated
bulk.archived
```

should integrate with the audit system.

---

# 65. Import Permissions

Example permission model:

```text
students.import
students.bulk_update
students.bulk_archive
teachers.import
payments.import
```

Exact permission names should follow the project's RBAC naming convention.

---

# 66. Sensitive Imports

Financial and personal data imports require stricter controls.

Examples:

```text
Fee Data
Payment Data
Phone Numbers
Email Addresses
Student Personal Data
```

---

# 67. File Retention

Uploaded source files should not necessarily remain permanently.

Define:

```text
Retention Period
Deletion Policy
Access Policy
```

---

# 68. Secure Temporary Storage

During processing:

```text
Uploaded File
 ↓
Private Storage
 ↓
Worker
 ↓
Process
 ↓
Delete/Expire
```

---

# 69. Virus/Malware Scanning

If infrastructure supports file scanning, uploaded files should be scanned before processing.

Unsafe files must not be processed.

---

# 70. File Type Security

Do not process arbitrary executable content as an import file.

Allow only supported formats.

---

# 71. XLSX Security

XLSX processing should safely handle:

```text
Formulas
External References
Macros
Embedded Objects
```

Do not execute uploaded spreadsheet macros.

---

# 72. CSV Security

CSV import must safely parse:

```text
Quotes
Commas
Newlines
Unicode
Encoding
```

---

# 73. Encoding

UTF-8 should be supported.

Example:

```text
मोहम्मद अली
José
李明
```

must not become corrupted because of encoding assumptions.

---

# 74. Date Parsing

Date fields must have clearly defined accepted formats.

Example:

```text
YYYY-MM-DD
```

Avoid ambiguous formats such as:

```text
01/02/2026
```

unless the format is explicitly configured.

---

# 75. Number Parsing

Amounts should be parsed safely.

Example:

```text
₹25,000
25000
25,000
```

The accepted formats must be clearly documented.

---

# 76. Financial Precision

Money values must use exact decimal/integer monetary representations.

Do not rely on binary floating-point calculations for financial records.

---

# 77. Referential Mapping

Human-readable references may need mapping.

Example:

```text
Uploaded:
Class = 10-A

System:
class_id = UUID(...)
```

The import service performs the mapping.

---

# 78. Ambiguous References

If:

```text
10-A
```

exists in multiple branches:

```text
IMPORT ERROR:
Class reference is ambiguous.
```

The user must provide enough information to resolve it.

---

# 79. Import Dependencies

Some imports require existing entities.

Example:

```text
Result Import
 ↓
Student must exist
 ↓
Exam must exist
 ↓
Subject must exist
```

The UI should communicate these dependencies.

---

# 80. Import Order

Recommended dependency order:

```text
Branches
 ↓
Classes / Courses
 ↓
Subjects
 ↓
Students
 ↓
Parents
 ↓
Teacher Assignments
 ↓
Attendance / Homework / Exams
 ↓
Results
 ↓
Financial Records
```

The exact order depends on the canonical data model.

---

# 81. Bulk Operation Confirmation

For sensitive operations, show:

```text
Number of Records
Affected Module
Changed Fields
Expected Result
```

Example:

```text
150 students

Change:
Section A → Section B

[Cancel]
[Confirm]
```

---

# 82. Bulk Update Preview

Before execution:

```text
BEFORE       AFTER

10-A         10-B
10-A         10-B
10-A         10-B
```

---

# 83. Bulk Archive Preview

Show:

```text
Selected:
240

Active:
220

Already Archived:
20
```

The system should explain which records will actually change.

---

# 84. Bulk Operation Results

Example:

```text
BULK UPDATE COMPLETE

Requested:
240

Updated:
220

Skipped:
20

Failed:
0
```

---

# 85. Error-Level Details

Users should be able to inspect:

```text
Record
Operation
Error
Reason
```

---

# 86. Concurrency

Bulk operations may overlap with normal user activity.

The backend must handle concurrent changes safely.

---

# 87. Stale Data

If a record changes between preview and execution, the system should use a defined conflict strategy.

Possible:

```text
Revalidate
Skip Changed Record
Fail Operation
```

The strategy should be explicit.

---

# 88. Optimistic Concurrency

For sensitive updates, version/timestamp checks may be used.

Example:

```text
Preview Version:
15

Current Version:
16

→ Conflict
```

---

# 89. Bulk Job Cancellation

Long-running jobs may support cancellation.

Example:

```text
PROCESSING

[Cancel Import]
```

Cancellation behavior must define whether already committed rows remain committed.

---

# 90. Cancellation Semantics

The UI should explain:

```text
Cancellation stops remaining processing.
Previously completed rows may remain imported.
```

if partial commit behavior is used.

---

# 91. Bulk Operation Notifications

Users may receive an in-app notification when a long-running job completes.

Example:

```text
Student import completed.

2,390 records imported.
60 records failed.
```

---

# 92. Import History

Authorized users may view:

```text
Import History

Date
Module
File
Created By
Rows
Status
```

---

# 93. Import Detail

Clicking an import should show:

```text
File
Status
Progress
Created
Completed
Created Rows
Updated Rows
Failed Rows
Errors
```

---

# 94. Import Dashboard

Optional dashboard:

```text
Total Imports
Successful
Failed
Processing
Recent Imports
```

---

# 95. Bulk Operation Limits

The system should define limits for:

```text
Rows per import
Records per bulk update
Records per bulk archive
Concurrent jobs
```

These limits should protect system stability.

---

# 96. Rate Limiting

Import and bulk APIs should have appropriate rate limits to prevent abuse or accidental overload.

---

# 97. Background Workers

Large operations should use workers:

```text
API
 ↓
Queue
 ↓
Worker
 ↓
Database
```

Workers should be horizontally scalable where required.

---

# 98. Progress Tracking

Progress should be stored in a way that allows the UI to retrieve:

```text
Total
Processed
Success
Failed
```

---

# 99. Real-Time Progress

If real-time infrastructure exists:

```text
Worker
 ↓
Progress Event
 ↓
WebSocket/SSE
 ↓
UI
```

Otherwise, the frontend may poll the job status endpoint.

---

# 100. Performance

Bulk operations should use:

```text
Batch Processing
Prepared Statements
Efficient Queries
Transactions
Queue Workers
```

where appropriate.

Avoid:

```text
One HTTP request per row
One database query per row
```

when scalable batch methods are available.

---

# 101. Database Transactions

Use transactions around logical units of work.

Do not create partial/inconsistent relationships.

---

# 102. Business Rule Enforcement

Bulk imports must trigger the same critical rules as normal operations.

Example:

```text
Normal Student Creation
        +
Bulk Student Import
        ↓
Same Validation Rules
```

---

# 103. Canonical Service Layer

Where possible:

```text
Normal Create
     ↓
Domain Service

Bulk Create
     ↓
Same Domain Service / Shared Rules
```

Avoid creating a completely separate business-rule implementation for imports.

---

# 104. Testing

Test:

```text
CSV Import
XLSX Import
Column Mapping
Required Fields
Invalid Values
Duplicates
References
Permissions
Tenant Isolation
Branch Scope
Partial Success
Atomic Import
Retries
Cancellation
Progress
Audit
Large Files
```

---

# 105. Student Import Test

Import:

```text
100 students
```

Expected:

```text
Valid:
100

Created:
100
```

---

# 106. Duplicate Test

Import a student whose admission number already exists.

Expected behavior depends on selected mode:

```text
Create Only → Error/Skip
Update Existing → Update
Create + Update → Update
```

---

# 107. Invalid Reference Test

Import:

```text
Class = 99-Z
```

when class does not exist.

Expected:

```text
Row Failed
Reason:
REFERENCE_NOT_FOUND
```

---

# 108. Authorization Test

User without student-import permission attempts upload.

Expected:

```text
403 / ACCESS DENIED
```

No import job should be created.

---

# 109. Tenant Isolation Test

An import must never be able to create or update records belonging to another tenant.

---

# 110. Branch Authorization Test

A user authorized only for Branch A attempts to import students into Branch B.

Expected:

```text
Rejected
```

---

# 111. Large Import Test

Import a large dataset.

Verify:

```text
Job Created
Background Processing
Progress
No Request Timeout
Correct Results
```

---

# 112. Retry Test

Simulate a transient worker/database failure.

Verify:

```text
Retry
No Duplicate Records
Correct Final State
```

---

# 113. Audit Test

After successful import:

```text
Audit Event Exists
```

and contains appropriate actor/job information.

---

# 114. Security Test

Attempt to upload:

```text
Executable
Malformed Spreadsheet
Unsupported File
```

Expected:

```text
Rejected
```

---

# 115. Final Import Flow

```text
UPLOAD
   ↓
FILE VALIDATION
   ↓
PARSING
   ↓
COLUMN MAPPING
   ↓
ROW VALIDATION
   ↓
DUPLICATE / REFERENCE CHECK
   ↓
PREVIEW
   ↓
USER CONFIRMATION
   ↓
BACKGROUND JOB
   ↓
BUSINESS RULES
   ↓
DATABASE
   ↓
RESULT SUMMARY
   ↓
AUDIT
```

---

# 116. Final Bulk Operation Flow

```text
SELECT RECORDS
      ↓
CHECK PERMISSION
      ↓
CHECK DATA SCOPE
      ↓
VALIDATE OPERATION
      ↓
SHOW PREVIEW
      ↓
CONFIRM
      ↓
EXECUTE
      ↓
RESULT
      ↓
AUDIT
```

---

# 117. Final Principle

> **Bulk operations are a controlled scaling mechanism, not a shortcut around business rules. Every import and bulk action must be validated, permission-aware, tenant-safe, auditable, and designed to handle large datasets without compromising data integrity.**

---

# 118. Next Document

The next specification is:

```text
26-NOTIFICATIONS-AND-REAL-TIME-UPDATES.md
```

It will define:

```text
Notification Architecture
In-App Notifications
Email Notifications
SMS/WhatsApp Integration Boundaries
Push Notifications
Notification Preferences
Templates
Events
Real-Time Updates
WebSockets
SSE
Unread Counts
Notification Center
Delivery Status
Retries
Scheduling
User Preferences
Role-Based Notifications
Tenant Isolation
Notification Audit
```

---

# END OF DOCUMENT
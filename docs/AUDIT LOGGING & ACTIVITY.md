# AUDIT LOGGING & ACTIVITY
# School + Coaching Centre ERP SaaS

**Document:** `22-AUDIT-LOGGING-AND-ACTIVITY.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `21-NOTIFICATIONS-AND-COMMUNICATION.md`  
**Next Document:** `23-REPORTING-AND-ANALYTICS.md`

---

# 1. Purpose

The Audit Logging & Activity module records important actions performed throughout the ERP.

It answers:

- **Who** performed an action?
- **What** did they do?
- **When** did they do it?
- **Where** did it happen?
- **Which record** was affected?
- **What changed?**
- **Was the action successful or failed?**

The system must provide a reliable historical trail without allowing normal users to alter audit records.

---

# 2. Core Principle

Every important state-changing operation should produce an auditable event.

```text
User Action
    ↓
Business Operation
    ↓
Database Change
    ↓
Audit Event
    ↓
Immutable Audit Record
```

Audit logging must not become the source of truth for business data.

Business modules remain responsible for their own records.

---

# 3. Audit Architecture

```text
                    ERP
                     |
        +------------+------------+
        |            |            |
      Users        System       Integrations
        |            |            |
        +------------+------------+
                     ↓
                Action/Event
                     ↓
                Audit Service
                     ↓
             Audit Event Store
                     ↓
        +------------+------------+
        |                         |
   Activity Timeline         Audit Search
        |                         |
        +------------+------------+
                     ↓
              Authorized Admin
```

---

# 4. What Should Be Audited?

Audit important:

```text
CREATE
UPDATE
DELETE
LOGIN
LOGOUT
PASSWORD CHANGES
ROLE CHANGES
PERMISSION CHANGES
APPROVALS
REJECTIONS
PAYMENTS
REFUNDS
FEE CHANGES
RESULT PUBLICATION
ATTENDANCE CHANGES
ANNOUNCEMENTS
SETTINGS CHANGES
DATA EXPORTS
```

Not every harmless UI interaction needs an audit record.

---

# 5. Audit Categories

Recommended categories:

```text
AUTHENTICATION
USER_MANAGEMENT
STUDENT
PARENT
TEACHER
ACADEMIC
ATTENDANCE
HOMEWORK
EXAMS
RESULTS
FEES
PAYMENTS
ADMISSIONS
COMMUNICATION
SETTINGS
SECURITY
SYSTEM
```

---

# 6. Audit Event Structure

Conceptually:

```text
AuditLog
 ├── id
 ├── tenant_id
 ├── actor_id
 ├── action
 ├── category
 ├── entity_type
 ├── entity_id
 ├── timestamp
 ├── metadata
 ├── old_values
 ├── new_values
 ├── ip_address
 ├── user_agent
 └── status
```

The final database schema must follow the project's canonical architecture.

---

# 7. Actor

The actor is the user or system responsible for the action.

Examples:

```text
Admin
Teacher
Student
Parent
Finance Staff
System
Integration
```

---

# 8. System Actor

Automated operations should also be auditable.

Example:

```text
Actor:
SYSTEM

Action:
Automatic overdue fee generation
```

---

# 9. Actor Information

Where appropriate, record:

```text
actor_id
actor_role
actor_name/snapshot
```

Do not rely exclusively on mutable user profile information for historical interpretation.

---

# 10. Tenant ID

Every audit record must contain the tenant context.

```text
tenant_id
```

This is mandatory for a multi-tenant ERP.

---

# 11. Tenant Isolation

Audit queries must always respect:

```text
tenant_id
```

Tenant A must never be able to access Tenant B's audit logs.

---

# 12. Action

An action describes what happened.

Examples:

```text
student.created
student.updated
student.deleted

fee.created
fee.updated

payment.created
payment.success
payment.refunded

attendance.updated

result.published
```

---

# 13. Entity Type

The entity identifies the affected resource.

Examples:

```text
Student
Parent
Teacher
Attendance
Fee
Payment
Exam
Result
Announcement
User
Role
```

---

# 14. Entity ID

Where applicable, store the affected record's ID.

Example:

```text
entity_type:
Student

entity_id:
STU_123
```

---

# 15. Timestamp

Every audit record requires a reliable timestamp.

Use a consistent server-side time standard.

Do not rely on the browser's local clock.

---

# 16. Status

Audit events may have:

```text
SUCCESS
FAILED
DENIED
```

Example:

```text
Admin attempted to delete student
→ DENIED
```

can be valuable for security auditing.

---

# 17. Before and After Values

For important updates, capture relevant changes.

Example:

```text
OLD:
fee_amount = 5000

NEW:
fee_amount = 5500
```

This allows administrators to understand what changed.

---

# 18. Do Not Store Everything

Audit logging should not blindly copy entire database records.

Store only information required for traceability.

Avoid unnecessary duplication of large or sensitive data.

---

# 19. Sensitive Data

Never place secrets into audit logs.

Do not record:

```text
Passwords
Authentication Tokens
API Secrets
Private Keys
Payment Card Numbers
```

---

# 20. Password Changes

Audit:

```text
Password changed
```

Do not audit:

```text
Old password
New password
```

---

# 21. Authentication Audit

Important authentication events:

```text
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
PASSWORD_CHANGED
PASSWORD_RESET_REQUESTED
PASSWORD_RESET_COMPLETED
ACCOUNT_LOCKED
ACCOUNT_UNLOCKED
```

---

# 22. Login History

Authorized administrators may see:

```text
Login History

User
Date
Time
IP
Device
Browser
Status
```

---

# 23. Failed Login

Repeated failed login attempts can be audited.

Example:

```text
User:
teacher@example

Action:
login.failed

Time:
10:31 AM

IP:
recorded securely
```

---

# 24. Account Locking

If an account is locked:

```text
account.locked
```

should be recorded.

---

# 25. User Management Audit

Audit:

```text
User Created
User Updated
User Disabled
User Enabled
Role Assigned
Role Removed
Permission Changed
```

---

# 26. Role Change

Example:

```text
Admin
 ↓
Changed user role
 ↓
Teacher → Branch Admin
```

Audit should show the old and new role.

---

# 27. Permission Change

Example:

```text
Before:
reports.view = false

After:
reports.view = true
```

---

# 28. Student Audit

Examples:

```text
Student Created
Student Updated
Student Transferred
Student Archived
Student Restored
```

---

# 29. Student Record Changes

Important changes may include:

```text
Name
Class
Section
Batch
Enrollment
Status
Guardian Relationship
```

Only permitted fields should be changed and audited.

---

# 30. Parent Audit

Examples:

```text
Parent Created
Parent Updated
Student Linked
Student Unlinked
Contact Updated
```

---

# 31. Teacher Audit

Examples:

```text
Teacher Created
Teacher Updated
Class Assigned
Subject Assigned
Teacher Deactivated
```

---

# 32. Attendance Audit

Attendance changes are particularly important.

Example:

```text
Teacher initially marked:
Present

Later changed to:
Absent
```

Audit:

```text
Action:
attendance.updated

Old:
Present

New:
Absent

Actor:
Teacher
```

---

# 33. Attendance Deletion

If attendance records can be deleted or voided, record:

```text
Who
When
Which attendance
Why
```

where the workflow requires a reason.

---

# 34. Homework Audit

Examples:

```text
Homework Created
Homework Updated
Homework Published
Homework Deleted
Submission Graded
```

---

# 35. Exam Audit

Examples:

```text
Exam Created
Schedule Updated
Exam Published
Exam Cancelled
```

---

# 36. Result Audit

Result changes must be auditable.

Example:

```text
Marks:
72 → 78
```

Audit:

```text
Actor:
Teacher

Action:
result.updated

Reason:
Correction
```

If the business workflow requires a reason, the UI must enforce it.

---

# 37. Result Publication

Publishing results is a significant action.

Audit:

```text
result.published
```

with:

```text
Actor
Exam
Class/Batch
Timestamp
```

---

# 38. Fee Audit

Audit:

```text
Fee Created
Fee Updated
Discount Added
Waiver Added
Due Date Changed
Fee Cancelled
```

---

# 39. Financial Audit

Financial records require stronger traceability.

Examples:

```text
Payment Created
Payment Verified
Payment Failed
Payment Refunded
Refund Approved
Refund Rejected
```

---

# 40. Payment Changes

Never silently overwrite financial history.

Prefer:

```text
Original Transaction
        ↓
Adjustment / Refund / Correction
```

with an audit trail.

---

# 41. Refund Audit

Example:

```text
Refund Requested
Refund Approved
Refund Processed
Refund Failed
```

Record:

```text
Actor
Amount
Payment Reference
Timestamp
Status
```

---

# 42. Admission Audit

Examples:

```text
Application Created
Application Updated
Application Approved
Application Rejected
Admission Confirmed
Documents Updated
```

---

# 43. Communication Audit

Record:

```text
Announcement Created
Announcement Published
Template Created
Template Updated
Notification Sent
Notification Failed
```

---

# 44. Settings Audit

System configuration changes must be auditable.

Examples:

```text
Fee Settings Changed
Attendance Settings Changed
Academic Settings Changed
Notification Settings Changed
Tenant Settings Changed
```

---

# 45. Activity Timeline

The ERP should provide human-readable activity timelines where useful.

Example:

```text
STUDENT ACTIVITY

Today
│
├── 10:42 AM
│   Attendance marked Present
│   by Mr. Khan
│
├── 09:20 AM
│   Homework submitted
│   by Student
│
Yesterday
│
└── 04:15 PM
    Fee payment received
    ₹5,000
```

---

# 46. Timeline vs Audit Log

They are related but different.

### Activity Timeline

Optimized for:

```text
Human readability
Context
Quick history
```

### Audit Log

Optimized for:

```text
Traceability
Security
Compliance
Investigation
Detailed metadata
```

---

# 47. Activity Timeline Sources

Activity timelines may aggregate:

```text
Audit Events
Business Events
Communication Events
Financial Events
Academic Events
```

---

# 48. Timeline Filtering

Users may filter by:

```text
All
Academic
Attendance
Finance
Communication
Security
```

depending on their permissions.

---

# 49. Audit Search

Admin users should be able to search by:

```text
Actor
Action
Category
Entity
Entity ID
Date
Status
```

---

# 50. Date Filters

Recommended:

```text
Today
Yesterday
Last 7 Days
Last 30 Days
Custom Range
```

---

# 51. Actor Filter

Example:

```text
Performed By:
Admin
Teacher
Finance
System
```

---

# 52. Entity Filter

Example:

```text
Entity:
Student
Payment
Attendance
Exam
User
```

---

# 53. Action Filter

Example:

```text
Action:
Created
Updated
Deleted
Approved
Published
Refunded
```

---

# 54. Audit Detail Page

Example:

```text
AUDIT EVENT

Action:
Fee Updated

Actor:
Admin User

Date:
31 Aug 2026
11:25 AM

Entity:
Fee #FEE-1288

Before:
Amount: ₹5,000

After:
Amount: ₹5,500

IP:
[recorded]

Status:
SUCCESS
```

---

# 55. Change Diff

For updates, provide a clear diff.

```text
FIELD          BEFORE       AFTER
-------------------------------------
Amount         ₹5,000       ₹5,500
Due Date       10 Sep       15 Sep
Status         Pending      Active
```

---

# 56. JSON Diff

The backend may store structured before/after values.

Example:

```text
old_values:
{
  "amount": 5000
}

new_values:
{
  "amount": 5500
}
```

---

# 57. Metadata

Additional metadata may include:

```text
IP Address
User Agent
Request ID
Session ID
Source
Device
```

Only collect information that is operationally justified.

---

# 58. Request ID

A request/correlation ID can connect:

```text
API Request
 ↓
Business Operation
 ↓
Audit Event
 ↓
Notification
```

This greatly helps debugging.

---

# 59. Source

Record where an action originated when useful:

```text
WEB
MOBILE
API
SYSTEM
IMPORT
INTEGRATION
```

---

# 60. Bulk Operations

Bulk actions should be auditable.

Example:

```text
Admin updated attendance
for 120 students
```

Record:

```text
Bulk Operation ID
Actor
Action
Scope
Result
```

Avoid creating enormous duplicated audit payloads unnecessarily.

---

# 61. Bulk Audit

Example:

```text
Bulk Attendance Update

Actor:
Teacher

Records:
120

Successful:
118

Failed:
2

Operation:
BULK_ATTENDANCE_UPDATE
```

---

# 62. Data Import Audit

If CSV/Excel imports exist:

```text
Import Started
Import Completed
Import Failed
```

Record:

```text
Actor
File/Import Reference
Record Count
Success Count
Failure Count
```

Do not necessarily store the entire uploaded file in the audit log.

---

# 63. Data Export Audit

Exporting sensitive student/financial information should be auditable.

Example:

```text
Actor:
Admin

Action:
students.exported

Records:
2,400

Filters:
Class 10
```

---

# 64. Unauthorized Access

Security-relevant denied actions should be recorded.

Example:

```text
Teacher attempted to access:
Financial Report

Result:
DENIED
```

---

# 65. Permission Denied Events

Potential event:

```text
authorization.denied
```

Include:

```text
Actor
Requested Resource
Action
Timestamp
```

Do not expose sensitive internal authorization details to the user.

---

# 66. Audit Immutability

Normal application users must not be able to:

```text
Edit Audit Log
Delete Audit Log
Rewrite Audit Log
```

---

# 67. Audit Retention

Audit retention should follow:

```text
Tenant Policy
Product Policy
Applicable Legal/Compliance Requirements
Storage Constraints
```

Do not hard-code an arbitrary retention period without product requirements.

---

# 68. Audit Archiving

For large installations:

```text
Active Audit Store
        ↓
Archive
        ↓
Long-Term Storage
```

Archived records must remain discoverable according to retention policy.

---

# 69. Audit Pagination

Audit lists must be paginated.

Do not load millions of audit records into the browser.

---

# 70. Sorting

Default:

```text
Newest First
```

Optional:

```text
Oldest First
```

---

# 71. Search Performance

Index commonly queried fields such as:

```text
tenant_id
actor_id
action
category
entity_type
entity_id
created_at
```

Exact indexes must follow database architecture and workload.

---

# 72. Audit Storage Strategy

For large systems, audit logs may be stored separately from primary transactional tables.

Possible:

```text
Application DB
      |
      ↓
Audit Pipeline
      |
      ↓
Audit Store
```

The implementation should balance consistency, scale and operational simplicity.

---

# 73. Audit Failure

A failed audit write must be treated seriously.

The system should have an explicit policy determining whether:

```text
Business transaction fails
```

or:

```text
Business transaction succeeds + audit write is retried
```

for each critical operation.

Critical financial/security operations should receive stronger guarantees.

---

# 74. Transactional Audit

Where necessary:

```text
Business Change
+
Audit Record
```

should be committed atomically.

Example:

```text
Fee updated
+
fee.updated audit
```

must not leave an unexplained successful financial change without traceability.

---

# 75. Asynchronous Audit

Low-risk activity may be written asynchronously where appropriate.

Example:

```text
User viewed report
```

may not require the same guarantees as:

```text
Payment refunded
```

---

# 76. Audit Event Severity

Optional severity levels:

```text
INFO
WARNING
CRITICAL
```

Examples:

```text
Student updated:
INFO

Permission denied:
WARNING

Role escalation:
CRITICAL
```

---

# 77. Security Events

Important security events include:

```text
Login Failure
Account Lock
Password Reset
Role Escalation
Permission Change
Unauthorized Access
Suspicious Session
```

---

# 78. System Events

Examples:

```text
Scheduled Job Started
Scheduled Job Failed
Notification Worker Failed
Import Completed
Backup Event
Integration Failure
```

---

# 79. Scheduled Jobs

Automated jobs should have traceability.

Example:

```text
SYSTEM

Action:
fee.overdue_generation

Started:
02:00 AM

Completed:
02:04 AM

Processed:
4,250
```

---

# 80. Audit Correlation

Related events should be linkable.

Example:

```text
Payment
 ↓
payment.success
 ↓
Notification
 ↓
Email delivery
```

A correlation ID can connect the chain.

---

# 81. User-Facing Activity

Do not expose raw internal audit metadata to normal users.

For example, parents may see:

```text
Fee payment received
```

but not:

```text
internal_request_id
provider_debug_data
database identifiers
```

unless explicitly required.

---

# 82. Admin Audit Access

Administrators with the correct permissions may access detailed logs.

Access should still respect:

```text
Tenant
Branch
Role
Data Scope
```

where applicable.

---

# 83. Branch-Level Access

If the ERP supports branch-level permissions:

```text
Branch Admin
```

should only see audit records within their authorized scope.

---

# 84. Sensitive Audit Access

Viewing audit logs can itself be sensitive.

Therefore:

```text
audit.view
```

should be a protected permission.

---

# 85. Audit Export

Authorized administrators may export audit data.

Exports should themselves be audited.

Example:

```text
audit.exported
```

---

# 86. Audit Export Security

Exports should:

```text
Respect permissions
Respect tenant boundaries
Respect filters
Avoid secrets
Be access-controlled
```

---

# 87. API Design

Possible endpoints:

```text
GET /audit-logs
GET /audit-logs/{id}
```

---

# 88. Activity API

Possible:

```text
GET /activity
GET /students/{id}/activity
GET /payments/{id}/activity
GET /users/{id}/activity
```

Exact routes must follow the project's API conventions.

---

# 89. Audit Query Example

Conceptually:

```text
GET /audit-logs
    ?category=PAYMENTS
    &action=payment.refunded
    &from=2026-08-01
    &to=2026-08-31
```

---

# 90. Audit Response

Conceptually:

```text
{
  "id": "...",
  "action": "payment.refunded",
  "actor": "...",
  "entity_type": "Payment",
  "entity_id": "...",
  "status": "SUCCESS",
  "created_at": "..."
}
```

Sensitive metadata should only be returned to authorized users.

---

# 91. Authorization

Every audit endpoint must enforce authorization.

Never rely on frontend hiding.

---

# 92. Tenant Enforcement

Backend queries should enforce tenant scope independently of user-provided parameters.

Do not trust:

```text
?tenant_id=...
```

from the client.

Tenant context should come from authenticated server-side context.

---

# 93. Audit Logging Middleware

A middleware/interceptor can capture common request information:

```text
Request ID
Actor
Tenant
IP
User Agent
```

But business-specific changes should still produce meaningful domain-level audit events.

---

# 94. Domain Events vs HTTP Logs

Do not use raw HTTP logs as the primary audit system.

Example:

```text
POST /fees/123
```

is less useful than:

```text
fee.updated
amount:
₹5,000 → ₹5,500
actor:
Admin
```

---

# 95. Audit Event Naming

Use consistent event naming.

Recommended format:

```text
resource.action
```

Examples:

```text
student.created
student.updated
fee.updated
payment.refunded
result.published
announcement.published
```

---

# 96. Naming Consistency

Do not mix:

```text
studentCreated
StudentCreated
CREATE_STUDENT
student.created
```

Use the project's canonical event naming convention consistently.

---

# 97. Delete vs Archive

Where records are soft-deleted/archived:

```text
student.archived
```

may be more appropriate than:

```text
student.deleted
```

The audit event must represent the actual business operation.

---

# 98. Restore

If restoration is supported:

```text
student.restored
```

must be recorded.

---

# 99. Approval Workflow

For approval-based actions:

```text
approval.requested
approval.approved
approval.rejected
```

Record:

```text
Requester
Approver
Timestamp
Decision
```

---

# 100. Reason Capture

Certain sensitive changes should require a reason.

Examples:

```text
Fee waiver
Refund
Result correction
Attendance correction
Account suspension
```

The reason should be included in the audit event where appropriate.

---

# 101. Reason UI

Example:

```text
Reason for change

[ Student was marked absent by mistake ]

             [Confirm]
```

The audit record stores the resulting reason.

---

# 102. Audit Integrity

For higher-security deployments, consider mechanisms such as:

```text
Append-only storage
Cryptographic integrity checks
Restricted database permissions
Separate audit storage
```

These are implementation/security enhancements, not substitutes for authorization.

---

# 103. Monitoring

Monitor:

```text
Audit write failures
Audit queue backlog
Storage growth
Unexpected event volume
```

---

# 104. Testing

Test:

```text
Create Audit
Update Audit
Delete/Archive Audit
Before/After Diff
Authorization
Tenant Isolation
Bulk Actions
Financial Actions
Security Actions
Export
Pagination
Filtering
```

---

# 105. Tenant Isolation Test

Create:

```text
Tenant A Audit
Tenant B Audit
```

Verify:

```text
Tenant A → A only
Tenant B → B only
```

---

# 106. Authorization Test

User without:

```text
audit.view
```

must not access audit logs.

---

# 107. Financial Audit Test

Perform:

```text
Payment
Refund
```

Verify:

```text
Payment audit exists
Refund audit exists
Actor recorded
Timestamp recorded
Amount recorded
```

---

# 108. Before/After Test

Update:

```text
Fee:
₹5,000 → ₹6,000
```

Verify the audit contains the correct old and new values.

---

# 109. Security Test

Perform failed authorization.

Verify:

```text
authorization.denied
```

is recorded where configured.

---

# 110. Bulk Operation Test

Update 100 records.

Verify:

```text
Bulk operation tracked
```

without generating unusably large payloads.

---

# 111. Export Test

Export audit logs.

Verify:

```text
Audit export itself is audited.
```

---

# 112. Performance Test

Test with:

```text
100,000+
1,000,000+
```

audit records as appropriate for the expected scale.

Verify:

```text
Pagination
Filtering
Indexing
Query Performance
```

---

# 113. UI Requirements

The audit UI should be:

```text
Desktop-friendly
Mobile-responsive
Searchable
Filterable
Readable
Permission-aware
```

---

# 114. Audit Dashboard

Recommended:

```text
┌─────────────────────────────────────┐
│ AUDIT LOG                            │
├─────────────────────────────────────┤
│ Search [____________________] 🔍    │
│                                     │
│ Category [All ▼]                    │
│ Actor    [All ▼]                    │
│ Date     [Last 30 Days ▼]           │
├─────────────────────────────────────┤
│ 11:25  Fee Updated                  │
│ Admin  ₹5,000 → ₹5,500              │
│                                     │
│ 10:42  Attendance Updated           │
│ Teacher Present → Absent             │
│                                     │
│ 09:18  Result Published              │
│ Admin  Class 10-A                    │
└─────────────────────────────────────┘
```

---

# 115. Mobile Audit UI

On mobile:

```text
Action
Actor
Time
Entity
```

should appear first.

Detailed metadata can be shown after tapping.

---

# 116. Empty State

If there are no results:

```text
No activity found

Try changing your filters or date range.
```

---

# 117. Loading State

Use skeleton/loading states instead of freezing the interface.

---

# 118. Error State

Example:

```text
Unable to load audit activity.

Please try again.
```

Do not expose stack traces.

---

# 119. Pagination UI

Example:

```text
Showing 1–50 of 8,420

[Previous] [1] [2] [3] ... [Next]
```

Cursor-based pagination may be preferable for very large audit streams.

---

# 120. Final Data Flow

```text
USER / SYSTEM
      ↓
ACTION
      ↓
AUTHORIZATION
      ↓
BUSINESS OPERATION
      ↓
DATABASE CHANGE
      ↓
AUDIT EVENT
      ↓
AUDIT STORE
      ↓
ACTIVITY / SEARCH / REPORTING
```

---

# 121. Final Principle

> **Audit logging is the ERP's historical truth about actions, not a duplicate business database. Every important operation must be attributable, tenant-isolated, permission-controlled and traceable, while sensitive secrets must never be stored. Financial, security and authorization-sensitive actions require especially strong audit guarantees.**

---

# 122. Next Document

The next specification is:

```text
23-REPORTING-AND-ANALYTICS.md
```

It will define:

```text
Dashboard Architecture
Reports
KPIs
Academic Analytics
Attendance Analytics
Finance Reports
Student Reports
Teacher Reports
Admission Reports
Custom Filters
Date Ranges
Exports
Charts
Tables
Scheduled Reports
Role-Based Reporting
Branch-Level Reporting
Tenant Analytics
```

---

# END OF DOCUMENT
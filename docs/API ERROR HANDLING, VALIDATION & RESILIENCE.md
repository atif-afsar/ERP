# API ERROR HANDLING, VALIDATION & RESILIENCE
# School + Coaching Centre ERP SaaS

**Document:** `40-API-ERROR-HANDLING-VALIDATION-AND-RESILIENCE.md`  
**Version:** 1.0  
**Status:** Canonical Error & Resilience Specification  
**Previous Document:** `39-API-ARCHITECTURE-AND-SERVICE-CONTRACTS.md`  
**Next Document:** `41-DATABASE-ARCHITECTURE-AND-DATA-INTEGRITY.md`

---

# 1. Purpose

This document defines how the ERP handles:

```text
Validation Errors
API Errors
Authentication Errors
Authorization Errors
Network Failures
Timeouts
Rate Limits
Concurrency Conflicts
External Service Failures
Database Failures
Unexpected Errors
Recovery States
```

The goal is to ensure the system fails **predictably, safely, and recoverably**.

---

# 2. Core Principle

An error must never leave the user wondering:

```text
"What happened?"
```

The system should provide:

```text
What happened
Why it happened where appropriate
What the user can do next
```

while never exposing sensitive internal implementation details.

---

# 3. Error Architecture

Conceptually:

```text
Request
  ↓
Validation
  ↓
Authentication
  ↓
Authorization
  ↓
Business Rules
  ↓
Database / External Service
  ↓
Error
  ↓
Normalize
  ↓
API Error Response
  ↓
Frontend Error Handler
  ↓
User-Friendly UI
```

---

# 4. Error Categories

The system should classify errors into clear categories:

```text
VALIDATION_ERROR
AUTHENTICATION_ERROR
AUTHORIZATION_ERROR
NOT_FOUND_ERROR
CONFLICT_ERROR
BUSINESS_RULE_ERROR
RATE_LIMIT_ERROR
EXTERNAL_SERVICE_ERROR
DATABASE_ERROR
INTERNAL_ERROR
```

---

# 5. Machine-Readable Error Codes

Every expected error should have a stable machine-readable code.

Examples:

```text
VALIDATION_ERROR
STUDENT_NOT_FOUND
PERMISSION_DENIED
SESSION_EXPIRED
PAYMENT_ALREADY_REFUNDED
DUPLICATE_ADMISSION_ID
ATTENDANCE_LOCKED
```

The frontend should rely on these codes rather than parsing human-readable messages.

---

# 6. Standard Error Response

Use one consistent error envelope.

Example:

```text
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student not found.",
    "details": null,
    "requestId": "req_123"
  }
}
```

---

# 7. Error Fields

The standard error object may contain:

```text
code
message
details
requestId
```

Additional metadata may be added where appropriate.

---

# 8. Request ID

Every request should have a traceable request ID where practical.

Example:

```text
Frontend
 ↓
Request ID: req_123
 ↓
Backend
 ↓
Database / Services
 ↓
Logs
```

This allows support and developers to investigate failures efficiently.

---

# 9. User-Facing Messages

Messages should be:

```text
Clear
Short
Non-technical
Actionable
```

Avoid exposing:

```text
SQL errors
Stack traces
Internal class names
File paths
Infrastructure information
Secrets
```

---

# 10. Validation

Validation must happen on both:

```text
Frontend
Backend
```

Frontend validation improves user experience.

Backend validation protects data integrity.

---

# 11. Required Field Validation

Example:

```text
Student Name
Date of Birth
Class
```

If a required field is missing:

```text
Student name is required.
```

The API should return a structured validation error.

---

# 12. Field-Level Errors

For forms, validation should identify the affected field when possible.

Example:

```text
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": "Enter a valid email address.",
      "phone": "Enter a valid phone number."
    }
  }
}
```

---

# 13. Form Error Mapping

Frontend forms should map API validation errors directly to the relevant fields.

Conceptually:

```text
API
 ↓
Validation Error
 ↓
Field Mapping
 ↓
Form
 ↓
User Fixes Input
```

---

# 14. Do Not Clear Valid Input

When one field is invalid, do not unnecessarily clear unrelated user-entered values.

This is especially important for:

```text
Student Forms
Admission Forms
Payment Forms
Exam Forms
Bulk Data Entry
```

---

# 15. Validation Timing

Use:

```text
Immediate Validation
```

for simple input constraints where helpful.

Use:

```text
Submit Validation
```

for complete business validation.

Do not overwhelm users with aggressive validation while typing.

---

# 16. Business Rule Errors

A request can be structurally valid but still violate business rules.

Example:

```text
Payment amount = 500
```

is structurally valid.

But:

```text
Payment already refunded
```

may be a business rule violation.

---

# 17. Business Rule Error Example

```text
{
  "error": {
    "code": "PAYMENT_ALREADY_REFUNDED",
    "message": "This payment has already been refunded."
  }
}
```

The frontend should display an appropriate action or explanation.

---

# 18. Authentication Errors

Authentication failures should be handled separately from validation.

Example:

```text
401 Unauthorized
```

Possible reasons:

```text
Session Expired
Session Missing
Invalid Authentication
```

---

# 19. Session Expiration UX

When a session expires:

```text
API Request
 ↓
401
 ↓
Refresh Session if supported
 ↓
If unsuccessful:
Clear Auth State
 ↓
Login
```

The user should not be trapped on a broken page.

---

# 20. Authorization Errors

For:

```text
403 Forbidden
```

show a clear permission state.

Example:

```text
You don't have permission to perform this action.
```

Do not redirect every authorization failure to login.

---

# 21. Not Found Errors

For:

```text
404
```

show the appropriate state:

```text
Student not found
Payment not found
Class not found
```

For security-sensitive resources, the backend may intentionally return a generic not-found response rather than revealing resource existence.

---

# 22. Conflict Errors

Use:

```text
409 Conflict
```

for state conflicts.

Examples:

```text
Duplicate Admission ID
Duplicate Payment
Already Published Exam
Already Archived Student
```

---

# 23. Conflict UX

A conflict should tell the user what happened and what action is possible.

Example:

```text
This admission ID is already in use.
Please choose another ID.
```

---

# 24. Rate Limiting

When the API returns:

```text
429 Too Many Requests
```

the frontend should avoid immediately retrying repeatedly.

If the API provides retry information, respect it.

---

# 25. Network Errors

A network failure means the request may not have reached the server.

Examples:

```text
No Internet
Server Unreachable
DNS Failure
Connection Interrupted
```

Show a generic but actionable message:

```text
Unable to connect. Check your internet connection and try again.
```

---

# 26. Timeout Errors

Requests should have reasonable timeouts.

If a request times out:

```text
Request
 ↓
Timeout
 ↓
Determine if operation is safe to retry
```

Never blindly retry sensitive non-idempotent operations.

---

# 27. Retry Policy

Retry only operations that are safe or explicitly designed for retry.

Generally safer:

```text
GET
```

Potentially unsafe without idempotency:

```text
POST payment
POST refund
POST financial transaction
```

---

# 28. Exponential Backoff

Where automatic retries are appropriate:

```text
Retry 1
 ↓
Wait
 ↓
Retry 2
 ↓
Wait Longer
 ↓
Retry 3
```

Use exponential backoff with reasonable limits.

---

# 29. Retry Limits

Never retry indefinitely.

A retry policy must define:

```text
Maximum Attempts
Maximum Delay
Eligible Errors
```

---

# 30. Idempotency

Financial operations should use idempotency mechanisms where appropriate.

Example:

```text
Idempotency-Key
```

This protects against:

```text
Double Click
Timeout + Retry
Network Retry
Duplicate Submission
```

---

# 31. Payment Failure

Payment failures must distinguish between:

```text
Payment Rejected
Payment Provider Error
Payment Pending
Payment Timeout
Unknown Payment State
```

Do not automatically mark an uncertain payment as failed without verifying its actual state.

---

# 32. Unknown Payment State

Example:

```text
ERP → Payment Provider
       ↓
Request Sent
       ↓
Network Timeout
```

The ERP cannot assume:

```text
Payment Failed
```

because the provider may have processed the transaction.

Instead:

```text
Unknown / Pending
 ↓
Reconcile / Query Provider
 ↓
Resolve Final State
```

---

# 33. External Service Failures

External systems may include:

```text
Payment Gateway
SMS Provider
Email Provider
File Storage
Notification Provider
```

The ERP should isolate external failures from unrelated functionality whenever possible.

---

# 34. Graceful Degradation

If the SMS provider is unavailable:

```text
Student Management
Attendance
Fees
Reports
```

should not necessarily become unavailable.

Only the affected capability should degrade where practical.

---

# 35. Notification Failure

If an email/SMS notification fails after a successful business operation:

```text
Core Operation
     ↓
SUCCESS
     ↓
Notification
     ↓
FAILED
```

The core operation should not necessarily be rolled back.

Instead:

```text
Notification Status = Failed
Retry Later
```

when appropriate.

---

# 36. Background Jobs

Long-running operations should use background jobs where appropriate.

Examples:

```text
Bulk Import
Large Export
Report Generation
Mass Notifications
Document Generation
```

---

# 37. Job Failure

A failed job should have a visible state:

```text
Queued
Processing
Completed
Failed
Cancelled
```

The user should not see an indefinite loading state.

---

# 38. Job Retry

Retryable background jobs should use controlled retry policies.

Non-retryable failures should transition to:

```text
Failed
```

with a safe error reason.

---

# 39. Database Errors

Database failures should never expose raw database errors to the user.

Example bad response:

```text
duplicate key value violates unique constraint ...
```

Instead:

```text
This record already exists.
```

with an appropriate machine-readable code.

---

# 40. Transaction Failure

If a transactional operation fails:

```text
BEGIN
 ↓
Operation A
 ↓
Operation B
 ↓
Operation C fails
 ↓
ROLLBACK
```

The system should avoid partial business state.

---

# 41. Example Financial Transaction

```text
Create Payment
 ↓
Allocate Payment
 ↓
Update Fee Balance
 ↓
Create Ledger Entry
 ↓
Commit
```

If a required step fails:

```text
Rollback
```

rather than leaving inconsistent records.

---

# 42. Concurrency Conflicts

Two users may update the same resource simultaneously.

Example:

```text
Teacher A → Updates attendance
Teacher B → Updates same attendance
```

The system needs a defined conflict strategy.

Possible approaches:

```text
Optimistic Concurrency
Database Constraints
Transactions
Version Checks
```

---

# 43. Optimistic Concurrency

A resource may contain a version or update timestamp.

Conceptually:

```text
Version = 7
```

Client submits:

```text
Update if Version = 7
```

If another user already changed it:

```text
Current Version = 8
```

return:

```text
409 Conflict
```

---

# 44. Conflict UX

Example:

```text
This record was updated by someone else.

Refresh the record to see the latest version.
```

Do not silently overwrite another user's changes.

---

# 45. Double Submission

Forms containing mutations must prevent accidental repeated submission.

Use:

```text
Submit Lock
Loading State
Idempotency where required
```

---

# 46. Button State

During a mutation:

```text
Submit
 ↓
Submitting...
```

The button should not allow multiple unintended submissions.

---

# 47. Failed Mutation

If a mutation fails:

```text
Submitting
 ↓
Error
 ↓
Restore Action
```

The user should be able to correct the issue and retry.

---

# 48. Successful Mutation

After success:

```text
Mutation
 ↓
Success
 ↓
Update / Invalidate Relevant Data
 ↓
Success Feedback
```

Do not leave stale information visible indefinitely.

---

# 49. Query Failure

For read operations:

```text
Loading
 ↓
Error
```

show a dedicated error state.

Example:

```text
Unable to load students.

[Retry]
```

---

# 50. Retry Button

Where retrying is safe, provide:

```text
[Retry]
```

Do not automatically retry forever.

---

# 51. Empty vs Error State

Never confuse:

```text
No Students Found
```

with:

```text
Unable to Load Students
```

They represent different states.

---

# 52. Loading vs Error vs Empty

Every major data screen should account for:

```text
Loading
Success + Data
Success + Empty
Error
```

---

# 53. Offline State

If the application supports offline awareness:

```text
Online
Offline
Reconnecting
```

should be represented clearly.

Do not claim a mutation succeeded while offline unless the system explicitly supports offline synchronization.

---

# 54. Offline Mutation

If offline mutations are eventually supported:

```text
User Action
 ↓
Local Queue
 ↓
Pending
 ↓
Connection Restored
 ↓
Sync
 ↓
Server Confirmation
```

This must be a deliberate architecture, not an accidental browser behavior.

---

# 55. Stale Data

If cached data may be stale, the UI should have an appropriate refresh/revalidation mechanism.

Critical financial information should prioritize authoritative server state.

---

# 56. Error Boundaries

Frontend application-level errors should be caught using appropriate error boundaries.

A component failure should not necessarily crash the entire application.

---

# 57. Page-Level Error

If a feature fails:

```text
Students Page
 ↓
Error
```

the user should still be able to navigate to:

```text
Attendance
Fees
Reports
Settings
```

where possible.

---

# 58. Global Error

Unexpected application-level failures should show a safe recovery screen.

Example:

```text
Something went wrong.

[Try Again]
```

---

# 59. Error Logging

Unexpected errors should be logged with:

```text
Request ID
User Context where safe
Tenant Context where safe
Route
Error Code
Timestamp
```

Sensitive information must be excluded.

---

# 60. Error Monitoring

Production monitoring should track:

```text
5xx Rate
4xx Rate
Latency
Timeouts
Failed Jobs
External Provider Failures
Database Failures
```

---

# 61. Alerting

Alerts should focus on actionable problems.

Examples:

```text
Payment failure spike
Database unavailable
API error spike
Notification provider outage
Background jobs failing
```

Avoid alert fatigue.

---

# 62. Security Errors

Security-related failures should be logged carefully.

Examples:

```text
Repeated Failed Login
Repeated Permission Denial
Suspicious Access Pattern
Invalid Webhook
```

Logs must not expose secrets.

---

# 63. Error Correlation

A support workflow should be able to take:

```text
Request ID
```

and locate the corresponding backend logs.

---

# 64. Frontend Error Handling Layer

Use a centralized API error handler.

Conceptually:

```text
API Client
 ↓
Normalize Error
 ↓
Classify
 ↓
Return Typed Error
 ↓
Feature UI
```

---

# 65. Avoid Duplicated Error Logic

Do not implement different interpretations of HTTP errors in every component.

Bad:

```text
Component A → custom 401 handling
Component B → different 401 handling
Component C → different 401 handling
```

Prefer centralized behavior.

---

# 66. Feature-Specific Messages

The global error system handles generic errors.

Feature-specific errors may provide more meaningful messages.

Example:

```text
PAYMENT_ALREADY_REFUNDED
```

should be interpreted by the Payments feature.

---

# 67. Error Recovery Hierarchy

Preferred recovery order:

```text
Automatic Recovery
 ↓
User Retry
 ↓
Alternative Action
 ↓
Support / Admin Intervention
```

---

# 68. Automatic Recovery

Examples:

```text
Refresh Session
Retry Safe GET
Refresh Stale Data
Reconnect
```

---

# 69. User Recovery

Examples:

```text
Retry
Refresh
Correct Form
Select Another Record
Try Again Later
```

---

# 70. Admin Recovery

Some failures require administrative intervention.

Examples:

```text
Locked Account
Failed Import
Broken Integration
Permission Configuration
Tenant Configuration
```

---

# 71. Support Information

When escalation is required, show useful information such as:

```text
Request ID
Time
Feature
```

but do not expose internal stack traces.

---

# 72. Error Accessibility

Error states must be accessible.

Ensure:

```text
Readable Text
Visible Focus
Screen Reader Announcement where appropriate
Clear Field Association
```

---

# 73. Form Submission Error Pattern

Recommended:

```text
User submits
 ↓
Validate
 ↓
API
 ↓
Success?
 ├── Yes → Success State
 └── No
      ↓
   Normalize Error
      ↓
   Field Error / Form Error
```

---

# 74. Global API Error Pattern

```text
Request
 ↓
API
 ↓
Error
 ↓
API Client
 ↓
Normalize
 ↓
Classify
 ↓
Feature / Global Handler
 ↓
UI
```

---

# 75. Error Priority

Errors should be prioritized:

```text
1. Security
2. Data Integrity
3. Financial Integrity
4. User Actionability
5. Observability
```

---

# 76. Never Hide Financial Errors

If a financial operation is uncertain:

```text
DO NOT
```

show:

```text
Payment successful
```

unless authoritative confirmation exists.

---

# 77. Never Silently Swallow Errors

Bad:

```text
try {
   operation()
} catch {
   // ignore
}
```

Important failures must be handled explicitly.

---

# 78. Error State Persistence

Long-running operations should retain their status even if the user navigates away.

Example:

```text
Import Started
 ↓
User Opens Attendance
 ↓
Import Continues
 ↓
Import Completed
```

---

# 79. Bulk Import Errors

For imports, provide actionable feedback.

Example:

```text
Import completed with errors.

48 records imported.
3 records failed.

Download error report.
```

---

# 80. Import Validation

Validate before committing where possible.

For large imports:

```text
Upload
 ↓
Parse
 ↓
Validate
 ↓
Preview Errors
 ↓
Confirm
 ↓
Import
```

---

# 81. Report Generation Errors

If a report fails:

```text
Report generation failed.
Please try again.
```

If the failure is persistent, provide an escalation path.

---

# 82. API Resilience Checklist

```text
☐ Validation
☐ Standard Error Format
☐ Error Codes
☐ Request IDs
☐ Authentication Handling
☐ Authorization Handling
☐ Rate Limiting
☐ Timeout Handling
☐ Retry Policy
☐ Idempotency
☐ Transaction Safety
☐ Concurrency Handling
☐ External Service Isolation
☐ Background Job Recovery
☐ Logging
☐ Monitoring
```

---

# 83. Frontend Resilience Checklist

```text
☐ Loading States
☐ Empty States
☐ Error States
☐ Retry Actions
☐ Session Expiry Handling
☐ Double Submit Protection
☐ Field-Level Validation
☐ Mutation Recovery
☐ Query Recovery
☐ Offline Awareness where applicable
☐ Error Boundaries
☐ Accessible Error Messaging
```

---

# 84. Critical Financial Resilience Checklist

```text
☐ Idempotency
☐ Transactional Updates
☐ Provider Verification
☐ Unknown Payment State
☐ Duplicate Prevention
☐ Refund State Validation
☐ Audit Trail
☐ Reconciliation
☐ Safe Retry Rules
```

---

# 85. Final Principle

> **Errors are part of the normal product experience, not exceptional UI states. Every failure must be classified, safely communicated, logged where appropriate, and recoverable whenever possible. Validation protects data, authorization protects access, transactions protect integrity, idempotency protects against duplication, and resilient UX ensures that a temporary failure does not become a broken application experience.**

---

# 86. Next Document

```text
41-DATABASE-ARCHITECTURE-AND-DATA-INTEGRITY.md
```

This document will define:

```text
Database Architecture
Tenant Data Isolation
Core Entities
Relationships
Primary Keys
Foreign Keys
Indexes
Constraints
Transactions
Soft Delete
Audit Fields
Data Lifecycle
Referential Integrity
Concurrency
Migrations
Seed Data
Backup Considerations
Data Retention
```

---

# END OF DOCUMENT
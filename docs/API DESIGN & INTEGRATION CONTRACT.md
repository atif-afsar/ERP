# API DESIGN & INTEGRATION CONTRACT
# School + Coaching Centre ERP SaaS

**Document:** `34-API-DESIGN-AND-INTEGRATION-CONTRACT.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `33-PERFORMANCE-AND-SCALABILITY.md`  
**Next Document:** `35-DATA-MODEL-AND-DATABASE-CONTRACT.md`

---

# 1. Purpose

This document defines the API standards for the ERP.

The API is the contract between:

```text
Frontend
Mobile Applications
Backend Services
External Integrations
Third-Party Systems
```

The API must be predictable, secure, versioned, tenant-aware, and consistent.

---

# 2. API Architecture

The default architecture should follow:

```text
Client
  ↓
API Gateway / Application
  ↓
Authentication
  ↓
Authorization
  ↓
Validation
  ↓
Controller / Route
  ↓
Service Layer
  ↓
Repository / Data Layer
  ↓
Database
```

Controllers should not contain large amounts of business logic.

---

# 3. API Style

The primary API style should be REST-oriented unless a specific module has a documented reason to use another protocol.

Use standard HTTP semantics.

Common methods:

```text
GET
POST
PUT
PATCH
DELETE
```

---

# 4. Base URL

The API should have a clearly defined base path.

Conceptually:

```text
/api/v1/
```

The exact production hostname belongs to the deployment configuration.

---

# 5. API Versioning

APIs should be versioned to prevent breaking existing clients.

Example:

```text
/api/v1/students
```

Future breaking changes may introduce:

```text
/api/v2/students
```

---

# 6. Resource-Oriented URLs

Use nouns rather than action-heavy URLs.

Preferred:

```text
GET /students
GET /students/{id}
POST /students
PATCH /students/{id}
DELETE /students/{id}
```

Avoid unnecessary patterns such as:

```text
POST /getStudents
POST /createStudent
```

---

# 7. Nested Resources

Use nested resources only when the relationship is clear and useful.

Example:

```text
GET /students/{student_id}/attendance
```

Do not create deeply nested URLs that become difficult to use.

---

# 8. Authentication

Protected APIs must require authentication.

Conceptually:

```text
Client
 ↓
Credentials / Session
 ↓
Authentication
 ↓
Authenticated Identity
```

---

# 9. Authorization

Authentication answers:

```text
Who are you?
```

Authorization answers:

```text
What are you allowed to do?
```

Both must be enforced.

---

# 10. Tenant Context

Every tenant-scoped API request must resolve tenant context securely.

The client must not be trusted to arbitrarily select another tenant.

---

# 11. Tenant Isolation

The server must ensure:

```text
Authenticated User
        ↓
Authorized Tenant
        ↓
Tenant-Scoped Resource
```

A request must never bypass tenant scoping by modifying an ID or query parameter.

---

# 12. Branch Context

Where branch-level permissions exist:

```text
User
 ↓
Tenant
 ↓
Allowed Branch
 ↓
Resource
```

must be validated server-side.

---

# 13. Request Headers

Use standard headers.

Examples:

```text
Authorization
Content-Type
Accept
Idempotency-Key
```

when applicable.

---

# 14. Request IDs

Every API request should have a traceable request identifier.

Conceptually:

```text
X-Request-ID: <request-id>
```

The exact header name should remain consistent throughout the platform.

Request IDs should also connect API logs with background jobs and integrations where practical.

---

# 15. JSON

JSON should be the default representation for normal API requests and responses unless a specific endpoint requires another format.

---

# 16. Content Type

JSON requests should use:

```text
Content-Type: application/json
```

---

# 17. Response Structure

Responses should follow a consistent structure.

Example:

```text
{
  "data": {...},
  "meta": {...}
}
```

The exact canonical envelope should be finalized consistently across the application.

---

# 18. Collection Response

Example:

```text
{
  "data": [
    {...},
    {...}
  ],
  "meta": {
    "page": 1,
    "page_size": 50,
    "total": 240
  }
}
```

---

# 19. Single Resource Response

Example:

```text
{
  "data": {
    "id": "...",
    "name": "..."
  }
}
```

---

# 20. Error Response

Errors should use a consistent structure.

Example:

```text
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {...},
    "request_id": "..."
  }
}
```

---

# 21. Error Codes

Error codes should be machine-readable.

Examples:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

---

# 22. HTTP Status Codes

Use appropriate HTTP semantics.

Common statuses:

```text
200 OK
201 Created
202 Accepted
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

The project should use one consistent convention for validation errors.

---

# 23. Authentication Failure

If authentication is missing or invalid:

```text
401 Unauthorized
```

---

# 24. Authorization Failure

If the user is authenticated but lacks permission:

```text
403 Forbidden
```

---

# 25. Resource Not Found

If a resource does not exist or should not be exposed to the caller:

```text
404 Not Found
```

Care should be taken not to leak information about resources from another tenant.

---

# 26. Conflict

Use conflict responses for state conflicts.

Examples:

```text
Duplicate Admission Number
Concurrent Update
Duplicate Payment Reference
```

---

# 27. Validation

Validate all user-controlled input on the server.

Never rely solely on frontend validation.

---

# 28. Validation Layers

Use:

```text
Frontend Validation
        ↓
API Validation
        ↓
Business Validation
        ↓
Database Constraints
```

Each layer serves a different purpose.

---

# 29. Required Fields

Required fields must be explicitly validated.

---

# 30. Data Types

Validate:

```text
String
Number
Boolean
Date
DateTime
Enum
Array
Object
```

---

# 31. String Validation

Where applicable validate:

```text
Length
Format
Allowed Characters
Whitespace
```

---

# 32. Numeric Validation

Validate:

```text
Minimum
Maximum
Integer / Decimal
Precision
```

Especially important for:

```text
Fees
Payments
Marks
Percentages
Counts
```

---

# 33. Enum Validation

Fields with predefined states should reject unsupported values.

Example:

```text
attendance_status:
present
absent
late
excused
```

Only values defined by the domain model should be accepted.

---

# 34. Date Validation

Validate:

```text
Format
Timezone
Allowed Range
Business Rules
```

---

# 35. Pagination

Collection endpoints should support pagination.

Example:

```text
GET /students?page=1&page_size=50
```

---

# 36. Pagination Limits

The server should enforce a maximum page size.

Never allow:

```text
?page_size=1000000
```

to trigger an unbounded query.

---

# 37. Sorting

Collections may support sorting.

Example:

```text
GET /students?sort=name
```

Descending:

```text
GET /students?sort=-created_at
```

The exact syntax should remain consistent across APIs.

---

# 38. Allowed Sort Fields

The server should whitelist sortable fields.

Never directly interpolate arbitrary client-provided sort expressions into database queries.

---

# 39. Filtering

Use explicit supported filters.

Example:

```text
GET /students?status=active
```

---

# 40. Search

Search parameters should be bounded and optimized.

Example:

```text
GET /students?search=atif
```

---

# 41. Field Selection

Where beneficial, APIs may allow limited field selection.

Example:

```text
GET /students?fields=id,name,class
```

Only explicitly supported fields should be exposed.

---

# 42. Include / Expand

If related resources need to be returned, use a controlled mechanism rather than automatically returning all relationships.

Example:

```text
?include=parent
```

---

# 43. Avoid Oversized Responses

Do not return:

```text
Student
+
Entire Attendance History
+
Entire Payment History
+
Entire Exam History
+
All Documents
```

unless explicitly requested.

---

# 44. Student API

Conceptual endpoints:

```text
GET    /students
POST   /students
GET    /students/{id}
PATCH  /students/{id}
DELETE /students/{id}
```

---

# 45. Student Attendance API

Conceptual endpoints:

```text
GET  /students/{id}/attendance
POST /attendance
PATCH /attendance/{id}
```

Actual endpoint design should follow the canonical module specification.

---

# 46. Fees API

Conceptual:

```text
GET  /students/{id}/fees
POST /fees/payments
GET  /payments/{id}
```

---

# 47. Exam API

Conceptual:

```text
GET  /exams
POST /exams
GET  /exams/{id}
PATCH /exams/{id}
```

Marks:

```text
POST /exams/{id}/marks
PATCH /exam-marks/{id}
```

---

# 48. User API

Conceptual:

```text
GET   /users
POST  /users
GET   /users/{id}
PATCH /users/{id}
```

User management must enforce role and tenant permissions.

---

# 49. Role API

If role management is exposed:

```text
GET   /roles
POST  /roles
PATCH /roles/{id}
```

System roles should not be modifiable unless explicitly supported.

---

# 50. Bulk APIs

Bulk operations should be explicitly identified.

Example:

```text
POST /attendance/bulk
POST /students/import
POST /marks/bulk
```

---

# 51. Bulk Request Limits

Bulk APIs must enforce:

```text
Maximum Records
Maximum Payload Size
Timeout
Authorization
```

---

# 52. Bulk Validation

Bulk operations should report row-level errors where practical.

Example:

```text
Row 1 → Success
Row 2 → Invalid phone
Row 3 → Duplicate admission number
```

---

# 53. Idempotency

Operations that may be retried should support idempotency where business correctness requires it.

Especially:

```text
Payments
External Webhooks
Critical Commands
```

---

# 54. Idempotency-Key

Conceptually:

```text
Idempotency-Key: abc-123
```

The server should ensure repeated processing of the same idempotency key does not create duplicate business effects.

---

# 55. Idempotency Storage

Idempotency records should persist long enough to protect against realistic retry windows.

The exact retention period belongs to the implementation configuration.

---

# 56. PATCH vs PUT

Use:

```text
PATCH
```

for partial updates when appropriate.

Example:

```text
PATCH /students/123
```

with:

```text
{
  "phone": "..."
}
```

---

# 57. DELETE

Deletion must respect business rules.

Some ERP entities may require:

```text
Soft Delete
Archive
Deactivate
```

rather than permanent deletion.

---

# 58. Soft Delete

Where used:

```text
deleted_at
```

or an equivalent state should be consistently handled.

Deleted records must not accidentally appear in normal queries.

---

# 59. Auditability

Important API operations should create audit events where required.

Examples:

```text
Create Student
Update Student
Delete Student
Record Payment
Change Permission
Publish Result
```

---

# 60. API Authorization Matrix

Each endpoint must define:

```text
Authentication Required?
Role Allowed?
Tenant Scope?
Branch Scope?
Resource Ownership?
```

Example:

```text
POST /payments
→ Accountant/Admin
→ Tenant Scoped
```

The actual permissions must follow the canonical RBAC specification.

---

# 61. Parent API Restrictions

Parent-facing APIs must expose only authorized children and related data.

---

# 62. Student API Restrictions

Student-facing APIs must expose only the student's permitted information.

---

# 63. Teacher API Restrictions

Teachers should only access resources permitted by their assignments and role.

---

# 64. Accountant API Restrictions

Financial endpoints must be restricted to authorized roles.

---

# 65. Admin API Restrictions

Administrative APIs should require appropriate administrative privileges.

---

# 66. Super Admin

Platform-level operations must be separated from tenant-level operations.

A tenant admin must not gain platform-level privileges simply by manipulating a request.

---

# 67. File APIs

File endpoints must validate:

```text
Ownership
Tenant
File Type
Size
Permissions
```

---

# 68. Signed File URLs

Private files may be served using temporary signed URLs or an equivalent access-controlled mechanism.

The URLs must expire.

---

# 69. API Rate Limits

Rate limits should be applied based on risk and workload.

Potential categories:

```text
Authentication
Public APIs
Authenticated APIs
Bulk APIs
Exports
Integrations
```

---

# 70. Rate-Limit Response

When a limit is exceeded:

```text
429 Too Many Requests
```

The response may provide retry guidance where appropriate.

---

# 71. API Timeouts

Every API request should have bounded execution time.

Long-running tasks should move to background processing.

---

# 72. Async API Pattern

Example:

```text
POST /reports/export
        ↓
202 Accepted
        ↓
{
  "job_id": "..."
}
```

Then:

```text
GET /jobs/{id}
```

can provide status.

---

# 73. Job Status

Possible states:

```text
queued
processing
completed
failed
cancelled
```

---

# 74. Webhooks

Incoming webhooks must validate:

```text
Signature
Timestamp
Event Type
Payload
Idempotency
```

---

# 75. Webhook Processing

Do not perform expensive processing directly inside the webhook request.

Preferred:

```text
Webhook
 ↓
Validate
 ↓
Persist Event
 ↓
Queue Job
 ↓
Return Success
 ↓
Process Asynchronously
```

---

# 76. Webhook Replay Protection

Protect against replayed webhook requests using:

```text
Event ID
Idempotency Key
Timestamp
Signature
```

as supported by the provider.

---

# 77. Outgoing Webhooks

If the ERP exposes webhooks to external systems, define:

```text
Event Name
Payload
Signature
Retry Policy
Delivery Status
```

---

# 78. Webhook Retry

Retry only transient failures.

Use bounded exponential backoff.

---

# 79. Dead Letter Handling

Events that repeatedly fail should move into a recoverable failure state rather than retry forever.

---

# 80. External Integrations

Integrations may include:

```text
Payment Providers
Email Providers
SMS Providers
WhatsApp Providers
Cloud Storage
Accounting Systems
Identity Providers
```

Only enabled integrations should be invoked.

---

# 81. Integration Adapter Pattern

External providers should be abstracted behind adapters.

Conceptually:

```text
ERP
 ↓
Payment Interface
 ↓
Provider Adapter
 ↓
Provider
```

This avoids spreading provider-specific logic throughout the ERP.

---

# 82. Provider Failure

External failure should not corrupt internal business data.

Example:

```text
Payment Provider Failure
 ↓
Payment State = Failed / Pending
 ↓
Internal Data Remains Consistent
```

---

# 83. Secrets

API credentials must never be hard-coded.

Store secrets in secure configuration/secrets management.

---

# 84. Sensitive Data

Never log:

```text
Passwords
Authentication Tokens
Payment Secrets
Private Keys
Sensitive Personal Data
```

---

# 85. API Logging

Log enough information to troubleshoot:

```text
Request ID
Endpoint
Method
Status
Latency
Tenant Context where safe
User Context where safe
```

Avoid logging full sensitive payloads by default.

---

# 86. API Metrics

Track:

```text
Request Count
Latency
Error Rate
Status Codes
Endpoint Usage
Tenant Usage
```

---

# 87. API Tracing

Important requests should be traceable across:

```text
API
 ↓
Service
 ↓
Database
 ↓
Queue
 ↓
Worker
 ↓
External Provider
```

where observability infrastructure supports it.

---

# 88. Backward Compatibility

Non-breaking API changes should preserve existing clients.

Examples:

```text
Adding Optional Field
Adding Optional Endpoint
Adding New Filter
```

Breaking changes should require versioning or an explicitly documented migration strategy.

---

# 89. Breaking Changes

Examples:

```text
Removing Field
Changing Field Type
Changing Meaning
Changing Required Behavior
Changing Authentication Contract
```

must be treated as breaking changes.

---

# 90. API Deprecation

Deprecated endpoints should have:

```text
Deprecation Notice
Migration Documentation
Replacement Endpoint
Sunset Plan
```

where appropriate.

---

# 91. API Documentation

Every public/internal integration API should document:

```text
Endpoint
Method
Authentication
Permissions
Request
Response
Errors
Examples
Rate Limits
Pagination
```

---

# 92. OpenAPI

Where practical, maintain an OpenAPI specification as the machine-readable API contract.

The specification should be kept synchronized with implementation.

---

# 93. API Testing

Each API should have tests for:

```text
Success
Validation
Authentication
Authorization
Tenant Isolation
Not Found
Conflict
Rate Limit
External Failure
```

---

# 94. Contract Testing

Client/server contracts should be tested to prevent accidental breaking changes.

---

# 95. API Security Checklist

```text
☐ Authentication enforced
☐ Authorization enforced
☐ Tenant scope enforced
☐ Branch scope enforced where required
☐ Input validated
☐ Output filtered
☐ Rate limits configured
☐ Sensitive data protected
☐ IDOR tested
☐ Injection tested
☐ File uploads secured
☐ Audit events implemented
```

---

# 96. API Performance Checklist

```text
☐ Pagination
☐ Efficient queries
☐ No N+1 queries
☐ Payload limits
☐ Timeouts
☐ Caching where appropriate
☐ Async processing for heavy jobs
☐ Bulk operations optimized
```

---

# 97. API Implementation Rule

Do not create an endpoint merely because it is convenient for the frontend.

Every endpoint should represent a meaningful business capability or resource operation.

---

# 98. Service Layer Rule

Business rules belong in services/domain logic rather than being duplicated across controllers.

Example:

```text
Controller
 ↓
PaymentService
 ↓
Validate
 ↓
Calculate
 ↓
Persist
 ↓
Audit
 ↓
Return
```

---

# 99. Database Rule

API code should not bypass tenant and authorization rules simply because direct database access is convenient.

---

# 100. Frontend Rule

The frontend must treat the API as an untrusted boundary.

It must correctly handle:

```text
401
403
404
409
422
429
500
```

---

# 101. API Definition of Done

An API endpoint is complete when:

```text
☐ Route Defined
☐ Request Schema Defined
☐ Response Schema Defined
☐ Validation Implemented
☐ Authentication Implemented
☐ Authorization Implemented
☐ Tenant Isolation Verified
☐ Error Contract Implemented
☐ Pagination Added if Collection
☐ Rate Limit Considered
☐ Tests Added
☐ Documentation Added
```

---

# 102. Example Complete Flow

```text
Frontend
   |
   | POST /api/v1/payments
   ↓
Authentication
   |
   ↓
Authorization
   |
   ↓
Tenant Resolution
   |
   ↓
Validation
   |
   ↓
Payment Service
   |
   +----> Database Transaction
   |
   +----> Audit Event
   |
   +----> Notification Job
   |
   ↓
Response
   |
   ↓
Frontend
```

---

# 103. Final API Principle

> **The API is a strict contract, not merely a collection of backend routes. Every request must be authenticated and authorized where required, tenant and branch boundaries must be enforced server-side, input must be validated, responses and errors must remain consistent, large operations must be asynchronous, critical operations must support idempotency where necessary, integrations must be isolated behind adapters, and all important APIs must be documented and tested.**

---

# 104. Next Document

```text
35-DATA-MODEL-AND-DATABASE-CONTRACT.md
```

This document will define:

```text
Database Architecture
Core Entities
Relationships
Tenant Model
Branch Model
User Model
Student Model
Parent Model
Teacher Model
Academic Model
Attendance Model
Fee Model
Payment Model
Exam Model
Notification Model
Audit Model
Indexes
Constraints
Soft Deletes
Data Integrity
Database Conventions
Migration Rules
```

---

# END OF DOCUMENT
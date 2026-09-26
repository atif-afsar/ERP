# API ARCHITECTURE & SERVICE CONTRACTS
# School + Coaching Centre ERP SaaS

**Document:** `39-API-ARCHITECTURE-AND-SERVICE-CONTRACTS.md`  
**Version:** 1.0  
**Status:** Canonical API Specification  
**Previous Document:** `38-AUTHENTICATION-AND-AUTHORIZATION-FLOW.md`  
**Next Document:** `40-API-ERROR-HANDLING-VALIDATION-AND-RESILIENCE.md`

---

# 1. Purpose

This document defines the contract between the frontend and backend.

The API architecture must provide:

```text
Consistency
Predictability
Security
Validation
Tenant Isolation
Branch Isolation
Type Safety
Error Handling
Scalability
```

The frontend must never need to guess how an endpoint behaves.

---

# 2. Core Principle

The API is the formal contract between:

```text
Frontend
    ↓
API
    ↓
Backend Services
    ↓
Database / External Services
```

Every important request and response must have a defined structure.

---

# 3. API Architecture

Conceptually:

```text
Client
  ↓
API Layer
  ↓
Authentication
  ↓
Authorization
  ↓
Validation
  ↓
Business Logic
  ↓
Persistence / Services
```

---

# 4. API Versioning

The API should be versioned from the beginning.

Recommended conceptual structure:

```text
/api/v1/...
```

Example:

```text
/api/v1/students
/api/v1/payments
/api/v1/attendance
```

The exact implementation may follow the backend framework.

---

# 5. Versioning Principle

Breaking API changes should not silently change the behavior of an existing version.

Example:

```text
v1
```

must remain stable while:

```text
v2
```

introduces incompatible changes.

---

# 6. HTTP Methods

Use HTTP methods according to their semantic purpose.

```text
GET
→ Retrieve

POST
→ Create / Trigger an operation

PATCH
→ Partial Update

PUT
→ Full Replacement where appropriate

DELETE
→ Delete where genuinely supported
```

---

# 7. Resource-Oriented URLs

Prefer:

```text
GET /api/v1/students
GET /api/v1/students/:id
POST /api/v1/students
PATCH /api/v1/students/:id
```

Avoid inconsistent RPC-like naming for ordinary CRUD operations.

---

# 8. Collection Endpoints

Collection:

```text
GET /api/v1/students
```

Individual resource:

```text
GET /api/v1/students/:studentId
```

---

# 9. Create Resource

Example:

```text
POST /api/v1/students
```

Request:

```text
{
  "firstName": "Atif",
  "lastName": "Afsar",
  "..."
}
```

The exact fields must follow the canonical data model.

---

# 10. Update Resource

Example:

```text
PATCH /api/v1/students/:studentId
```

Only permitted fields should be accepted.

The backend must validate:

```text
Authentication
Tenant
Branch
Permission
Input
Business Rules
```

---

# 11. Delete / Archive

The application should prefer explicit lifecycle operations where the business model requires historical preservation.

Examples:

```text
POST /students/:id/archive
POST /students/:id/restore
```

rather than physically deleting important historical records.

---

# 12. Action Endpoints

For domain-specific operations, use explicit actions.

Examples:

```text
POST /payments/:id/void
POST /payments/:id/refund
POST /exams/:id/publish
POST /students/:id/archive
```

These operations should have dedicated authorization rules.

---

# 13. Authentication Context

Authenticated requests should derive the current user from the trusted authentication/session mechanism.

Do not require the frontend to send:

```text
userId
role
permissions
```

as a source of truth.

---

# 14. Tenant Context

Tenant context must be validated server-side.

The backend must ensure that requested resources belong to the user's authorized tenant.

---

# 15. Branch Context

Where branch-level access exists, the API must validate branch access independently.

Example:

```text
User
 ↓
Tenant Membership
 ↓
Branch Permission
 ↓
Requested Resource
```

---

# 16. Never Trust Tenant IDs

A malicious client must not gain access to another tenant simply by changing:

```text
tenantId
```

in a request.

The backend must derive/validate tenant scope from trusted authentication context and authorization rules.

---

# 17. Request Validation

Every API input must be validated server-side.

Validation applies to:

```text
Body
Path Parameters
Query Parameters
Headers where relevant
```

---

# 18. Validation Responsibility

Frontend validation improves UX.

Backend validation protects the system.

Therefore:

```text
Frontend Validation
+
Backend Validation
```

are both required.

---

# 19. Request Schema

Every important endpoint should have a defined request schema.

Example:

```text
CreateStudentRequest
UpdateStudentRequest
CreatePaymentRequest
MarkAttendanceRequest
CreateExamRequest
```

---

# 20. Response Schema

Every important endpoint should have a defined response schema.

Example:

```text
StudentResponse
PaymentResponse
AttendanceResponse
ExamResponse
```

---

# 21. Consistent Response Structure

Where appropriate, use a predictable response structure.

Example:

```text
{
  "data": {...}
}
```

For collections:

```text
{
  "data": [...],
  "meta": {...}
}
```

The implementation should use one consistent convention across the application.

---

# 22. Resource Representation

A resource response should contain the fields required by the consuming screen without exposing unnecessary sensitive information.

---

# 23. Sensitive Fields

Never return sensitive fields merely because they exist in the database.

Examples include:

```text
Password Hash
Authentication Secrets
Private Tokens
Internal Security Metadata
```

---

# 24. DTO / Response Mapping

Do not blindly serialize database entities directly into API responses.

Prefer explicit response mapping.

Conceptually:

```text
Database Model
 ↓
Service / Mapper
 ↓
API DTO
 ↓
Client
```

---

# 25. Pagination

Large collections should support pagination.

Example:

```text
GET /api/v1/students?page=2&pageSize=25
```

The exact pagination strategy may be:

```text
Offset
Cursor
```

depending on the dataset and backend architecture.

---

# 26. Pagination Response

Example:

```text
{
  "data": [...],
  "meta": {
    "page": 2,
    "pageSize": 25,
    "total": 248
  }
}
```

If cursor pagination is used, return cursor metadata instead.

---

# 27. Default Page Size

Endpoints should have sensible server-side defaults.

Never allow an unbounded request such as:

```text
?pageSize=999999999
```

to overload the system.

---

# 28. Maximum Page Size

The backend should enforce a maximum page size.

---

# 29. Sorting

Collection endpoints may support controlled sorting.

Example:

```text
GET /students?sortBy=createdAt&sortOrder=desc
```

Only whitelisted sortable fields should be accepted.

---

# 30. Filtering

Filtering should use predictable query parameters.

Example:

```text
GET /students?status=active
```

Multiple filters may be combined according to the API convention.

---

# 31. Search

Search endpoints should support controlled search parameters.

Example:

```text
GET /students?search=atif
```

Search implementation must protect against:

```text
SQL Injection
Excessive Query Cost
Unbounded Searches
```

---

# 32. Search Performance

For large datasets, search should use appropriate indexes and database strategies.

Do not rely on expensive full-table scans for every request.

---

# 33. Date Filters

Use an unambiguous date/time representation in API requests.

Example:

```text
startDate
endDate
```

or an established ISO-compatible representation.

---

# 34. Timezone

The backend and frontend must follow the canonical timezone strategy.

Do not assume the user's browser timezone is always the business timezone.

---

# 35. Currency

Financial APIs should represent monetary values consistently.

Avoid ambiguous representations such as:

```text
"5000"
```

without an established currency/amount convention.

---

# 36. Money Precision

Financial values must avoid floating-point precision problems.

Use the canonical monetary representation defined by the backend.

---

# 37. Payment Creation

Example conceptual endpoint:

```text
POST /api/v1/payments
```

Flow:

```text
Request
 ↓
Authentication
 ↓
Tenant Validation
 ↓
Permission Check
 ↓
Input Validation
 ↓
Fee / Student Validation
 ↓
Transaction
 ↓
Payment Created
 ↓
Response
```

---

# 38. Payment Idempotency

Financial creation operations should support idempotency where appropriate.

Example:

```text
Idempotency-Key: unique-request-id
```

If the same request is accidentally submitted twice, the backend should avoid creating duplicate financial records.

---

# 39. Idempotency

Idempotency is particularly important for:

```text
Payments
Refunds
Fee Transactions
External Payment Calls
Other Financial Operations
```

---

# 40. Attendance API

Conceptual:

```text
POST /api/v1/attendance
```

or a bulk attendance endpoint.

A bulk request may contain:

```text
{
  "date": "...",
  "classId": "...",
  "records": [...]
}
```

The final schema must follow the attendance data contract.

---

# 41. Bulk Operations

ERP workflows frequently require bulk operations.

Examples:

```text
Bulk Attendance
Bulk Student Import
Bulk Marks Entry
Bulk Notifications
Bulk Status Updates
```

Bulk endpoints must validate every item.

---

# 42. Bulk Operation Response

A bulk operation may need to return:

```text
Successful Records
Failed Records
Validation Errors
```

Example conceptually:

```text
{
  "processed": 48,
  "successful": 45,
  "failed": 3,
  "errors": [...]
}
```

---

# 43. Partial Failure

The API contract must explicitly define whether a bulk operation is:

```text
Atomic
```

or:

```text
Partially Successful
```

Do not leave this ambiguous.

---

# 44. Transactions

Operations affecting multiple related records should use database transactions where atomicity is required.

Example:

```text
Payment
 ↓
Fee Allocation
 ↓
Ledger Entry
```

These should not leave the system in an inconsistent state if one required step fails.

---

# 45. Business Logic

Business rules should live in the backend service/domain layer rather than inside route handlers.

Conceptually:

```text
Controller
 ↓
Service
 ↓
Domain Logic
 ↓
Repository / Database
```

---

# 46. Thin Controllers

Controllers/routes should primarily handle:

```text
Request Parsing
Authentication Context
Validation
Service Invocation
Response Formatting
```

They should not contain huge blocks of business logic.

---

# 47. Service Layer

Services should contain domain operations.

Examples:

```text
StudentService
AttendanceService
FeeService
PaymentService
ExamService
NotificationService
```

---

# 48. Repository / Data Access Layer

Database access should be isolated from API transport logic.

Conceptually:

```text
API
 ↓
Service
 ↓
Repository
 ↓
Database
```

---

# 49. External Services

External providers should be isolated behind service adapters.

Examples:

```text
Payment Provider
Email Provider
SMS Provider
Storage Provider
```

The core application should not become tightly coupled to one external implementation.

---

# 50. API Authentication

Every protected endpoint must validate authentication.

Public endpoints should be explicitly marked as public.

Do not rely on accidental exposure.

---

# 51. Authorization

Every protected endpoint must evaluate:

```text
User
Tenant
Branch where applicable
Permission
Resource Scope
Business Rules
```

---

# 52. Resource Authorization

For:

```text
GET /students/:id
```

the backend must verify that:

```text
Student belongs to authorized tenant
AND
User has required permission
AND
Student is within allowed scope
```

---

# 53. Error Status Codes

Use HTTP status codes consistently.

Typical:

```text
200 OK
201 Created
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

The exact use must remain consistent across endpoints.

---

# 54. 400 Bad Request

Use when the request structure itself is invalid where appropriate.

---

# 55. 401 Unauthorized

Use when the request lacks valid authentication.

Examples:

```text
Missing Session
Expired Session
Invalid Authentication
```

---

# 56. 403 Forbidden

Use when the user is authenticated but lacks authorization.

---

# 57. 404 Not Found

Use when a resource does not exist or should not be revealed as accessible.

---

# 58. 409 Conflict

Use for state conflicts.

Examples:

```text
Duplicate Admission ID
Duplicate Payment Operation
Conflicting State Transition
```

---

# 59. 422 Validation Error

Where the API convention supports it, use 422 for semantically invalid input.

Example:

```text
Fee amount cannot be negative.
```

---

# 60. 429 Rate Limited

Use when request rate exceeds the permitted threshold.

The response should communicate retry behavior where appropriate.

---

# 61. 500 Internal Error

Unexpected server failures should return a generic client-safe message.

Never expose:

```text
Stack Traces
Database Errors
Secrets
Internal File Paths
```

to normal clients.

---

# 62. Error Response Format

Use a consistent error structure.

Example:

```text
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student not found.",
    "details": null,
    "requestId": "..."
  }
}
```

The exact field names should remain consistent across the API.

---

# 63. Machine-Readable Error Codes

Clients should be able to distinguish errors using stable codes.

Example:

```text
STUDENT_NOT_FOUND
PAYMENT_FAILED
PERMISSION_DENIED
VALIDATION_ERROR
SESSION_EXPIRED
```

---

# 64. Human-Readable Messages

Error messages should be safe and understandable.

Do not expose internal implementation details.

---

# 65. Request ID

Every API request should have a trace/request identifier where practical.

This helps connect:

```text
Frontend Error
 ↓
API Request
 ↓
Backend Log
```

---

# 66. Logging

Backend logs should include enough context to debug failures.

Do not log:

```text
Passwords
Authentication Secrets
Sensitive Payment Data
```

unless there is a specifically approved secure mechanism.

---

# 67. API Observability

Important metrics include:

```text
Request Count
Latency
Error Rate
Status Codes
Slow Endpoints
External Provider Failures
```

---

# 68. Health Endpoints

The backend may expose health endpoints such as:

```text
/health
```

and deeper readiness checks where required.

Do not expose sensitive infrastructure details publicly.

---

# 69. Database Health

Readiness checks may verify critical dependencies such as:

```text
Database
Cache
Required External Services
```

depending on deployment architecture.

---

# 70. API Timeouts

External calls should have defined timeouts.

Never allow a provider failure to hang an API request indefinitely.

---

# 71. Retry Strategy

Retries should only happen where safe.

Avoid blindly retrying non-idempotent financial operations.

---

# 72. External Payment Provider

Conceptually:

```text
ERP
 ↓
Payment Service
 ↓
Provider
 ↓
Provider Response
 ↓
ERP Transaction
```

Provider failures must be handled explicitly.

---

# 73. Webhooks

External providers may notify the ERP through webhooks.

Webhook endpoints must:

```text
Authenticate / Verify Signature
Validate Payload
Prevent Replay
Be Idempotent
Process Safely
```

---

# 74. Webhook Idempotency

The same webhook may arrive more than once.

The backend must recognize already-processed events.

---

# 75. File Upload API

File uploads should use dedicated endpoints or signed-upload flows where appropriate.

Examples:

```text
POST /api/v1/files
```

or:

```text
POST /api/v1/uploads/presign
```

followed by direct storage upload.

---

# 76. File Validation

Uploaded files must be validated for:

```text
Type
Size
Extension
Content
Access Permission
```

where relevant.

Never trust a filename extension alone.

---

# 77. File Access

Private documents must not be publicly accessible simply because the URL is known.

---

# 78. API Caching

Caching may be used for safe read-heavy resources.

Do not cache sensitive tenant-specific data in a way that allows cross-tenant leakage.

---

# 79. Cache Keys

Tenant and branch context must be considered when required.

Conceptually:

```text
tenant:{tenantId}:branch:{branchId}:students
```

where the architecture uses cache keys.

---

# 80. API Rate Limiting

Rate limiting should be applied especially to:

```text
Authentication
Password Reset
OTP
Public APIs
Expensive Reports
Bulk Operations
```

---

# 81. Query Limits

Prevent clients from creating unnecessarily expensive database queries through:

```text
Huge Page Sizes
Unbounded Sorting
Unrestricted Filters
Expensive Search
```

---

# 82. Report APIs

Reports may be expensive.

For large reports:

```text
Request Report
 ↓
Create Job
 ↓
Process Asynchronously
 ↓
Generate File
 ↓
Notify User
 ↓
Download
```

may be preferable to keeping an HTTP request open.

---

# 83. Export APIs

Example:

```text
POST /api/v1/exports/students
```

could return:

```text
{
  "jobId": "..."
}
```

The client can then check job status.

---

# 84. Async Job Status

Conceptually:

```text
GET /api/v1/jobs/:jobId
```

Response:

```text
{
  "status": "processing"
}
```

or:

```text
{
  "status": "completed",
  "downloadUrl": "..."
}
```

Private download URLs must be securely controlled.

---

# 85. API Contracts Must Be Typed

Where the technology stack supports it, request and response schemas should generate or share types between:

```text
Frontend
Backend
```

to reduce contract drift.

---

# 86. Contract Drift

Avoid situations where:

```text
Backend
→ returns student_name

Frontend
→ expects studentName
```

without an explicit mapping/contract.

---

# 87. Breaking Changes

Before changing a response or request contract, determine whether existing clients depend on it.

Breaking changes should be versioned or migrated safely.

---

# 88. Deprecation

Deprecated endpoints should have a documented migration path.

Example:

```text
v1 endpoint
 ↓
Deprecated
 ↓
Migration period
 ↓
v2 replacement
```

---

# 89. API Documentation

Every public/internal API endpoint should be documented sufficiently for frontend developers.

Documentation should include:

```text
Method
Path
Authentication
Permission
Request
Response
Errors
Pagination
Examples
```

---

# 90. Endpoint Documentation Example

Conceptually:

```text
GET /api/v1/students

Permission:
students.view

Query:
search
status
classId
page
pageSize

Response:
StudentListResponse
```

---

# 91. Frontend Data Layer

The frontend should consume APIs through a centralized data-access layer.

Conceptually:

```text
Page
 ↓
Feature Hook / Query
 ↓
API Client
 ↓
HTTP
```

---

# 92. Avoid Direct Fetch Everywhere

Do not scatter raw API requests throughout unrelated components.

Bad:

```text
Component A → fetch(...)
Component B → fetch(...)
Component C → fetch(...)
```

Prefer:

```text
studentsApi
attendanceApi
paymentsApi
```

or an equivalent architecture.

---

# 93. Query Keys

If a query caching library is used, query keys must include relevant context.

Example:

```text
[
  "students",
  tenantId,
  branchId,
  filters
]
```

---

# 94. Mutation Handling

After mutations, the frontend should update or invalidate affected queries.

Example:

```text
Create Student
 ↓
Invalidate Students List
 ↓
Refresh / Update UI
```

---

# 95. Optimistic Mutations

Use carefully.

Safe candidates may include low-risk UI operations.

Financial mutations should normally wait for authoritative backend confirmation.

---

# 96. API Concurrency

The backend must handle concurrent requests safely.

Examples:

```text
Two users recording payments
Two teachers submitting attendance
Two admins editing the same record
```

Business-critical operations require appropriate transaction/concurrency controls.

---

# 97. Duplicate Requests

Important mutations should be designed to avoid accidental duplication caused by:

```text
Double Click
Network Retry
Browser Retry
Client Timeout
```

---

# 98. Financial Consistency

Payment APIs must prioritize:

```text
Correctness
Atomicity
Idempotency
Auditability
```

over raw response speed.

---

# 99. API Security Checklist

```text
☐ Authentication
☐ Authorization
☐ Tenant Isolation
☐ Branch Isolation
☐ Input Validation
☐ Output Filtering
☐ Rate Limiting
☐ Secure Errors
☐ Request IDs
☐ Audit Logging
☐ Idempotency
☐ Secure File Access
☐ Webhook Verification
```

---

# 100. API Development Checklist

Every endpoint should define:

```text
☐ HTTP Method
☐ URL
☐ Authentication Requirement
☐ Permission
☐ Tenant Scope
☐ Branch Scope
☐ Request Schema
☐ Response Schema
☐ Validation Rules
☐ Error Codes
☐ Pagination if applicable
☐ Sorting if applicable
☐ Filtering if applicable
☐ Idempotency if required
☐ Audit Requirements
```

---

# 101. Final API Principle

> **The API is the formal contract between the ERP frontend and backend. Every endpoint must be predictable, typed where practical, validated server-side, authorization-aware, tenant-safe, and consistent in its request, response, and error structures. Business-critical operations—especially financial operations—must be transactional and idempotent where appropriate. The backend remains the ultimate source of truth for identity, authorization, tenant isolation, and business rules.**

---

# 102. Next Document

```text id="4qg9h8"
40-API-ERROR-HANDLING-VALIDATION-AND-RESILIENCE.md
```

This document will define:

```text
Validation Architecture
Error Taxonomy
Error Codes
Frontend Error Mapping
Backend Error Handling
Network Failures
Timeouts
Retries
Rate Limits
Conflict Resolution
Offline/Degraded States
Form Errors
API Recovery
User-Friendly Error UX
Logging
Observability
Failure Scenarios
```

---

# END OF DOCUMENT
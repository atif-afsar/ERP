# INTEGRATIONS & EXTERNAL SERVICES
# School + Coaching Centre ERP SaaS

**Document:** `27-INTEGRATIONS-AND-EXTERNAL-SERVICES.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `26-NOTIFICATIONS-AND-REAL-TIME-UPDATES.md`  
**Next Document:** `28-SECURITY-AND-COMPLIANCE.md`

---

# 1. Purpose

This document defines how the ERP connects with external services.

The ERP should be designed so external providers can be:

```text
Connected
Replaced
Disabled
Retried
Monitored
Configured
```

without rewriting the core business logic.

---

# 2. Core Principle

External integrations are adapters around the ERP, not the ERP itself.

```text
ERP CORE
   ↓
INTEGRATION SERVICE
   ↓
PROVIDER ADAPTER
   ↓
EXTERNAL SERVICE
```

The core application must remain functional even when an external provider is temporarily unavailable, wherever possible.

---

# 3. Supported Integration Categories

Potential integrations:

```text
Payment Gateways
Email Providers
SMS Providers
WhatsApp Providers
Push Notification Services
Cloud Storage
Authentication Providers
Calendar Services
Accounting Systems
Webhooks
Third-Party APIs
Analytics Services
```

Only integrations explicitly implemented by the product should be enabled.

---

# 4. Integration Architecture

```text
                 ERP
                  |
         +--------+--------+
         |                 |
   Integration Layer   Internal Services
         |
   +-----+------+-------+-------+
   |            |       |       |
Payment       Email    SMS   Storage
Adapter       Adapter Adapter Adapter
   |            |       |       |
Provider      Provider Provider Provider
```

---

# 5. Provider Abstraction

Business logic should call an abstract interface.

Example:

```text
PaymentService
      ↓
PaymentGatewayInterface
      ↓
RazorpayAdapter / StripeAdapter / OtherAdapter
```

The payment business logic should not contain provider-specific API calls.

---

# 6. Adapter Pattern

Each external provider should have an adapter.

Example:

```text
EmailProviderInterface
   ├── ProviderAAdapter
   ├── ProviderBAdapter
   └── ProviderCAdapter
```

This allows provider switching.

---

# 7. Provider Configuration

Integration configuration may include:

```text
Provider
Enabled
Environment
API Endpoint
Public Key
Secret Reference
Webhook Endpoint
Timeout
Retry Policy
```

Secrets must never be stored as plain frontend-visible configuration.

---

# 8. Environment Separation

Use separate configuration for:

```text
Development
Staging
Production
```

Never use production credentials in development.

---

# 9. API Keys

API keys and secrets must:

```text
Remain server-side
Be encrypted/secured
Never appear in frontend bundles
Never be logged
Never be committed to source control
```

---

# 10. Secret Management

Where available, use a secure secret-management system.

Conceptually:

```text
Application
    ↓
Secret Manager
    ↓
Provider Credential
```

---

# 11. Integration Status

Each integration should have a status:

```text
NOT_CONFIGURED
CONFIGURED
ACTIVE
DISABLED
ERROR
```

---

# 12. Integration Health

Administrators should be able to see whether a provider is working.

Example:

```text
Email
✓ Connected

SMS
✓ Connected

Payment Gateway
⚠ Configuration Required

WhatsApp
✗ Connection Failed
```

---

# 13. Health Checks

Where supported, integrations should have health checks.

```text
Integration
   ↓
Connectivity Check
   ↓
Authentication Check
   ↓
Provider Response
```

---

# 14. Timeouts

External API requests must have reasonable timeouts.

Never allow an external provider request to hang indefinitely.

---

# 15. Retry Policy

Transient failures can be retried.

Examples:

```text
Timeout
Temporary Network Failure
Rate Limit
Temporary Provider Error
```

Permanent failures should not be endlessly retried.

---

# 16. Exponential Backoff

Retry delays should increase between attempts.

Example:

```text
Attempt 1
 ↓
Short delay
 ↓
Attempt 2
 ↓
Longer delay
 ↓
Attempt 3
```

The exact values should be configurable.

---

# 17. Idempotency

Financial and other critical operations must use idempotency where supported.

Example:

```text
Payment Request
      ↓
Idempotency Key
      ↓
Provider
```

Retrying the same request must not accidentally create multiple payments.

---

# 18. Payment Integration

Payment gateways may be used for:

```text
Fee Payment
Admission Fee
Course Fee
Other Institution Charges
```

The exact supported payment flows depend on the product.

---

# 19. Payment Architecture

```text
Student / Parent
       ↓
ERP Payment Page
       ↓
Payment Service
       ↓
Gateway Adapter
       ↓
Payment Gateway
       ↓
Webhook / Callback
       ↓
ERP Payment Service
       ↓
Payment Record
```

---

# 20. Payment Status

Payment status should be controlled by the backend.

Possible states:

```text
CREATED
PENDING
AUTHORIZED
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Exact states depend on the payment architecture.

---

# 21. Do Not Trust Frontend Payment Success

The frontend must never be the authoritative source for:

```text
Payment Successful
Payment Amount
Payment Status
Transaction ID
```

The backend must verify payment status through trusted mechanisms.

---

# 22. Payment Webhooks

Payment providers may send webhooks.

```text
Payment Gateway
       ↓
Webhook
       ↓
ERP Webhook Endpoint
       ↓
Verify Signature
       ↓
Process Event
       ↓
Update Payment
```

---

# 23. Webhook Signature Verification

Every provider supporting signed webhooks should have its signature verified.

Invalid signatures:

```text
→ Reject
→ Do not modify financial records
→ Log security event where appropriate
```

---

# 24. Webhook Idempotency

The same webhook may be delivered more than once.

The system must safely process duplicate webhook events.

Conceptually:

```text
provider_event_id
```

should be tracked where available.

---

# 25. Webhook Event Log

Conceptually:

```text
WebhookEvent
 ├── id
 ├── provider
 ├── event_id
 ├── event_type
 ├── received_at
 ├── processed_at
 └── status
```

---

# 26. Payment Reconciliation

The ERP should support reconciliation between:

```text
ERP Payment Records
        ↕
Payment Provider Records
```

where required.

---

# 27. Refunds

Refunds should be handled through a controlled backend flow.

```text
Refund Request
 ↓
Authorization
 ↓
Gateway
 ↓
Webhook / Confirmation
 ↓
ERP Record
```

---

# 28. Partial Refunds

If supported:

```text
Original:
₹10,000

Refund:
₹3,000

Remaining:
₹7,000
```

Financial calculations must use exact monetary representations.

---

# 29. Payment Provider Failure

If the gateway is unavailable:

```text
Payment Attempt
 ↓
Provider Error
 ↓
Payment remains PENDING/FAILED
```

Do not mark the payment as successful merely because the request was sent.

---

# 30. Email Integration

Architecture:

```text
ERP
 ↓
Email Service
 ↓
Email Adapter
 ↓
Provider
```

Possible use cases:

```text
Welcome Email
Password Reset
Attendance
Fee Receipt
Announcements
Exam Notifications
Reports
```

---

# 31. Email Delivery Status

Where supported:

```text
QUEUED
SENT
DELIVERED
BOUNCED
FAILED
```

---

# 32. Email Provider Switching

The notification layer should not depend directly on a specific provider.

```text
Notification Service
       ↓
Email Interface
       ↓
Provider Adapter
```

---

# 33. SMS Integration

SMS should use an adapter:

```text
SMS Service
 ↓
SMS Interface
 ↓
Provider Adapter
 ↓
SMS Provider
```

---

# 34. SMS Failure Handling

Handle:

```text
Invalid Number
Provider Failure
Rate Limit
Insufficient Balance
Template Error
```

according to provider capabilities.

---

# 35. WhatsApp Integration

WhatsApp communication should use an approved API/provider.

Architecture:

```text
ERP
 ↓
Notification Service
 ↓
WhatsApp Adapter
 ↓
Provider
```

---

# 36. WhatsApp Templates

Where provider rules require templates:

```text
Template ID
Language
Variables
Approval Status
```

should be managed appropriately.

---

# 37. Push Integration

Push services may support:

```text
Android
iOS
Web
```

depending on implementation.

Device tokens must be treated as sensitive credentials and managed server-side.

---

# 38. Cloud Storage

Cloud/object storage may be used for:

```text
Student Documents
Teacher Documents
Import Files
Export Files
Homework Attachments
Profile Images
Receipts
Reports
```

---

# 39. Storage Architecture

```text
ERP
 ↓
Storage Service
 ↓
Storage Adapter
 ↓
Object Storage
```

The application should not tightly couple business logic to a specific storage provider.

---

# 40. Private Files

Sensitive files should use private storage.

Examples:

```text
Identity Documents
Financial Documents
Student Records
Teacher Records
```

---

# 41. Signed URLs

For private files:

```text
User Requests File
 ↓
Authorization Check
 ↓
Generate Temporary Signed URL
 ↓
User Accesses File
```

URLs should expire.

---

# 42. File Authorization

Possessing a file URL should not become an alternative authorization mechanism.

The ERP should ensure the user is allowed to access the file before generating a signed URL.

---

# 43. File Uploads

Uploads should validate:

```text
Type
Size
Extension
MIME
Security
Ownership
Tenant
```

---

# 44. File Naming

Do not rely on user-provided filenames as unique storage identifiers.

Use generated object keys.

Example:

```text
tenant/
  branch/
    entity/
      generated-id/
        file
```

The exact storage layout can vary.

---

# 45. Authentication Integrations

External authentication providers may include:

```text
OAuth
OIDC
Enterprise SSO
Google
Microsoft
```

only where explicitly supported.

---

# 46. Authentication Principle

External identity providers authenticate users.

The ERP still determines:

```text
Tenant
Role
Permissions
Branch Scope
Application Access
```

---

# 47. OAuth

OAuth credentials should be:

```text
Stored securely
Scoped minimally
Rotated when appropriate
Never exposed unnecessarily
```

---

# 48. External Identity Linking

Conceptually:

```text
User
 ├── id
 ├── provider
 └── provider_subject
```

The provider subject must be treated as an external identifier, not as the application's primary user ID.

---

# 49. Calendar Integration

Optional integrations may include:

```text
Google Calendar
Microsoft Calendar
```

Potential use:

```text
Classes
Exams
Meetings
Events
```

The ERP remains the source of truth for ERP-specific records.

---

# 50. Accounting Integration

Optional accounting integration could synchronize:

```text
Payments
Invoices
Refunds
Financial Summaries
```

Synchronization rules must be explicitly defined.

---

# 51. Data Ownership

For every integration, define:

```text
Source of Truth
Direction
Sync Frequency
Conflict Strategy
Failure Behavior
```

Example:

```text
ERP → Accounting
Payment Summary
```

---

# 52. One-Way Integration

Example:

```text
ERP
 ↓
Accounting System
```

The accounting system does not modify the ERP.

---

# 53. Two-Way Integration

If two-way sync is supported:

```text
ERP ↔ External System
```

conflict resolution must be explicitly defined.

---

# 54. Synchronization

Possible states:

```text
SYNCED
PENDING
FAILED
CONFLICT
```

---

# 55. Sync Jobs

Large synchronizations should run asynchronously.

```text
Sync Request
 ↓
Queue
 ↓
Worker
 ↓
External API
 ↓
Update Sync State
```

---

# 56. Sync Retry

Transient errors should retry.

Permanent data conflicts should require resolution rather than endless retries.

---

# 57. External IDs

Integration mappings may need:

```text
erp_id
external_id
provider
```

Example:

```text
Student:
ERP ID = 123

External System ID = ABC-456
```

---

# 58. Integration Mapping

Conceptually:

```text
ExternalMapping
 ├── tenant_id
 ├── entity_type
 ├── entity_id
 ├── provider
 └── external_id
```

---

# 59. Webhooks

The ERP may both:

```text
Receive Webhooks
Send Webhooks
```

---

# 60. Incoming Webhooks

Incoming webhooks must:

```text
Authenticate
Verify Signature
Validate Payload
Check Idempotency
Process Safely
Return Appropriate Status
```

---

# 61. Outgoing Webhooks

Tenants may optionally receive ERP events.

Example:

```text
student.created
student.updated
payment.completed
attendance.marked
exam.published
```

Only supported events should be exposed.

---

# 62. Webhook Subscription

Conceptually:

```text
WebhookSubscription
 ├── tenant_id
 ├── endpoint
 ├── subscribed_events
 ├── secret
 └── active
```

---

# 63. Outgoing Webhook Security

Webhook requests should use authentication/signing where appropriate.

Example:

```text
Payload
 +
Timestamp
 +
Signature
```

---

# 64. Webhook Retry

If the recipient returns a retryable failure:

```text
Webhook
 ↓
Failed
 ↓
Retry
 ↓
Success
```

Use bounded retries.

---

# 65. Webhook Delivery Log

Track:

```text
Event
Endpoint
Attempt
Status Code
Timestamp
Response
```

Avoid logging sensitive payload data unnecessarily.

---

# 66. Webhook Replay Protection

Use event IDs and timestamps where appropriate to prevent replay attacks.

---

# 67. API Rate Limits

External APIs may impose rate limits.

The integration layer should handle:

```text
429
Retry-After
Provider Quotas
Tenant Limits
```

where applicable.

---

# 68. Circuit Breaker

For unreliable external services, the system may use a circuit-breaker pattern.

```text
Healthy
 ↓
Repeated Failures
 ↓
Open
 ↓
Temporary Requests Blocked
 ↓
Recovery Check
 ↓
Closed
```

This prevents cascading failures.

---

# 69. Integration Isolation

A failed external service should not unnecessarily bring down the entire ERP.

Example:

```text
WhatsApp Down
```

should not prevent:

```text
Student Management
Attendance
Homework
```

from functioning.

---

# 70. Graceful Degradation

Example:

```text
Email Provider Down
 ↓
Email queued
 ↓
ERP remains usable
```

---

# 71. Integration Queue

Use background jobs for:

```text
Emails
SMS
WhatsApp
Webhooks
Sync
Large API operations
```

where appropriate.

---

# 72. Integration Logs

Logs should capture:

```text
Provider
Operation
Timestamp
Status
Latency
Error Category
Correlation ID
```

Never log secrets.

---

# 73. Correlation IDs

Every external request should ideally have a trace/correlation ID.

Example:

```text
ERP Request
 ↓
Integration Request
 ↓
Provider Request
```

This makes debugging easier.

---

# 74. Observability

Monitor:

```text
Success Rate
Failure Rate
Latency
Queue Length
Retry Count
Rate Limits
Provider Availability
```

---

# 75. Integration Dashboard

Optional admin dashboard:

```text
INTEGRATIONS

Payments      ✓ Healthy
Email         ✓ Healthy
SMS           ⚠ Rate Limited
WhatsApp      ✓ Healthy
Storage       ✓ Healthy
```

---

# 76. Tenant-Level Integrations

Depending on the SaaS model, each tenant may configure its own providers.

Example:

```text
Tenant A
 → Email Provider A

Tenant B
 → Email Provider B
```

Tenant configuration must never leak across tenants.

---

# 77. Platform-Level Integrations

Some services may be centrally managed.

Example:

```text
Platform
 ↓
Shared Email Provider
 ↓
All Tenants
```

The architecture should support both platform-managed and tenant-managed integrations if required.

---

# 78. Integration Permissions

Only authorized administrators should be able to:

```text
Connect Provider
Disconnect Provider
Update Credentials
Test Connection
Change Provider
View Integration Status
```

---

# 79. Credential Rotation

The system should support replacing credentials without downtime where possible.

---

# 80. Disconnecting an Integration

When an integration is disabled:

```text
Stop New Jobs
Preserve Historical Records
Keep Audit History
Handle Queued Jobs Safely
```

---

# 81. Integration Deletion

Deleting configuration should not necessarily delete historical ERP records.

Example:

```text
Delete Email Provider
```

must not delete:

```text
Previous Email Delivery Records
```

unless retention rules explicitly require it.

---

# 82. External Service Data

Only store the external data necessary for ERP functionality.

Avoid copying entire third-party databases unnecessarily.

---

# 83. Data Minimization

For each integration ask:

```text
What data is required?
Why is it required?
How long is it retained?
Who can access it?
```

---

# 84. Privacy Boundaries

External services should receive only the minimum data required.

Example:

```text
SMS Provider
```

may need:

```text
Phone
Message
```

but should not receive the user's entire student profile.

---

# 85. Error Handling

Integration errors should be categorized.

```text
NETWORK_ERROR
TIMEOUT
AUTH_ERROR
RATE_LIMIT
VALIDATION_ERROR
PROVIDER_ERROR
CONFIGURATION_ERROR
UNKNOWN_ERROR
```

---

# 86. User-Facing Errors

Do not expose raw provider responses unnecessarily.

Bad:

```text
Stripe API error:
internal_secret_parameter...
```

Better:

```text
Payment could not be completed.
Please try again.
```

Administrators can access appropriate diagnostic information.

---

# 87. Provider Error Mapping

Map provider-specific errors into application-level errors.

```text
Provider Error
      ↓
Adapter
      ↓
Normalized ERP Error
```

---

# 88. Integration Testing

Every adapter should have:

```text
Unit Tests
Integration Tests
Failure Tests
Retry Tests
Authentication Tests
Webhook Tests
```

---

# 89. Mock Providers

Development/testing should use mocks or sandbox environments where possible.

Never use real financial transactions during automated tests.

---

# 90. Sandbox Mode

Payment providers should support sandbox/test mode where available.

Clearly distinguish:

```text
TEST
PRODUCTION
```

---

# 91. Production Safety

Production payment operations must require production credentials and explicit production configuration.

---

# 92. Integration Migration

When switching providers:

```text
Old Provider
 ↓
Migration Plan
 ↓
New Provider
 ↓
Verification
 ↓
Old Provider Disabled
```

Historical data should remain intact.

---

# 93. Provider Independence

The product must avoid designing database models around a single provider.

Bad:

```text
razorpay_payment_id
```

as the only payment identifier.

Better:

```text
provider
external_transaction_id
```

alongside the canonical ERP payment ID.

---

# 94. Canonical ERP IDs

The ERP's own identifiers remain authoritative.

Example:

```text
ERP Payment ID
```

is the primary internal identifier.

External provider IDs are mappings.

---

# 95. Integration Event Flow

```text
ERP EVENT
    ↓
INTEGRATION SERVICE
    ↓
ADAPTER
    ↓
EXTERNAL PROVIDER
    ↓
RESPONSE / WEBHOOK
    ↓
VALIDATION
    ↓
ERP STATE UPDATE
    ↓
AUDIT
```

---

# 96. Integration Security Checklist

Before enabling an integration:

```text
☐ Credentials secured
☐ Permissions configured
☐ Webhook signatures verified
☐ HTTPS used
☐ Rate limits considered
☐ Retry policy defined
☐ Idempotency considered
☐ Logs sanitized
☐ Tenant isolation tested
☐ Failure behavior tested
```

---

# 97. Integration Implementation Checklist

For every new provider:

```text
1. Define interface
2. Create adapter
3. Add configuration
4. Add credential handling
5. Add health check
6. Add timeout
7. Add retry strategy
8. Add error mapping
9. Add webhook handling if needed
10. Add logging
11. Add monitoring
12. Add tests
13. Document setup
```

---

# 98. Do Not Hard-Code Providers

Avoid:

```text
if provider == "X":
    ...
```

throughout business logic.

Instead:

```text
Integration Interface
        ↓
Provider Adapter
```

---

# 99. Source of Truth

For every integration document:

```text
ERP owns:
Students
Attendance
Fees
Academic Records
Users
Permissions
```

External systems should not silently become authoritative for these records.

---

# 100. Final Architecture

```text
                         ERP CORE
                            |
                     DOMAIN SERVICES
                            |
                    INTEGRATION LAYER
                            |
        +-------------------+-------------------+
        |                   |                   |
    Payments          Notifications          Storage
        |                   |                   |
     Adapter             Adapter             Adapter
        |                   |                   |
    Provider             Provider             Provider


                EXTERNAL EVENTS
                       ↓
                  WEBHOOK LAYER
                       ↓
                VERIFY + NORMALIZE
                       ↓
                    ERP CORE
```

---

# 101. Final Principle

> **External services must remain replaceable, isolated, secure, observable, and failure-tolerant. The ERP owns its canonical business data, while integrations provide external capabilities. Provider-specific logic belongs inside adapters, credentials remain server-side, webhooks are verified and idempotent, and external failures must degrade gracefully rather than compromise the core ERP.**

---

# 102. Next Document

The next specification is:

```text
28-SECURITY-AND-COMPLIANCE.md
```

It will define:

```text
Authentication Security
Authorization
RBAC
Tenant Isolation
Data Protection
Encryption
Password Security
Session Security
CSRF
XSS
SQL Injection
API Security
Rate Limiting
Audit Logs
Security Monitoring
File Security
Secrets
Backups
Data Retention
Privacy
Compliance Boundaries
Incident Response
Security Testing
```

---

# END OF DOCUMENT
# SECURITY & COMPLIANCE
# School + Coaching Centre ERP SaaS

**Document:** `28-SECURITY-AND-COMPLIANCE.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `27-INTEGRATIONS-AND-EXTERNAL-SERVICES.md`  
**Next Document:** `29-BACKUP-DISASTER-RECOVERY-AND-BUSINESS-CONTINUITY.md`

---

# 1. Purpose

This document defines the security architecture and compliance requirements for the ERP.

Security must be built into the platform from the beginning rather than added after development.

The system handles potentially sensitive:

```text
Student Data
Parent Data
Teacher Data
Employee Data
Academic Data
Attendance Data
Financial Data
Documents
Authentication Data
Tenant Data
```

---

# 2. Security Principles

The platform must follow:

```text
Least Privilege
Defense in Depth
Secure by Default
Tenant Isolation
Explicit Authorization
Data Minimization
Zero Trust Between Components
Fail Securely
Auditability
Secure Secrets Management
```

---

# 3. Security Boundaries

The architecture should separate:

```text
Browser
 ↓
Frontend
 ↓
API
 ↓
Application Services
 ↓
Database
 ↓
External Services
```

Users must never directly access protected backend resources.

---

# 4. Authentication

Authentication answers:

> "Who is this user?"

Supported authentication may include:

```text
Email + Password
Phone + OTP
OAuth / OIDC
SSO
```

Only authentication mechanisms actually implemented should be enabled.

---

# 5. Authorization

Authorization answers:

> "What is this user allowed to do?"

Every protected operation must evaluate authorization.

Example:

```text
Authenticated User
       ↓
Tenant
       ↓
Role
       ↓
Permissions
       ↓
Branch / Scope
       ↓
Resource Access
```

---

# 6. Authentication ≠ Authorization

Do not treat successful login as permission to access everything.

```text
Login Successful
        ≠
Full ERP Access
```

---

# 7. Identity

The application should maintain its own canonical user identity.

External authentication providers should not replace the application's internal user ID.

---

# 8. Password Security

If passwords are supported:

```text
Never store plaintext passwords.
```

Passwords must be stored using a modern password-hashing algorithm designed for password storage.

Examples may include:

```text
Argon2id
bcrypt
scrypt
```

Use the framework's established secure implementation where possible.

---

# 9. Password Requirements

Password rules should balance security and usability.

The system may enforce:

```text
Minimum Length
Compromised Password Protection
Rate Limiting
Password History where required
```

Avoid unnecessarily complex rules that encourage insecure password practices.

---

# 10. Password Reset

Password reset should use a secure, short-lived, single-use token.

Flow:

```text
Forgot Password
 ↓
Request Reset
 ↓
Send Secure Link / OTP
 ↓
Verify
 ↓
Set New Password
 ↓
Invalidate Token
```

---

# 11. Reset Token Security

Reset tokens must:

```text
Be unpredictable
Expire
Be single-use
Be invalidated after successful reset
Never appear in logs
```

---

# 12. Login Rate Limiting

Protect authentication endpoints from brute-force attacks.

Example:

```text
Repeated Failed Login
 ↓
Rate Limit
 ↓
Temporary Delay / Block
```

The exact thresholds should be configurable.

---

# 13. Account Locking

If account locking is implemented, avoid creating an easy denial-of-service mechanism.

Prefer controlled rate limiting and risk-based protection where appropriate.

---

# 14. Multi-Factor Authentication

MFA may be supported for high-privilege accounts.

Recommended priority:

```text
Platform Owner
Super Admin
Tenant Admin
Finance Admin
```

The exact roles depend on the RBAC model.

---

# 15. MFA Methods

Possible:

```text
Authenticator App
Passkeys
Security Keys
Email OTP
SMS OTP
```

Higher-security methods should be preferred where available.

---

# 16. Session Security

Sessions must be securely managed.

Use:

```text
Secure Cookies
HttpOnly Cookies
SameSite Protection
Session Expiration
Session Revocation
```

where cookie-based sessions are used.

---

# 17. Session Expiration

Sessions should expire according to security policy.

Possible distinction:

```text
Idle Timeout
Absolute Timeout
```

---

# 18. Logout

Logout should invalidate the active session.

For sensitive environments, users may also have:

```text
Log out of all devices
```

---

# 19. Active Sessions

Users may optionally view:

```text
Device
Browser
Approximate Location
Last Active
```

Avoid exposing unnecessary technical information.

---

# 20. Session Revocation

Administrators should be able to revoke sessions where authorized.

Example:

```text
Suspicious Login
 ↓
Revoke Sessions
 ↓
Require Reauthentication
```

---

# 21. Tenant Isolation

Tenant isolation is a critical security boundary.

```text
Tenant A
   ↓
Only Tenant A Data

Tenant B
   ↓
Only Tenant B Data
```

No API request should be able to bypass tenant isolation.

---

# 22. Never Trust tenant_id From Frontend

Do not rely on:

```text
POST /students
{
  "tenant_id": "tenant-b"
}
```

to determine the user's tenant.

The backend must derive tenant context from the authenticated identity and server-side authorization.

---

# 23. Tenant Context

Conceptually:

```text
Authenticated User
        ↓
User Membership
        ↓
Tenant
        ↓
Authorization Scope
```

---

# 24. Branch Isolation

If a tenant has multiple branches:

```text
Tenant
 ├── Branch A
 ├── Branch B
 └── Branch C
```

users restricted to Branch A must not access Branch B records.

---

# 25. Scope Enforcement

Authorization should be enforced at the backend/service/data layer.

Do not rely only on hiding buttons in the frontend.

Bad:

```text
Hide Delete Button
```

Better:

```text
Frontend hides button
+
Backend rejects unauthorized delete
```

---

# 26. RBAC

Role-Based Access Control should determine broad capabilities.

Example:

```text
Super Admin
Admin
Teacher
Accountant
Receptionist
Student
Parent
```

Exact roles are defined by the canonical authorization model.

---

# 27. Permission-Based Checks

Avoid relying solely on role names.

Use permissions such as:

```text
student.read
student.create
student.update
student.delete

attendance.read
attendance.create
attendance.update

fee.read
fee.create
fee.refund
```

---

# 28. Least Privilege

Users should receive only the permissions necessary for their work.

Example:

```text
Teacher
✓ Attendance
✓ Homework
✓ Assigned Students

✗ Payroll
✗ Tenant Billing
✗ System Configuration
```

---

# 29. Privileged Operations

Sensitive actions should require elevated permission.

Examples:

```text
Delete Student
Refund Payment
Change Role
Change Fees
Export Sensitive Data
Modify Tenant Settings
```

---

# 30. Re-Authentication

Highly sensitive operations may require recent authentication.

Example:

```text
Change Admin Password
 ↓
Require Current Authentication
```

---

# 31. API Security

All protected APIs must authenticate requests.

The API must validate:

```text
Authentication
Authorization
Input
Tenant Scope
Resource Ownership
```

---

# 32. Input Validation

Never trust client input.

Validate:

```text
Type
Length
Format
Range
Required Fields
Allowed Values
Relationships
```

---

# 33. Server-Side Validation

Frontend validation improves UX.

Backend validation provides security.

Both should exist where appropriate.

---

# 34. SQL Injection Protection

Use:

```text
Parameterized Queries
ORM Query Builders
Prepared Statements
```

Do not concatenate raw user input into SQL queries.

---

# 35. XSS Protection

Protect against:

```text
Stored XSS
Reflected XSS
DOM XSS
```

User-generated content must be safely escaped/sanitized before rendering.

---

# 36. HTML Content

If rich text is supported:

```text
Sanitize HTML
Allow Only Approved Tags
Remove Scripts
Remove Dangerous Attributes
```

---

# 37. CSRF Protection

For cookie-based authentication, protect state-changing requests against CSRF.

Use appropriate:

```text
SameSite Cookies
CSRF Tokens
Origin / Referer Validation
```

depending on architecture.

---

# 38. CORS

CORS should use explicit trusted origins.

Avoid:

```text
Access-Control-Allow-Origin: *
```

for authenticated sensitive APIs unless there is a deliberate reason and appropriate architecture.

---

# 39. HTTPS

Production traffic must use HTTPS.

Sensitive credentials and data must never be transmitted over plaintext HTTP.

---

# 40. TLS

Use modern TLS configurations supported by the hosting environment.

---

# 41. Security Headers

Where appropriate, configure headers such as:

```text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Frame Protection
```

The exact header configuration depends on the application architecture.

---

# 42. Clickjacking Protection

Sensitive ERP pages should not be embeddable by untrusted origins.

---

# 43. Content Security Policy

A strong CSP should be considered to reduce XSS impact.

Avoid unnecessarily broad policies such as unrestricted:

```text
script-src *
```

---

# 44. File Upload Security

Uploaded files are an important attack surface.

Validate:

```text
File Size
MIME Type
Extension
Content
Filename
User Permission
Tenant Ownership
```

---

# 45. File Upload Threats

Protect against:

```text
Malicious Executables
Script Files
Polyglot Files
Path Traversal
Oversized Files
Malicious Documents
```

---

# 46. File Storage

Sensitive uploaded files should preferably be stored outside the public web root.

Use:

```text
Private Object Storage
Access-Controlled Storage
Signed URLs
```

where appropriate.

---

# 47. Filename Security

Never use raw user filenames as filesystem paths.

Bad:

```text
/uploads/{user_filename}
```

Better:

```text
/uploads/{generated_object_id}
```

---

# 48. Path Traversal

Reject unsafe path components such as:

```text
../
```

and do not allow users to control server filesystem paths.

---

# 49. Malware Scanning

If the product's threat model requires it, uploaded documents should be scanned before becoming available to other users.

---

# 50. Database Security

The database must not be publicly accessible.

Prefer:

```text
Application Server
      ↓
Private Database Network
```

---

# 51. Database Credentials

Database credentials must be:

```text
Server-side
Secret-managed
Rotatable
Never committed to Git
```

---

# 52. Database Least Privilege

The application database user should have only the permissions it needs.

Avoid using unrestricted database administrator credentials for normal application operations.

---

# 53. Encryption at Rest

Sensitive infrastructure should use encryption at rest where supported.

Examples:

```text
Database
Backups
Object Storage
File Storage
```

---

# 54. Encryption in Transit

Protect data moving between:

```text
Browser ↔ API
API ↔ Database
API ↔ External Services
Workers ↔ Providers
```

where applicable.

---

# 55. Sensitive Data

Potentially sensitive data includes:

```text
Personal Information
Contact Information
Financial Information
Academic Records
Attendance
Documents
Authentication Information
```

Access must follow authorization rules.

---

# 56. Data Minimization

Do not collect or store data simply because it is technically possible.

Ask:

```text
Why do we need this?
Who needs it?
How long do we need it?
```

---

# 57. Privacy

The platform should provide clear privacy practices appropriate to its operating regions.

This includes defining:

```text
Data Collection
Purpose
Retention
Access
Deletion
Sharing
Third-Party Processing
```

---

# 58. Consent

Where legally or operationally required, the system should record appropriate consent.

Do not assume that every communication channel has the same consent requirements.

---

# 59. Communication Preferences

Users may control permitted communication channels where applicable.

Examples:

```text
Email
SMS
WhatsApp
Push
```

Critical system/security messages may follow different rules.

---

# 60. Audit Logs

Security-sensitive actions should be recorded.

Examples:

```text
Login
Logout
Failed Login
Password Reset
Role Change
Permission Change
Data Export
Sensitive Data Access
Payment Refund
```

---

# 61. Audit Log Properties

Conceptually:

```text
AuditEvent
 ├── id
 ├── tenant_id
 ├── actor_id
 ├── action
 ├── entity_type
 ├── entity_id
 ├── timestamp
 ├── metadata
 └── request_id
```

The canonical audit schema should remain consistent across the application.

---

# 62. Audit Immutability

Audit records should not be casually editable by normal users.

If deletion is required for legal/retention reasons, it must follow controlled procedures.

---

# 63. Audit Metadata

Avoid logging:

```text
Passwords
API Secrets
Access Tokens
Full Payment Card Data
Sensitive Authentication Tokens
```

---

# 64. Logging

Application logs should help diagnose problems without becoming a data-leak mechanism.

Log:

```text
Request ID
Operation
Status
Duration
Error Category
```

where appropriate.

---

# 65. Error Messages

User-facing errors should not reveal internal infrastructure.

Bad:

```text
PostgreSQL connection failed on db-prod-04.internal...
```

Better:

```text
Something went wrong. Please try again.
```

---

# 66. Security Error Handling

Security failures should fail closed.

Example:

```text
Authorization Check Failed
 ↓
Reject Request
```

not:

```text
Authorization Service Failed
 ↓
Allow Request
```

---

# 67. Rate Limiting

Rate-limit sensitive endpoints:

```text
Login
Password Reset
OTP
API
File Upload
Exports
Bulk Operations
Webhook Endpoints
```

---

# 68. Abuse Prevention

Protect against:

```text
Brute Force
Credential Stuffing
Enumeration
Spam
API Abuse
Notification Abuse
Large Export Abuse
```

---

# 69. User Enumeration

Authentication endpoints should avoid unnecessarily revealing whether an account exists.

Example:

Instead of:

```text
Email does not exist.
```

use a neutral response where appropriate.

---

# 70. API Pagination

Large datasets must be paginated.

Do not allow unrestricted requests such as:

```text
GET /students?limit=1000000
```

---

# 71. Export Security

Exports may contain large amounts of sensitive data.

Require:

```text
Authorization
Scope Validation
Audit Logging
Reasonable Limits
```

---

# 72. Export Files

Export files should:

```text
Be access-controlled
Expire where appropriate
Use secure storage
Not be publicly indexed
```

---

# 73. Background Jobs

Workers must enforce the same authorization boundaries as synchronous APIs.

Do not assume a queued job is trusted simply because it came from the application.

---

# 74. Queue Security

Jobs should contain only necessary data.

Prefer:

```text
entity_id
job_type
```

over embedding large sensitive datasets inside job payloads where possible.

---

# 75. External Integrations

Third-party integrations must follow:

```text
Least Privilege
Credential Protection
Webhook Verification
Data Minimization
Provider Security
```

---

# 76. API Secrets

Never expose secrets in:

```text
Frontend
Browser Local Storage
URL Parameters
Logs
Git Repository
Error Messages
```

---

# 77. Environment Variables

Environment variables may be used for secrets, but production secret management should be appropriate to the deployment environment.

---

# 78. Dependency Security

Dependencies should be regularly reviewed for:

```text
Known Vulnerabilities
Unsupported Versions
Malicious Packages
Security Advisories
```

---

# 79. Dependency Updates

Updates should be tested before production deployment.

Security-critical updates should receive appropriate priority.

---

# 80. Supply Chain Security

Use:

```text
Trusted Package Sources
Lock Files
Dependency Scanning
Code Review
```

where appropriate.

---

# 81. Source Control Security

Never commit:

```text
.env
Passwords
API Keys
Private Certificates
Production Credentials
```

---

# 82. Secret Rotation

Secrets should be rotatable without requiring major application rewrites.

---

# 83. Admin Security

Administrative accounts require stronger protection because compromise can affect an entire tenant.

Recommended:

```text
MFA
Strong Authentication
Session Monitoring
Audit Logs
Least Privilege
```

---

# 84. Platform Owner Security

Platform-level administrators must be isolated from tenant-level administrators.

A tenant administrator must never obtain platform-wide privileges.

---

# 85. Support Access

If platform support staff can access tenant data, access must be:

```text
Explicit
Authorized
Time-Limited where possible
Audited
```

---

# 86. Impersonation

If administrator impersonation is implemented:

```text
Require Explicit Permission
Display Impersonation State Clearly
Audit Start/End
Restrict Sensitive Actions
```

---

# 87. Data Deletion

Deletion should follow defined business and retention rules.

Deleting an account should not accidentally delete records required for:

```text
Financial History
Audit
Legal Requirements
Institutional Records
```

---

# 88. Soft Delete

Where appropriate, use soft deletion for recoverable business entities.

Example:

```text
deleted_at
```

But do not use soft deletion as a substitute for a proper retention policy.

---

# 89. Data Retention

Define retention rules for:

```text
Users
Students
Attendance
Financial Records
Documents
Notifications
Audit Logs
Exports
Backups
```

---

# 90. Data Anonymization

When deletion is legally or operationally required but historical aggregates must remain, anonymization may be considered.

---

# 91. Compliance

The platform should identify the legal and regulatory requirements applicable to its deployment jurisdictions.

Do not claim compliance certification unless the organization has actually completed the required assessment/certification.

---

# 92. Compliance Configuration

The product should avoid hard-coding jurisdiction-specific legal assumptions into core business logic.

Where necessary:

```text
Policy
 ↓
Configuration
 ↓
Applicable Tenant / Region
```

---

# 93. Security Incident

A security incident may include:

```text
Unauthorized Access
Credential Compromise
Data Exposure
Malware
Suspicious API Activity
Tenant Isolation Failure
```

---

# 94. Incident Response

Basic process:

```text
Detect
 ↓
Contain
 ↓
Investigate
 ↓
Remediate
 ↓
Recover
 ↓
Review
```

---

# 95. Incident Logging

Security incidents should have:

```text
Incident ID
Severity
Detected At
Affected Systems
Affected Tenants
Status
Owner
Resolution
```

where appropriate.

---

# 96. Security Monitoring

Monitor for:

```text
Repeated Failed Logins
Unusual Admin Activity
Large Exports
Unexpected Permission Changes
Integration Failures
Suspicious API Traffic
```

---

# 97. Alert Severity

Possible:

```text
INFO
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 98. Security Testing

The application should include:

```text
Unit Security Tests
Authorization Tests
Tenant Isolation Tests
API Security Tests
Dependency Scanning
Penetration Testing
File Upload Testing
Authentication Testing
```

---

# 99. Authorization Test Matrix

For each protected resource test:

```text
Correct Tenant + Correct Role
Correct Tenant + Wrong Role
Wrong Tenant + Correct Role
Wrong Tenant + Wrong Role
Branch Allowed
Branch Not Allowed
Unauthenticated
```

---

# 100. Tenant Isolation Test

Explicitly verify:

```text
Tenant A User
      ↓
Attempts Tenant B Resource
      ↓
403 / Not Found according to policy
```

and no Tenant B data is returned.

---

# 101. Security Regression Testing

Every major authorization/security change should include regression tests to ensure existing protections remain intact.

---

# 102. Production Security Checklist

Before production:

```text
☐ HTTPS enabled
☐ Secure authentication
☐ Authorization enforced
☐ Tenant isolation tested
☐ RBAC tested
☐ Secrets secured
☐ Database private
☐ Backups configured
☐ Audit logging enabled
☐ Rate limits configured
☐ File uploads secured
☐ Security headers configured
☐ Dependencies reviewed
☐ Error messages sanitized
☐ External webhooks verified
☐ Production credentials separated
☐ Monitoring enabled
```

---

# 103. Security Architecture

```text
                    USER
                      |
                  HTTPS/TLS
                      |
                  FRONTEND
                      |
                AUTHENTICATION
                      |
                AUTHORIZATION
                      |
             TENANT + ROLE + SCOPE
                      |
                     API
                      |
              APPLICATION SERVICES
                      |
        +-------------+-------------+
        |             |             |
     DATABASE       STORAGE      QUEUES
        |             |             |
        +-------------+-------------+
                      |
                INTEGRATIONS
                      |
             EXTERNAL PROVIDERS
```

---

# 104. Security Decision Rule

Every sensitive operation should answer:

```text
Who is requesting it?
Which tenant?
Which branch?
Which role?
Which permission?
Which resource?
Is the resource accessible?
Should this action be audited?
```

If any required security context cannot be established, reject the operation.

---

# 105. Final Principle

> **Security is a platform-wide responsibility, not a frontend feature. Authentication identifies the user; authorization determines what the user may do; tenant and branch boundaries determine where they may operate; the backend is always authoritative; secrets remain protected; sensitive actions are auditable; and failures must fail securely.**

---

# 106. Next Document

```text
29-BACKUP-DISASTER-RECOVERY-AND-BUSINESS-CONTINUITY.md
```

This document will define:

```text
Database Backups
File Backups
Backup Frequency
Retention
Point-in-Time Recovery
Restore Procedures
Disaster Recovery
RPO
RTO
High Availability
Failure Scenarios
Database Recovery
Storage Recovery
Deployment Recovery
Incident Recovery
Business Continuity
Backup Security
Restore Testing
Recovery Runbooks
```

---

# END OF DOCUMENT
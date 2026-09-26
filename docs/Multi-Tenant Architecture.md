# Multi-Tenant Architecture
# School + Coaching Centre ERP SaaS

**Document:** 04-MULTI-TENANT-ARCHITECTURE.md  
**Version:** 1.0  
**Status:** Critical Architecture Specification  
**Previous Document:** 03-USER-ROLES-AND-PERMISSIONS.md  
**Next Document:** 05-SYSTEM-ARCHITECTURE.md

---

# 1. Purpose

This document defines the multi-tenant architecture of the School + Coaching Centre ERP SaaS.

The system must support multiple independent educational organizations from a shared application and backend infrastructure.

The architecture must support:

- Multiple schools.
- Multiple coaching centres.
- Different configurations per organization.
- Different enabled modules per organization.
- Different terminology per organization.
- Different users per organization.
- Strong tenant data isolation.
- Future subscription and billing management.
- Future self-service onboarding.

The multi-tenant architecture must be considered a foundational part of the system.

It must NOT be retrofitted after building the single-school version.

---

# 2. Definition of a Tenant

A **tenant** represents one independent organization using the ERP.

Examples:

```text id="0ixy7q"
Tenant A
ABC Public School
Type: SCHOOL

Tenant B
XYZ Coaching Institute
Type: COACHING

Tenant C
Delhi International School
Type: SCHOOL
```

Each tenant owns its own:

- Users.
- Students/learners.
- Parents.
- Staff.
- Classes/batches.
- Attendance.
- Fees.
- Payments.
- Exams/tests.
- Homework.
- Timetables.
- Documents.
- Settings.
- Configuration.
- Communication data.

---

# 3. Core Multi-Tenant Principle

The application is shared.

The data is logically isolated.

Conceptually:

```text id="up0m8u"
                    APPLICATION
                         |
              Shared ERP Codebase
                         |
          +--------------+--------------+
          |              |              |
       TENANT A       TENANT B       TENANT C
          |              |              |
        Data           Data           Data
```

The system should NOT create a separate application deployment for every school unless a future enterprise requirement explicitly demands it.

---

# 4. Tenant Isolation Requirement

Tenant isolation is a **non-negotiable security requirement**.

If:

```text id="v86q4n"
User belongs to Tenant A
```

that user must only be able to access authorized data belonging to Tenant A.

They must never access Tenant B data by manipulating:

- URL parameters.
- IDs.
- Query parameters.
- Request bodies.
- Browser state.
- Local storage.
- API requests.
- Client-side code.
- `tenant_id` values.

---

# 5. Tenant Identification

Every authenticated tenant user must have an unambiguous tenant context.

Conceptually:

```text id="q1jv1f"
Authenticated User
       |
       ↓
Membership
       |
       ↓
Tenant
       |
       ↓
Tenant Configuration
```

The application should determine the tenant from the authenticated user's trusted membership relationship.

Do NOT blindly trust:

```text id="a8f93x"
tenant_id supplied by frontend
```

as proof that the user belongs to that tenant.

---

# 6. Tenant ID

Every tenant should have a unique immutable identifier.

Conceptually:

```text id="t9v4cl"
tenant_id = UUID
```

The tenant ID should be used to associate tenant-owned resources with their organization.

Example:

```text id="yl8j2s"
students
---------
id
tenant_id
name
...
```

```text id="q0qdbp"
fees
---------
id
tenant_id
student_id
amount
...
```

---

# 7. Tenant-Scoped Data

The majority of business entities should be tenant-scoped.

Examples:

```text id="y1e5z6"
Students
Parents
Staff
Classes
Sections
Courses
Batches
Enrollments
Attendance
Fees
Payments
Exams
Tests
Results
Homework
Timetables
Announcements
Documents
```

These records must be associated with the appropriate tenant.

---

# 8. Tenant-Owned Relationships

Relationships must also respect tenant boundaries.

Example:

```text id="7u7a31"
Student
   |
   +-- tenant_id = Tenant A
   |
   +-- Class
          |
          +-- tenant_id = Tenant A
```

A Student from Tenant A must not be assigned to a Class belonging to Tenant B.

The application and database should enforce this.

---

# 9. Cross-Tenant Relationships

Cross-tenant business relationships should generally NOT exist.

Avoid:

```text id="gqz5q7"
Tenant A Student
       ↓
Tenant B Class
```

This should be invalid.

If a future platform feature requires cross-tenant relationships, it must be explicitly designed as a platform-level relationship rather than accidentally emerging from the normal data model.

---

# 10. Tenant Types

The system should initially support:

```text id="z9d6hf"
SCHOOL
COACHING
```

The type should be stored as tenant configuration.

Example:

```text id="0xw3x7"
tenant
------
id
name
tenant_type
status
created_at
```

Possible future types could include:

```text id="yj9z3u"
COLLEGE
TRAINING_INSTITUTE
EDUCATION_GROUP
```

but these should not be implemented unless required.

---

# 11. School Tenant

A school tenant may use:

```text id="5r4kqg"
Academic Year
Classes
Sections
Students
Parents
Teachers
Admissions
Exams
Report Cards
Transport
Library
Hostel
```

Optional modules are controlled through configuration.

---

# 12. Coaching Tenant

A coaching tenant may use:

```text id="50h0ry"
Courses
Batches
Learners
Faculty
Enrollments
Attendance
Installments
Tests
Test Series
Rankings
Lead CRM
```

The coaching model must not be forced into the school academic-year structure.

---

# 13. Shared ERP Engine

The application should use a common core wherever possible.

Conceptually:

```text id="7gl4n2"
                    ERP ENGINE
                        |
       +----------------+----------------+
       |                                 |
 SCHOOL CONFIG                     COACHING CONFIG
       |                                 |
 Class / Section                     Course / Batch
 Student                            Learner
 Admission                          Enrollment
 Exam                               Test
```

The goal is reuse rather than separate codebases.

---

# 14. Tenant Configuration Layer

Every tenant should have configuration.

Examples:

```text id="qg7z4f"
Organization Name
Logo
Primary Branding
Timezone
Currency
Date Format
Language
Tenant Type
Feature Flags
Terminology
Academic Settings
Communication Settings
```

Configuration should be centralized.

Do not scatter tenant-specific configuration across individual React components.

---

# 15. Tenant Branding

Each tenant should eventually be able to configure:

- Logo.
- Organization name.
- Primary color.
- Secondary color.
- Favicon where supported.
- Login branding.
- Portal branding.

Example:

```text id="s2o4y8"
Tenant A
    |
    +-- Logo A
    +-- Brand Color A

Tenant B
    |
    +-- Logo B
    +-- Brand Color B
```

The underlying application remains shared.

---

# 16. Tenant Terminology

Tenant-specific terminology should be configurable.

Example:

### School

```text id="m2y0jw"
Student
Class
Section
Admission
Exam
Report Card
```

### Coaching

```text id="v7p6f9"
Learner
Course
Batch
Enrollment
Test
Performance
```

The system should not duplicate entire feature implementations simply because labels differ.

---

# 17. Tenant Feature Flags

Modules should be configurable per tenant.

Example:

```text id="j4k7pn"
Tenant A - School

Attendance       ON
Fees             ON
Exams            ON
Transport        ON
Library          OFF
Hostel           OFF
AI Assistant     OFF
Payroll          OFF
```

Another tenant:

```text id="g5x7q2"
Tenant B - Coaching

Attendance       ON
Fees             ON
Test Series      ON
Lead CRM         ON
Transport        OFF
Library          OFF
Hostel           OFF
```

---

# 18. Feature Flag Enforcement

A disabled module must be disabled at multiple levels.

### Navigation

Do not show the module.

### Routing

Direct access should be blocked.

### UI

Actions should not appear.

### Backend

Requests should be rejected when the module is disabled.

### Database

Where necessary, database functions/policies must respect module-level security.

A feature flag is NOT merely:

```text id="j7v9g5"
if (!featureEnabled) hideButton();
```

---

# 19. Tenant Status

Every tenant should have a lifecycle status.

Initial states:

```text id="8h5xg0"
trial
active
suspended
inactive
```

Potential future states:

```text id="2c2c4d"
past_due
cancelled
archived
```

---

# 20. Suspended Tenant

If a tenant is suspended:

- Normal users should not be able to access the application.
- Tenant APIs should reject normal operations.
- Existing data must remain intact.
- Super Admin should be able to investigate/reactivate the tenant.
- Subscription/billing status may determine suspension in the future.

Suspension must not mean immediate deletion.

---

# 21. Tenant Membership

Users should not simply have a `tenant_id` without an explicit membership model where future flexibility requires it.

Conceptually:

```text id="r2b2l4"
users
  |
  +-- memberships
          |
          +-- tenant
          +-- role
          +-- status
```

Example:

```text id="z4df9f"
User A
   |
   +-- Tenant A
          |
          +-- Tenant Admin
```

---

# 22. Multiple Memberships

The architecture should not unnecessarily prevent a user from belonging to multiple tenants.

For example, a consultant or platform operator may eventually belong to:

```text id="kq4xjp"
Tenant A
Tenant B
Tenant C
```

However, ordinary school staff should normally have one primary tenant.

If multiple memberships are supported, the application must require an explicit active tenant context.

Never silently switch tenants.

---

# 23. Active Tenant Context

If a user belongs to multiple tenants:

```text id="b5t7aa"
User
 |
 +-- Tenant A
 +-- Tenant B
```

the application must maintain:

```text id="6k6j0z"
activeTenant
```

All tenant-scoped operations must operate against the active tenant.

The active tenant must still be validated against the user's memberships.

---

# 24. Tenant Switching

Tenant switching should be restricted to users who actually have multiple memberships.

When switching:

1. Validate membership.
2. Change active tenant context.
3. Refresh tenant configuration.
4. Refresh permissions.
5. Clear stale tenant-specific state.
6. Reload tenant-scoped data.

Do not retain data from the previous tenant in visible application state.

---

# 25. Database Strategy

Supabase PostgreSQL should use a shared database with logical tenant isolation.

Recommended conceptual model:

```text id="fcr5ip"
                    PostgreSQL
                        |
        +---------------+---------------+
        |               |               |
     Tenant A        Tenant B        Tenant C
        |               |               |
      Rows            Rows            Rows
```

Most tenant-owned tables should contain:

```text id="f5u0om"
tenant_id
```

---

# 26. Row Level Security

Supabase Row Level Security (RLS) is a critical part of tenant isolation.

RLS policies should ensure that a user can only access rows belonging to an authorized tenant.

Conceptually:

```text id="6sqz7f"
Authenticated User
        |
        ↓
Membership
        |
        ↓
Allowed Tenant IDs
        |
        ↓
Row tenant_id
        |
        ↓
MATCH?
   /       \
 YES       NO
  |         |
ALLOW      DENY
```

The exact SQL policies will be defined in the database/RLS documentation.

---

# 27. RLS Is Mandatory

Do not rely only on React filtering.

This is NOT sufficient:

```text id="2fdr3g"
const students = data.filter(
  student => student.tenant_id === currentTenant
)
```

The database must prevent unauthorized rows from being returned in the first place.

---

# 28. Client-Provided Tenant ID

The frontend may send a tenant ID as part of a request for contextual purposes, but this value must never be considered proof of authorization.

Bad security model:

```text id="g29j5k"
Frontend:
tenant_id = "tenant-B"

Backend:
accept request
```

Correct model:

```text id="k0h4ez"
Frontend:
tenant_id = "tenant-B"

Database:
Does authenticated user have access to Tenant B?

NO
↓
DENY
```

---

# 29. Tenant-Scoped Queries

Application queries should preferably operate within the authenticated tenant context.

Conceptually:

```text id="8v6s3q"
SELECT *
FROM students
WHERE tenant_id = current_user_tenant;
```

However, RLS must still protect the table even if application code accidentally omits the filter.

---

# 30. Defense in Depth

Tenant isolation should use multiple layers:

```text id="y6e1hc"
Authentication
      ↓
Membership
      ↓
Application authorization
      ↓
Database RLS
      ↓
Foreign-key/data integrity
```

If one layer contains a bug, another layer should reduce the impact.

---

# 31. Foreign-Key Integrity

Tenant-owned relationships should be designed so that records cannot accidentally reference another tenant.

For example:

```text id="z2k6a7"
Student
tenant_id = A

Class
tenant_id = B
```

The database should prevent:

```text id="x2sv4b"
student.class_id = Class B
```

where that would violate tenant ownership.

Where PostgreSQL constraints alone cannot express the requirement conveniently, use appropriate database functions/triggers or controlled backend operations.

---

# 32. Tenant-Aware IDs

Resource IDs should be globally unique where practical.

UUIDs are recommended.

Example:

```text id="z3wy9k"
student.id = UUID
```

Do not use sequential IDs as a security mechanism.

Even globally unique IDs do not replace authorization.

---

# 33. Storage Isolation

Supabase Storage must also respect tenant boundaries.

Conceptually:

```text id="p6x5cd"
storage/
   tenant-a/
      students/
      documents/
      certificates/

   tenant-b/
      students/
      documents/
      certificates/
```

Private files should not become publicly accessible merely because their path is known.

Storage policies must enforce tenant authorization.

---

# 34. File Naming

File paths should include a tenant-aware structure.

Example:

```text id="e2o0af"
tenant/{tenant_id}/students/{student_id}/profile.jpg
```

or an equivalent secure structure.

Do not allow arbitrary users to choose unrestricted storage paths.

---

# 35. Tenant Configuration Security

Only authorized tenant users should modify tenant settings.

Example:

```text id="y1v5pd"
Tenant Admin
    ↓
Can update tenant settings

Teacher
    ↓
Cannot update tenant settings

Parent
    ↓
Cannot update tenant settings
```

Configuration changes should be auditable.

---

# 36. Tenant Deletion

Deleting a tenant is a high-risk operation.

The default behavior should be:

```text id="6n5y4v"
Suspend
   ↓
Archive
   ↓
Retention period
   ↓
Permanent deletion only if explicitly authorized
```

Do not implement irreversible tenant deletion casually.

---

# 37. Tenant Data Retention

The product should eventually define retention policies for:

- Students.
- Attendance.
- Payments.
- Results.
- Documents.
- Audit logs.

The exact retention period is a business/legal decision and should not be hardcoded without an explicit requirement.

---

# 38. Tenant Onboarding

Future self-onboarding should create:

```text id="k4w3tx"
Tenant
   ↓
Tenant Configuration
   ↓
Admin Membership
   ↓
Initial Settings
   ↓
Enabled Modules
   ↓
Dashboard
```

A partially created tenant should not become accessible until required initialization succeeds.

---

# 39. Tenant Initialization

Tenant creation should be treated as a controlled process.

Conceptually:

```text id="yq0a1k"
Create Tenant
      ↓
Create Configuration
      ↓
Create Admin Membership
      ↓
Set Default Features
      ↓
Set Default Labels
      ↓
Initialize Required Settings
      ↓
Mark Tenant Ready
```

If initialization fails, the system should not leave a broken half-configured tenant.

---

# 40. Default Configuration

New tenants should receive safe defaults.

Example:

```text id="r0t5mm"
School:

Students        ON
Attendance      ON
Fees            ON
Exams           ON
Timetable       ON
Homework        ON
Communication   ON

Transport       OFF
Library         OFF
Hostel          OFF
Payroll         OFF
```

Coaching defaults should differ where appropriate.

---

# 41. Tenant-Specific Modules

Modules may be categorized as:

```text id="l5m2yi"
CORE
OPTIONAL
SCHOOL_ONLY
COACHING_ONLY
```

Example:

```text id="h4g4e9"
Attendance      CORE
Fees            CORE

Transport       SCHOOL_ONLY
Library         SCHOOL_ONLY

Lead CRM        COACHING_ONLY
Test Series     COACHING_ONLY
```

The final module registry should be centralized.

---

# 42. Tenant-Specific Workflows

Tenant configuration may influence workflow.

Example:

School:

```text id="6l4s0q"
Admission
 → Class Assignment
 → Fee Setup
```

Coaching:

```text id="q2c6p4"
Inquiry
 → Enrollment
 → Course
 → Batch Assignment
 → Fee Plan
```

Shared engines should support these differences through configuration and appropriate domain logic.

---

# 43. Tenant Timezone

Tenant timezone should be stored in configuration.

This is important for:

- Attendance dates.
- Timetable.
- Notifications.
- Payment timestamps.
- Audit logs.
- Scheduled communication.

Do not assume every tenant's local timezone forever.

Default may be India/IST for the initial Indian market, but the system should remain configurable.

---

# 44. Tenant Currency

Currency should be configurable.

Initial default:

```text id="d5k8tj"
INR
```

Future tenants may require other currencies.

Financial calculations should not assume a currency symbol is always ₹.

---

# 45. Tenant Localization

The product should eventually support configurable:

- Language.
- Date format.
- Time format.
- Currency.
- Number formatting.

Do not build a complete internationalization system unless needed, but avoid architectural decisions that prevent it.

---

# 46. Tenant Subscription Relationship

The tenant should eventually be associated with a subscription.

Conceptually:

```text id="09j2qz"
Tenant
   |
   +-- Subscription
          |
          +-- Plan
          +-- Status
          +-- Start Date
          +-- Renewal Date
```

Subscription functionality belongs to the SaaS layer and should not tightly couple itself to every ERP feature.

---

# 47. Tenant Limits

Future subscription plans may impose limits such as:

```text id="qk6q5b"
Maximum students
Maximum staff
Maximum storage
Maximum administrators
Maximum messages
Enabled modules
```

The architecture should allow limits to be introduced later.

Do not unnecessarily enforce arbitrary limits in the MVP unless commercially required.

---

# 48. Usage Tracking

Future SaaS analytics may track:

```text id="3b2a6c"
Active Students
Active Users
Storage
Messages
Payments
Attendance Records
Monthly Activity
```

Usage data should be tenant-scoped and should not interfere with normal ERP operations.

---

# 49. Platform-Level vs Tenant-Level Data

The system should distinguish:

### Platform-level

```text id="j9y2dn"
Platform Admins
Plans
Subscription Definitions
Global Feature Catalog
Platform Configuration
Platform Audit Events
```

### Tenant-level

```text id="w0w8m5"
Students
Parents
Staff
Fees
Attendance
Exams
Classes
Batches
Documents
Tenant Settings
```

Never mix these concepts casually.

---

# 50. Super Admin Tenant Access

Super Admin may need to inspect tenant information for support.

However, the system should distinguish:

```text id="b6q7de"
Platform Management
```

from:

```text id="2d4vyr"
Acting as Tenant Admin
```

If an impersonation/support feature is eventually implemented, it must:

- Require explicit authorization.
- Be auditable.
- Clearly show the active tenant.
- Avoid exposing unnecessary sensitive information.
- Never become an invisible backdoor.

---

# 51. Tenant Context in Frontend

The frontend should maintain a centralized tenant context.

Conceptually:

```text id="8m7kqy"
TenantProvider
    |
    +-- currentTenant
    +-- tenantConfig
    +-- tenantType
    +-- enabledFeatures
    +-- labels
    +-- permissions
```

Feature modules should consume this context rather than independently querying tenant configuration repeatedly.

---

# 52. Tenant Context in Backend

Backend/server operations should derive authorization from the authenticated user and trusted membership information.

Avoid patterns where the frontend determines:

```text id="c1ry3h"
"Current tenant = X"
```

and the backend blindly accepts it.

---

# 53. Caching Rules

Tenant-specific data must never leak through shared caching.

Any cache must account for:

```text id="g3w4m7"
tenant_id
user permissions
resource scope
```

Avoid global caches containing tenant-sensitive data.

---

# 54. Realtime Security

If Supabase Realtime is used:

- Tenant channels must be protected.
- Users must only subscribe to authorized tenant data.
- Private events must not be broadcast globally.
- RLS/security rules must apply where supported.

Realtime functionality must not bypass normal tenant authorization.

---

# 55. Notifications

Notifications must also be tenant-aware.

A notification generated for:

```text id="s0y6w4"
Tenant A
```

must never be delivered to an unauthorized user from:

```text id="x1z6z2"
Tenant B
```

---

# 56. WhatsApp / External Integrations

External integrations must retain tenant context.

For example:

```text id="x2c7v1"
WhatsApp Event
      ↓
Tenant Identifier
      ↓
Tenant Configuration
      ↓
Authorized Student/Parent
      ↓
Response
```

Never process an external webhook against arbitrary tenant data without validating its tenant association.

---

# 57. Razorpay / Payments

Payment processing must also be tenant-aware.

A payment associated with Tenant A must never be recorded against Tenant B.

Webhook processing must verify:

- Payment identity.
- Expected tenant.
- Expected amount.
- Expected order/payment relationship.
- Relevant student/fee record.

The payment architecture will be detailed separately.

---

# 58. Tenant-Aware Logging

Application logs should include tenant context where appropriate.

Example:

```text id="9m5dhy"
timestamp
tenant_id
user_id
action
resource
request_id
```

Do not log sensitive student/payment information unnecessarily.

---

# 59. Tenant-Aware Errors

Errors should not expose information about another tenant.

Bad:

```text id="z7w3zj"
Student B001 exists in another organization.
```

Better:

```text id="3g7d5h"
The requested resource could not be found.
```

Avoid information leakage through error messages.

---

# 60. Testing Tenant Isolation

Tenant isolation must be explicitly tested.

Minimum tests:

### Test 1

Tenant A user requests Tenant A student.

Expected:

```text id="u6a6h5"
ALLOW
```

### Test 2

Tenant A user requests Tenant B student.

Expected:

```text id="5s8j3m"
DENY
```

### Test 3

Tenant A user modifies Tenant B fee.

Expected:

```text id="q5v7b3"
DENY
```

### Test 4

Tenant A user guesses another tenant's UUID.

Expected:

```text id="x6b9t2"
DENY
```

### Test 5

Parent from Tenant A requests unrelated student in Tenant A.

Expected:

```text id="2q4y9m"
DENY
```

### Test 6

Teacher requests student from an unassigned class/batch.

Expected:

```text id="p3m1w6"
DENY
```

---

# 61. Security Testing Principle

Testing must include attempts to bypass security.

Do not only test:

```text id="5k8w1a"
Normal UI → Normal request
```

Also test:

```text id="0t5j4q"
Modified request
Modified tenant_id
Modified resource ID
Direct API request
Direct route
Expired session
Wrong membership
Wrong role
```

---

# 62. Common Anti-Patterns

Antigravity MUST NOT implement:

### Anti-pattern 1

Using frontend filtering as tenant security.

### Anti-pattern 2

Trusting `tenant_id` from request body.

### Anti-pattern 3

Using hidden UI elements as authorization.

### Anti-pattern 4

Creating one global admin role for every user.

### Anti-pattern 5

Allowing arbitrary cross-tenant foreign keys.

### Anti-pattern 6

Using sequential IDs as security.

### Anti-pattern 7

Putting tenant-sensitive information into global caches.

### Anti-pattern 8

Using public storage URLs for private student documents.

### Anti-pattern 9

Building separate codebases unnecessarily for school and coaching.

### Anti-pattern 10

Creating tenant isolation only after the ERP is already built.

---

# 63. Recommended Architectural Pattern

The intended architecture is:

```text id="x7r8z4"
                    USER
                      |
                      ↓
                AUTHENTICATION
                      |
                      ↓
                 MEMBERSHIP
                      |
                      ↓
                   TENANT
                      |
          +-----------+-----------+
          |           |           |
       CONFIG      FEATURES    LABELS
          |
          ↓
      ERP ENGINE
          |
   +------+------+
   |             |
 SCHOOL       COACHING
```

Security:

```text id="r8k6v0"
USER
 ↓
MEMBERSHIP
 ↓
TENANT
 ↓
ROLE/PERMISSION
 ↓
RESOURCE SCOPE
 ↓
RLS
 ↓
DATA
```

---

# 64. Architecture Priority

Multi-tenancy should be implemented early.

The correct order is:

```text id="2w7m5e"
Tenant Foundation
        ↓
Authentication
        ↓
Membership
        ↓
Roles
        ↓
RLS
        ↓
Configuration
        ↓
Feature Flags
        ↓
ERP Modules
```

Do not build all ERP modules first and attempt to add tenant isolation later.

---

# 65. MVP vs Future SaaS

### MVP

The first client may effectively operate as:

```text id="9g5c1f"
One production tenant
```

but the architecture should already contain:

```text id="3c8d2q"
tenant_id
membership
tenant configuration
feature flags
RLS
```

### Future SaaS

Expand into:

```text id="4s5v8n"
Multiple Tenants
Super Admin
Self-Onboarding
Subscriptions
Billing
Usage Tracking
```

---

# 66. Performance Considerations

A shared multi-tenant database should remain performant as tenants grow.

Use:

- Proper indexes.
- Tenant-aware indexes.
- Pagination.
- Efficient queries.
- Appropriate foreign keys.
- Query optimization.

Frequently queried tenant-scoped columns should be indexed appropriately.

Example conceptual indexes:

```text id="7s9n2p"
students(tenant_id)
attendance(tenant_id, date)
fees(tenant_id, student_id)
payments(tenant_id)
```

Exact indexing strategy belongs in the database architecture document.

---

# 67. Scalability Principle

Do not prematurely create:

- Separate databases per tenant.
- Separate servers per tenant.
- Separate codebases per tenant.

The initial architecture should use shared infrastructure with strong logical isolation.

If enterprise customers eventually require dedicated infrastructure, that can be introduced as a future deployment model.

---

# 68. Disaster Recovery Consideration

Because many tenants share the platform, backup/recovery strategy is important.

The system should eventually support:

- Database backups.
- Storage backups where necessary.
- Recovery procedures.
- Monitoring.
- Incident response.

The exact backup strategy will be documented separately.

---

# 69. Tenant Isolation Acceptance Criteria

The multi-tenant architecture is acceptable only when:

- Every tenant has a unique identity.
- Users have explicit tenant membership.
- Tenant-owned records are tenant-scoped.
- Tenant relationships are validated.
- RLS protects tenant data.
- Storage follows tenant security.
- Tenant switching is controlled.
- Feature configuration is tenant-specific.
- Labels/configuration are tenant-specific.
- Notifications respect tenant boundaries.
- Integrations preserve tenant context.
- Cross-tenant access attempts fail.
- Security tests cover deliberate bypass attempts.

---

# 70. Non-Negotiable Rules for Antigravity

1. **Never trust a client-provided tenant ID.**
2. **Never rely only on frontend tenant filtering.**
3. **Use database-level tenant isolation.**
4. **Use Supabase RLS for tenant-scoped data.**
5. **Every tenant-owned resource must have a reliable tenant relationship.**
6. **Validate relationships across tenant boundaries.**
7. **Never expose another tenant's data through errors.**
8. **Never use hidden UI elements as security.**
9. **Protect Supabase Storage using tenant-aware policies.**
10. **Protect realtime events.**
11. **Protect external integrations.**
12. **Keep tenant configuration centralized.**
13. **Do not create separate school/coaching codebases unnecessarily.**
14. **Do not add multi-tenancy after the core database is already finalized.**
15. **When uncertain about tenant authorization, deny access.**

---

# 71. Relationship With Other Documents

This document defines:

> **HOW multiple organizations coexist securely inside the same platform.**

The architecture sequence is:

```text id="f4p7j8"
00-MASTER-PROJECT-CONTEXT.md
        ↓
01-PRODUCT-REQUIREMENTS.md
        ↓
02-PRODUCT-VISION-AND-SCOPE.md
        ↓
03-USER-ROLES-AND-PERMISSIONS.md
        ↓
04-MULTI-TENANT-ARCHITECTURE.md
        ↓
05-SYSTEM-ARCHITECTURE.md
        ↓
06-DATABASE-ARCHITECTURE.md
        ↓
07-DATABASE-SCHEMA.md
```

The next document will translate the product requirements and multi-tenant principles into the actual technical system architecture.

---

# END OF DOCUMENT
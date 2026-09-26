# System Architecture
# School + Coaching Centre ERP SaaS

**Document:** 05-SYSTEM-ARCHITECTURE.md  
**Version:** 1.0  
**Status:** Core Technical Architecture  
**Previous Document:** 04-MULTI-TENANT-ARCHITECTURE.md  
**Next Document:** 06-DATABASE-ARCHITECTURE.md

---

# 1. Purpose

This document defines the technical architecture of the School + Coaching Centre ERP SaaS.

It translates the previously defined:

- Product requirements.
- Product scope.
- User roles.
- Permissions.
- Multi-tenant architecture.

into a concrete technical structure.

Antigravity must use this document as the technical foundation when implementing the application.

---

# 2. Architecture Goals

The system must be:

- Multi-tenant.
- Secure.
- Mobile-first.
- Responsive.
- Modular.
- Maintainable.
- Scalable.
- Fast.
- Configuration-driven.
- School-compatible.
- Coaching-compatible.
- API-ready.
- Integration-ready.

The architecture should avoid unnecessary complexity while keeping the foundation strong enough for future SaaS expansion.

---

# 3. High-Level Architecture

The intended architecture is:

```text
                         USERS
                           |
          +----------------+----------------+
          |                |                |
       Desktop           Tablet           Mobile
          |                |                |
          +----------------+----------------+
                           |
                           ↓
                    WEB APPLICATION
                           |
                           ↓
                    AUTHENTICATION
                           |
                           ↓
                  AUTHORIZATION LAYER
                           |
                           ↓
                   APPLICATION LAYER
                           |
          +----------------+----------------+
          |                |                |
      School Engine    Coaching Engine   Shared Engine
          |                |                |
          +----------------+----------------+
                           |
                           ↓
                    SUPABASE BACKEND
                           |
          +----------------+----------------+
          |                |                |
      PostgreSQL       Storage          Realtime
          |
          ↓
      External Services
          |
    +-----+------+---------+---------+
    |            |         |         |
 WhatsApp      Email    Payments   Future APIs
```

---

# 4. Recommended Technology Stack

The application should use a modern web stack.

Recommended foundation:

```text
Frontend:
React
TypeScript

Build:
Vite

Styling:
Tailwind CSS

Backend Platform:
Supabase

Database:
PostgreSQL

Authentication:
Supabase Auth

Storage:
Supabase Storage

Realtime:
Supabase Realtime

Hosting:
Vercel / equivalent modern frontend hosting

Version Control:
Git
```

The exact hosting provider may change without changing the core architecture.

---

# 5. Why React

React is appropriate because the ERP contains many interactive interfaces:

- Dashboards.
- Tables.
- Forms.
- Attendance grids.
- Fee management.
- Student profiles.
- Timetables.
- Reports.
- Notifications.
- Role-based navigation.

The UI should be component-driven rather than page-driven.

---

# 6. TypeScript Requirement

TypeScript should be used throughout the application.

Avoid creating the core system in plain JavaScript.

TypeScript should provide:

- Type safety.
- Better IDE support.
- Safer database models.
- Safer API interfaces.
- Better refactoring.
- Reduced runtime errors.

---

# 7. Mobile-First Requirement

The application must be designed mobile-first.

The design process should start with:

```text
Mobile
 ↓
Tablet
 ↓
Desktop
```

Not:

```text
Desktop
 ↓
Try to squeeze it onto mobile
```

---

# 8. Responsive Layout

The system must work across:

```text
Mobile phones
Small tablets
Large tablets
Laptops
Desktop monitors
Large desktop displays
```

Components must adapt rather than simply shrink.

---

# 9. Application Layers

The frontend architecture should be organized conceptually into:

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Data / Services
    ↓
Supabase
```

---

# 10. Presentation Layer

Responsible for:

- Pages.
- Components.
- Layout.
- Forms.
- Tables.
- Modals.
- Navigation.
- Loading states.
- Empty states.
- Error states.

The presentation layer should not contain complex business rules.

---

# 11. Application Layer

Responsible for:

- User actions.
- Workflows.
- Permission checks.
- Form submission.
- Data orchestration.
- Calling domain services.

Example:

```text
Create Student
      ↓
Validate Form
      ↓
Check Permission
      ↓
Create Student
      ↓
Create Enrollment
      ↓
Return Result
```

---

# 12. Domain Layer

The domain layer represents business rules.

Examples:

```text
Student
Admission
Enrollment
Attendance
Fee
Payment
Exam
Result
Homework
Timetable
Batch
Course
```

Business rules should not be scattered throughout UI components.

---

# 13. Data Layer

The data layer handles communication with Supabase.

Examples:

```text
studentService
attendanceService
feeService
paymentService
examService
homeworkService
notificationService
```

Components should preferably call application/domain services instead of writing large raw database queries inside JSX.

---

# 14. Supabase Architecture

Supabase will provide the main backend infrastructure.

Conceptually:

```text
React Application
        |
        ↓
Supabase Client
        |
        +------------+
        |            |
     Auth        PostgreSQL
                     |
             Row Level Security
                     |
                Tenant Data
```

Additional services:

```text
Supabase Storage
Supabase Realtime
Supabase Edge Functions
```

should be used when appropriate.

---

# 15. Authentication

Supabase Auth should handle authentication.

Initial supported authentication may include:

- Email/password.
- Password reset.
- Email verification where required.

Future options may include:

- Phone OTP.
- Google login.
- Microsoft login.
- Magic links.

Do not implement every authentication method in the MVP unless required.

---

# 16. Authentication Flow

Basic flow:

```text
User
 ↓
Login
 ↓
Supabase Auth
 ↓
Authenticated Session
 ↓
Load Membership
 ↓
Load Tenant
 ↓
Load Permissions
 ↓
Load Configuration
 ↓
Application Dashboard
```

---

# 17. Session Management

The application must rely on the authentication provider for secure session handling.

Do not store passwords in application tables.

Do not manually implement password authentication.

---

# 18. Authorization Flow

Every protected operation should conceptually follow:

```text
Authenticated User
       ↓
Active Session
       ↓
Tenant Membership
       ↓
Role
       ↓
Permission
       ↓
Resource Scope
       ↓
RLS
       ↓
Database
```

---

# 19. Multi-Tenant Context

The frontend should maintain a central tenant context.

Conceptually:

```text
TenantContext
    |
    +-- currentTenant
    +-- tenantType
    +-- tenantConfig
    +-- enabledModules
    +-- terminology
    +-- permissions
```

All modules should use this shared context.

---

# 20. Application Shell

The application should have a common shell.

Conceptually:

```text
App
 |
 +-- AuthProvider
 |
 +-- TenantProvider
 |
 +-- PermissionProvider
 |
 +-- AppShell
       |
       +-- Sidebar
       +-- Header
       +-- Main Content
       +-- Mobile Navigation
```

---

# 21. Navigation Architecture

Navigation should be permission-aware.

Example:

```text
Dashboard

Students

Admissions

Attendance

Academics
  ├── Classes
  ├── Batches
  ├── Subjects
  └── Timetable

Exams
  ├── Exams
  ├── Tests
  └── Results

Fees
  ├── Fee Structure
  ├── Payments
  └── Dues

Communication

Reports

Settings
```

The actual navigation shown depends on:

- Tenant type.
- Enabled modules.
- User role.
- User permissions.

---

# 22. Route Architecture

Routes should be logically grouped.

Conceptually:

```text
/auth/*
/app/*
/admin/*
/students/*
/admissions/*
/attendance/*
/fees/*
/exams/*
/homework/*
/communication/*
/reports/*
/settings/*
```

Exact route naming can evolve, but route organization must remain predictable.

---

# 23. Protected Routes

Protected routes should verify:

```text
Authentication
+
Tenant
+
Permission
+
Feature availability
```

Example:

```text
/fees
```

requires:

```text
authenticated
AND
tenant active
AND
fees module enabled
AND
fees.view permission
```

---

# 24. Route Guard Architecture

A centralized authorization mechanism should be used.

Conceptually:

```text
<ProtectedRoute
   permission="fees.view"
   feature="fees"
/>
```

Do not duplicate complex authorization logic in every page.

---

# 25. Module Architecture

The ERP should be modular.

Recommended conceptual structure:

```text
src/
  modules/
    dashboard/
    students/
    parents/
    staff/
    admissions/
    attendance/
    academics/
    batches/
    fees/
    payments/
    exams/
    homework/
    timetable/
    communication/
    reports/
    settings/
```

Each module should contain its own:

- Pages.
- Components.
- Hooks.
- Services.
- Types.
- Validation.
- Business logic where appropriate.

---

# 26. Shared Components

Common components should live separately.

Example:

```text
src/
  components/
    ui/
    forms/
    tables/
    modals/
    navigation/
    charts/
    feedback/
```

Do not duplicate common UI components across modules.

---

# 27. Design System

The application should have a consistent design system.

Define:

- Typography.
- Spacing.
- Border radius.
- Buttons.
- Inputs.
- Selects.
- Tables.
- Cards.
- Badges.
- Alerts.
- Dialogs.
- Navigation.
- Icons.

The UI should feel like one product rather than multiple unrelated dashboards.

---

# 28. UI Philosophy

The interface should be:

- Clean.
- Professional.
- Modern.
- Fast.
- Easy to scan.
- Low-friction.
- Mobile-friendly.

Avoid unnecessary:

- Gradients.
- Decorative animations.
- Excessive shadows.
- Huge cards.
- Dense unreadable tables.
- Long forms without sections.

---

# 29. Dashboard Architecture

The dashboard should be configurable based on:

```text
Tenant Type
User Role
Enabled Modules
Permissions
```

Example Admin dashboard:

```text
Students
Attendance
Fees
Admissions
Exams
Outstanding Fees
Recent Activity
Announcements
```

Teacher dashboard:

```text
Today's Classes
Attendance
Homework
Upcoming Tests
Assigned Batches
Announcements
```

Parent dashboard:

```text
Children
Attendance
Fees
Homework
Results
Timetable
Notifications
```

---

# 30. Data Fetching

Data fetching should be centralized and predictable.

The application may use a dedicated server-state/data-fetching library where appropriate.

The architecture should distinguish:

```text
Server State
```

from:

```text
UI State
```

---

# 31. Server State

Examples:

- Students.
- Fees.
- Attendance.
- Exams.
- Payments.
- Announcements.

These are server-owned data.

They should not be treated as permanent local state.

---

# 32. UI State

Examples:

- Modal open/closed.
- Selected tab.
- Search text.
- Temporary form values.
- Sidebar state.
- Filter visibility.

These belong to the frontend.

---

# 33. Form Architecture

Forms should have:

- Client-side validation.
- Server/database validation.
- Clear labels.
- Helpful error messages.
- Loading states.
- Success feedback.
- Unsaved-change handling where appropriate.

Do not rely only on HTML validation.

---

# 34. Validation

Validation should exist at appropriate layers.

```text
Form Validation
      ↓
Application Validation
      ↓
Database Constraints
```

For important business rules, validation must not exist only in the frontend.

---

# 35. Error Handling

The application must have centralized error handling.

Errors should be categorized:

```text
Authentication Error
Authorization Error
Validation Error
Not Found
Conflict
Network Error
Server Error
Unknown Error
```

---

# 36. Error UX

Errors should be understandable.

Bad:

```text
PostgrestError: 23505
```

Better:

```text
This student already exists.
Please check the admission number.
```

Technical details may be logged internally.

---

# 37. Loading States

Every data-dependent interface should handle loading.

Examples:

```text
Skeleton
Spinner
Progress indicator
Disabled submit button
```

Avoid blank screens while data loads.

---

# 38. Empty States

Every list/table should have a useful empty state.

Example:

```text
No students found.

Try changing your search or filters.
```

For a new tenant:

```text
No batches have been created yet.

Create your first batch to get started.
```

---

# 39. Offline / Poor Network

The initial MVP does not need a fully offline ERP.

However, the application should gracefully handle:

- Slow connections.
- Temporary network failures.
- Request retries where appropriate.
- Duplicate submissions.

Attendance workflows should be designed carefully because users may operate on mobile devices with unstable connectivity.

---

# 40. Duplicate Submission Protection

Actions such as:

```text
Record Payment
Submit Attendance
Publish Results
Create Admission
```

must not accidentally execute twice because the user double-clicked.

Use:

- Loading states.
- Disabled submit controls.
- Idempotency where necessary.
- Backend uniqueness constraints.

---

# 41. Search Architecture

Large datasets should not be loaded entirely into the browser.

Use server-side search where appropriate.

Examples:

```text
Search Students
Search Parents
Search Payments
Search Admissions
Search Batches
```

---

# 42. Pagination

Large tables must use pagination or controlled infinite loading.

Avoid:

```text
SELECT every student
```

for large tenants.

Use:

```text
page
page_size
cursor
filters
sort
```

as appropriate.

---

# 43. Filtering

Filters should be server-aware where datasets are large.

Example:

```text
Students
  ↓
Class
Section
Status
Gender
Admission Year
Search
```

The database should do the heavy filtering rather than the browser whenever practical.

---

# 44. Sorting

Tables should support predictable sorting.

Examples:

```text
Student Name
Admission Date
Fee Due Date
Payment Date
Attendance Date
Test Score
```

Sorting should be performed server-side for large datasets.

---

# 45. File Upload Architecture

Files should be uploaded through controlled storage mechanisms.

Examples:

- Student documents.
- Profile images.
- Certificates.
- Homework attachments.
- Institution logo.

File uploads must validate:

- File type.
- File size.
- Ownership.
- Tenant.
- Storage path.

---

# 46. Private Files

Sensitive documents should normally be private.

Examples:

```text
Student Documents
Identity Documents
Certificates
Payment Documents
Administrative Files
```

Access should be granted through authorized application flows.

---

# 47. Public Files

Only genuinely public assets should be public.

Examples:

```text
Tenant Logo
Public Announcement Image
Public Website Assets
```

Do not make student documents public for convenience.

---

# 48. Realtime Architecture

Realtime should only be used where it improves the product.

Potential use cases:

```text
Notifications
Live attendance updates
Payment status
Admin activity
Chat
```

Do not add realtime subscriptions everywhere by default.

---

# 49. Notifications Architecture

Notifications should have a common model.

Conceptually:

```text
Notification
 |
 +-- user_id
 +-- tenant_id
 +-- type
 +-- title
 +-- message
 +-- read_at
 +-- created_at
```

Potential notification channels:

```text
In-App
Email
WhatsApp
SMS
```

Channels can be added incrementally.

---

# 50. Background Processing

Some tasks should not block the user interface.

Examples:

- Bulk imports.
- Report generation.
- Large exports.
- Notification delivery.
- Email sending.
- WhatsApp processing.
- Data processing.

These should eventually use asynchronous jobs/functions where appropriate.

---

# 51. Edge Functions

Supabase Edge Functions may be used for operations requiring:

- Secure server-side logic.
- External API secrets.
- Webhooks.
- Payment verification.
- Notification sending.
- Sensitive business operations.

Secrets must never be exposed to the frontend.

---

# 52. Environment Variables

Environment-specific values must be stored securely.

Examples:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
PAYMENT_SECRET
WHATSAPP_SECRET
EMAIL_API_KEY
```

Never commit private secrets to Git.

---

# 53. Public vs Secret Keys

Frontend code may contain public client configuration where appropriate.

Secret credentials must only exist in:

```text
Server
Edge Functions
Secure deployment environment
```

Never expose payment or messaging secrets in React bundles.

---

# 54. External Integrations

The architecture should isolate integrations.

Conceptually:

```text
Application
    |
    +-- Payment Service
    +-- WhatsApp Service
    +-- Email Service
    +-- SMS Service
```

Do not tightly couple business logic to one provider.

---

# 55. Payment Architecture

Payment providers should be abstracted.

Conceptually:

```text
PaymentService
     |
     +-- Razorpay
     +-- Future Provider
```

The ERP should operate on its own payment domain model.

The provider should be an integration layer.

---

# 56. WhatsApp Architecture

WhatsApp should also be treated as an integration.

Conceptually:

```text
CommunicationService
       |
       +-- In-App
       +-- Email
       +-- WhatsApp
       +-- SMS
```

This allows the communication system to evolve without rewriting the ERP.

---

# 57. Audit Architecture

Important actions should create audit records.

Example:

```text
AuditEvent
 |
 +-- tenant_id
 +-- user_id
 +-- action
 +-- resource_type
 +-- resource_id
 +-- metadata
 +-- created_at
```

Audit logs must themselves be protected.

---

# 58. Reporting Architecture

Reports should be generated from trusted database data.

Examples:

```text
Attendance Report
Fee Collection Report
Outstanding Fees
Student Performance
Admission Report
Batch Performance
```

Reports should respect:

- Tenant.
- User permissions.
- Date filters.
- Resource scope.

---

# 59. Export Architecture

Exports should support formats such as:

```text
CSV
Excel
PDF
```

depending on the feature.

Large exports should preferably be generated asynchronously.

---

# 60. Import Architecture

Bulk imports should be treated as controlled workflows.

Example:

```text
Upload CSV
 ↓
Parse
 ↓
Validate
 ↓
Show Preview
 ↓
Identify Errors
 ↓
Confirm Import
 ↓
Process
 ↓
Report Result
```

Never blindly insert uploaded spreadsheet data.

---

# 61. Database Access Rule

Do not allow arbitrary database operations throughout the frontend.

Avoid hundreds of files containing:

```text
supabase.from(...)
```

with duplicated logic.

Centralize important domain operations.

---

# 62. Service Architecture

Recommended conceptual services:

```text
authService
tenantService
userService
studentService
parentService
staffService
admissionService
attendanceService
academicService
batchService
feeService
paymentService
examService
homeworkService
timetableService
notificationService
communicationService
reportService
fileService
auditService
```

Not every service must exist as a separate physical file immediately.

The goal is clear domain boundaries.

---

# 63. Shared Domain Models

Shared types should be centralized.

Examples:

```text
Tenant
User
Membership
Student
Parent
Teacher
Class
Batch
Enrollment
Attendance
Fee
Payment
Exam
Result
Homework
Timetable
Notification
```

Database-generated types should be leveraged where practical.

---

# 64. Naming Convention

Use consistent naming.

Recommended:

```text
camelCase
```

for TypeScript variables/functions.

Use clear domain names:

```text
studentId
tenantId
batchId
feeId
paymentId
```

Avoid ambiguous names such as:

```text
id1
data2
temp
stuff
```

---

# 65. Folder Structure

A recommended initial structure:

```text
src/
│
├── app/
│   ├── routes/
│   ├── providers/
│   └── layouts/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── navigation/
│   └── feedback/
│
├── modules/
│   ├── dashboard/
│   ├── students/
│   ├── parents/
│   ├── staff/
│   ├── admissions/
│   ├── attendance/
│   ├── academics/
│   ├── batches/
│   ├── fees/
│   ├── payments/
│   ├── exams/
│   ├── homework/
│   ├── timetable/
│   ├── communication/
│   ├── reports/
│   └── settings/
│
├── services/
│
├── hooks/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── permissions/
│   └── utilities/
│
├── types/
│
├── config/
│
└── styles/
```

This is a recommended starting structure, not a requirement to create every folder immediately.

---

# 66. Configuration Architecture

Centralize application configuration.

Examples:

```text
appConfig
moduleRegistry
permissionRegistry
tenantConfig
navigationConfig
```

Avoid hardcoding configuration across pages.

---

# 67. Module Registry

The application should have a central concept of modules.

Example:

```text
students
attendance
fees
exams
homework
transport
library
leadCRM
```

Each module can define:

```text
key
label
tenantTypes
requiredPermissions
dependencies
enabled
```

---

# 68. School vs Coaching

The architecture should share common foundations.

Common:

```text
Students/Learners
Attendance
Fees
Payments
Users
Communication
Reports
Documents
Notifications
```

School-specific:

```text
Classes
Sections
Academic Years
Report Cards
Transport
Library
```

Coaching-specific:

```text
Courses
Batches
Test Series
Lead CRM
Counselling
```

---

# 69. Do Not Fork the Application

Do NOT create:

```text
SchoolApp
CoachingApp
```

as two unrelated applications.

Prefer:

```text
ERP Platform
    |
    +-- School Modules
    +-- Coaching Modules
    +-- Shared Modules
```

---

# 70. Business Logic Boundaries

Example:

Bad:

```text
StudentPage.tsx

500 lines:
UI
Database
Validation
Fees
Attendance
Notifications
Business Rules
```

Better:

```text
StudentPage
     ↓
StudentService
     ↓
Database
```

with reusable domain logic.

---

# 71. Security Architecture

Security must exist at multiple layers.

```text
Browser
 ↓
Route Protection
 ↓
Application Authorization
 ↓
Supabase Auth
 ↓
RLS
 ↓
Database Constraints
```

No single layer should be considered sufficient.

---

# 72. Tenant Security

Every tenant-owned operation must ultimately respect:

```text
tenant_id
```

and membership/RLS rules.

This requirement comes directly from the multi-tenant architecture.

---

# 73. Permission Security

Frontend:

```text
can("students.create")
```

Backend:

```text
authorize(...)
```

Database:

```text
RLS
```

All three should reinforce one another.

---

# 74. Database Constraints

Important business rules should also be enforced by the database.

Examples:

```text
NOT NULL
UNIQUE
FOREIGN KEY
CHECK
```

where appropriate.

---

# 75. Performance Architecture

Performance priorities:

1. Fast initial load.
2. Fast navigation.
3. Efficient database queries.
4. Pagination.
5. Lazy loading.
6. Minimal unnecessary requests.
7. Optimized assets.
8. Good mobile performance.

---

# 76. Code Splitting

Large modules should be lazy-loaded where appropriate.

For example:

```text
Reports
Exams
Settings
Analytics
```

do not necessarily need to be downloaded before the user opens them.

---

# 77. Caching

Cache only data where caching is safe.

Tenant-sensitive data must never be shared across tenant contexts.

Cache keys must account for:

```text
tenant
user
permissions
filters
```

when required.

---

# 78. Accessibility

The application should aim for accessible interfaces.

Important requirements:

- Keyboard navigation.
- Proper labels.
- Visible focus.
- Sufficient contrast.
- Semantic HTML.
- Accessible dialogs.
- Screen-reader-friendly controls.

Accessibility should be part of component design rather than added at the end.

---

# 79. Internationalization Readiness

The initial product may primarily target India.

However, the architecture should avoid hardcoding:

```text
₹
DD/MM/YYYY
English-only labels
```

into every component.

Tenant configuration should eventually control:

- Currency.
- Date format.
- Language.
- Timezone.

---

# 80. Indian Market Readiness

The initial product should support common Indian requirements such as:

```text
INR
Indian phone numbers
Indian address structure
GST-related financial requirements where applicable
WhatsApp communication
UPI/payment integrations through supported providers
```

Exact compliance requirements should be handled separately when the relevant feature is implemented.

---

# 81. Logging

Logging should capture useful technical information without exposing sensitive data.

Useful fields:

```text
timestamp
request_id
tenant_id
user_id
operation
status
duration
error_code
```

Do not log:

```text
passwords
authentication tokens
payment secrets
private documents
unnecessary personal information
```

---

# 82. Monitoring

The production system should eventually monitor:

```text
Error rate
API failures
Database errors
Slow queries
Authentication failures
Payment failures
Notification failures
Storage failures
```

Monitoring infrastructure can evolve after MVP.

---

# 83. Testing Architecture

The project should eventually contain:

```text
Unit Tests
Integration Tests
Authorization Tests
RLS Tests
End-to-End Tests
```

Priority should be given to:

- Authentication.
- Authorization.
- Tenant isolation.
- Payments.
- Attendance.
- Fees.
- Admissions.

---

# 84. Critical Security Tests

Before production:

```text
Tenant A → Tenant B data
Parent → Other Student
Teacher → Unassigned Batch
Staff → Unauthorized Financial Data
Inactive User → Application
Suspended Tenant → Application
Direct Route → Unauthorized Page
Modified API → Unauthorized Resource
```

All must fail correctly.

---

# 85. Deployment Architecture

Recommended conceptual deployment:

```text
Git Repository
      |
      ↓
CI/CD
      |
      +--------+
      |        |
   Preview   Production
      |        |
      ↓        ↓
   Hosting   Hosting
                |
                ↓
             Supabase
```

---

# 86. Development Environments

Use separate environments where practical:

```text
Development
Staging
Production
```

Do not experiment directly on production data.

---

# 87. Environment Separation

Each environment should have appropriate:

- Database.
- Environment variables.
- Storage.
- API credentials.
- External integrations.

Production secrets must not be copied into development unnecessarily.

---

# 88. Git Workflow

The project should use version control from the beginning.

Recommended:

```text
main
develop
feature/*
fix/*
```

Exact workflow can be simplified for a small team.

---

# 89. Migration Strategy

Database changes must be version-controlled.

Do not manually change production database structure without recording the migration.

Every schema change should have a reproducible migration.

---

# 90. Seed Data

Development should have safe seed data.

Example:

```text
Demo School
Demo Coaching Centre
Demo Admin
Demo Teacher
Demo Parent
Demo Student
```

Production must never accidentally receive development/demo credentials.

---

# 91. API Design

Although Supabase provides direct database access, the architecture should still think in terms of domain operations.

Examples:

```text
createStudent
assignStudentToBatch
markAttendance
recordPayment
publishExamResult
sendAnnouncement
```

This makes future API/mobile-app development easier.

---

# 92. Future Mobile Application

The architecture should not prevent future native mobile applications.

Potential future clients:

```text
Web App
    |
    +-- Admin Portal
    +-- Teacher Portal
    +-- Parent Portal
    +-- Student Portal

Mobile App
    |
    +-- Parent
    +-- Teacher
    +-- Student
```

The backend/domain architecture should remain shared.

---

# 93. Future Public Website

A future tenant may have:

```text
Public Website
       |
       ↓
ERP Backend
```

The public website should not receive unrestricted access to private ERP data.

Public and private data should have clear boundaries.

---

# 94. Future AI Layer

The architecture should eventually allow AI features.

Potential examples:

```text
AI Student Insights
AI Attendance Analysis
AI Fee Follow-up Suggestions
AI Report Summaries
AI Admission Assistant
AI Communication Drafting
```

AI must operate within tenant and user authorization boundaries.

AI should never become a security bypass.

---

# 95. Future Analytics Layer

The application should eventually support analytics such as:

```text
Attendance Trends
Fee Collection
Admission Conversion
Student Performance
Batch Performance
Teacher Activity
Engagement
```

Analytics must remain tenant-aware.

---

# 96. Architecture Principle: Simple First

Do not over-engineer the MVP.

Avoid introducing:

- Microservices.
- Kubernetes.
- Complex event buses.
- Multiple backend servers.
- Distributed databases.

unless scale or business requirements justify them.

A modular monolith is the preferred starting architecture.

---

# 97. Modular Monolith

The recommended initial architecture is:

```text
                 ERP APPLICATION
                       |
        +--------------+--------------+
        |              |              |
     Students       Finance       Academics
        |              |              |
        +--------------+--------------+
                       |
                 Shared Backend
                       |
                    Supabase
```

Modules are logically separated while remaining within one application.

---

# 98. Why Modular Monolith

Benefits:

- Faster development.
- Easier debugging.
- Lower infrastructure complexity.
- Shared types.
- Shared authentication.
- Shared authorization.
- Easier deployment.
- Easier local development.

The system can later extract services if required.

---

# 99. Architecture Evolution

Potential future evolution:

```text
PHASE 1
Modular Monolith
      ↓
PHASE 2
Scale Database + Background Jobs
      ↓
PHASE 3
Dedicated Services Where Needed
      ↓
PHASE 4
Enterprise Infrastructure
```

Do not jump directly to Phase 4.

---

# 100. Antigravity Implementation Rules

Antigravity MUST:

1. Use TypeScript.
2. Use a modular React architecture.
3. Keep business logic separate from UI.
4. Keep database access organized.
5. Use centralized authorization.
6. Use tenant-aware architecture from day one.
7. Use Supabase Auth.
8. Use PostgreSQL through Supabase.
9. Use RLS for tenant isolation.
10. Use private storage for sensitive files.
11. Build mobile-first.
12. Make navigation permission-aware.
13. Make modules feature-aware.
14. Use server-side pagination for large datasets.
15. Avoid loading entire datasets unnecessarily.
16. Centralize configuration.
17. Centralize permission definitions.
18. Protect sensitive operations.
19. Record important audit events.
20. Never expose secrets in frontend code.
21. Never trust frontend authorization.
22. Never fork the codebase into separate school/coaching applications.
23. Keep school and coaching domain differences configurable/modular.
24. Prefer a modular monolith for the MVP.
25. Avoid unnecessary infrastructure complexity.
26. Keep the architecture ready for future mobile apps.
27. Keep external integrations behind service boundaries.
28. Version-control database migrations.
29. Test tenant isolation explicitly.
30. Treat security as a foundational requirement, not a later feature.

---

# 101. Architecture Decision Summary

The intended technical architecture is:

```text
                    USERS
                      |
                      ↓
               React + TypeScript
                      |
          +-----------+-----------+
          |           |           |
        Auth       Tenant      Permissions
          |           |           |
          +-----------+-----------+
                      |
                Modular ERP
                      |
       +--------------+--------------+
       |              |              |
    School         Coaching       Shared
    Modules        Modules        Modules
       |              |              |
       +--------------+--------------+
                      |
                 Service Layer
                      |
                      ↓
                   Supabase
                      |
          +-----------+-----------+
          |           |           |
      PostgreSQL    Storage    Realtime
          |
         RLS
          |
    Tenant Isolation
```

---

# 102. Final Architecture Principle

The application should be built as:

> **One secure, multi-tenant, modular ERP platform with shared infrastructure, configurable school/coaching capabilities, centralized authorization, and database-enforced tenant isolation.**

The goal is not to build the biggest possible architecture.

The goal is to build the **simplest architecture that can safely grow into the complete SaaS product.**

---

# 103. Relationship With Other Documents

This document connects:

```text
03-USER-ROLES-AND-PERMISSIONS.md
             ↓
04-MULTI-TENANT-ARCHITECTURE.md
             ↓
05-SYSTEM-ARCHITECTURE.md
             ↓
06-DATABASE-ARCHITECTURE.md
```

The next document must define the actual database architecture.

It will cover:

- PostgreSQL structure.
- Schema organization.
- Core tables.
- Relationships.
- Primary/foreign keys.
- Tenant columns.
- Constraints.
- Indexing.
- RLS architecture.
- Audit tables.
- Configuration tables.
- Storage relationships.
- Database naming conventions.
- Migration strategy.

---

# END OF DOCUMENT
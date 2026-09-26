# ROUTING, NAVIGATION & ROLE ACCESS
# School + Coaching Centre ERP SaaS

**Document:** `37-ROUTING-NAVIGATION-AND-ROLE-ACCESS.md`  
**Version:** 1.0  
**Status:** Canonical Routing & Access Specification  
**Previous Document:** `36-FRONTEND-ARCHITECTURE-AND-DESIGN-SYSTEM.md`  
**Next Document:** `38-AUTHENTICATION-AND-AUTHORIZATION-FLOW.md`

---

# 1. Purpose

This document defines how users navigate the ERP and how access to routes is controlled.

The routing architecture must support:

```text
Authentication
Multi-Tenancy
Branch Context
Role-Based Access
Permission-Based Access
Protected Routes
Deep Links
Mobile Navigation
Desktop Navigation
Session Expiration
Unauthorized Access
```

---

# 2. Core Security Principle

The frontend route system is responsible for:

```text
UX
Navigation
Visibility
Redirects
```

The backend is responsible for:

```text
Actual Authorization
Data Access
Security
Tenant Isolation
Permission Enforcement
```

Never treat frontend route protection as a security boundary.

---

# 3. Route Architecture

The application should conceptually follow:

```text
/
├── Public
│   ├── Login
│   ├── Forgot Password
│   └── Other Public Pages
│
└── Application
    ├── Dashboard
    ├── Students
    ├── Academics
    ├── Attendance
    ├── Exams
    ├── Fees
    ├── Payments
    ├── Communication
    ├── Reports
    └── Settings
```

The exact route names may follow the implementation framework.

---

# 4. Public Routes

Public routes are accessible without an authenticated session.

Typical routes:

```text
/login
/forgot-password
/reset-password
```

Additional public routes should only exist when required by the product.

---

# 5. Authentication Redirect

If an unauthenticated user attempts to access a protected route:

```text
Protected Route
      ↓
No Session
      ↓
Login
```

After successful authentication, the user may be returned to the originally requested route when safe.

---

# 6. Authenticated Application Routes

Authenticated routes should be grouped under the application shell.

Conceptually:

```text
/app
```

or an equivalent routing structure.

---

# 7. Dashboard

Primary route:

```text
/dashboard
```

The dashboard content must depend on:

```text
Tenant Type
User Role
Permissions
Branch Context
```

---

# 8. Students Routes

Conceptual structure:

```text
/students
/students/new
/students/:studentId
/students/:studentId/edit
```

Additional nested routes may include:

```text
/students/:studentId/attendance
/students/:studentId/fees
/students/:studentId/exams
/students/:studentId/documents
```

The final route structure should remain consistent throughout the application.

---

# 9. Academic Routes

School academic routes may include:

```text
/academics
/academics/years
/academics/classes
/academics/sections
/academics/subjects
```

---

# 10. Coaching Routes

Coaching routes may include:

```text
/coaching
/coaching/courses
/coaching/batches
/coaching/enrollments
```

These routes should only appear where the tenant's configuration/business type supports them.

---

# 11. Attendance Routes

Conceptually:

```text
/attendance
/attendance/mark
/attendance/history
/attendance/reports
```

---

# 12. Exam Routes

Conceptually:

```text
/exams
/exams/new
/exams/:examId
/exams/:examId/marks
/exams/:examId/results
```

---

# 13. Fee Routes

Conceptually:

```text
/fees
/fees/structures
/fees/charges
/fees/outstanding
```

---

# 14. Payment Routes

Conceptually:

```text
/payments
/payments/new
/payments/:paymentId
/payments/history
```

---

# 15. Communication Routes

Conceptually:

```text
/communications
/communications/notifications
/communications/messages
/communications/templates
```

Only expose features supported by the user's permissions.

---

# 16. Reports Routes

Conceptually:

```text
/reports
/reports/students
/reports/attendance
/reports/fees
/reports/exams
```

---

# 17. Settings Routes

Settings should be logically grouped.

Conceptually:

```text
/settings
/settings/profile
/settings/organization
/settings/branches
/settings/users
/settings/roles
/settings/permissions
/settings/integrations
```

---

# 18. Route Naming

Routes should use predictable, human-readable names.

Prefer:

```text
/students
/students/:studentId
```

over inconsistent naming such as:

```text
/manage-stu
/student-profile-page
```

---

# 19. URL Parameters

Use identifiers for resource-specific routes.

Example:

```text
/students/123
```

where `123` represents the student's identifier.

---

# 20. Query Parameters

Use query parameters for temporary view state where appropriate.

Examples:

```text
/students?status=active
/students?class=10
/payments?status=pending
```

---

# 21. Filter Persistence

Important filters may be preserved in the URL so users can:

```text
Refresh
Share
Bookmark
Navigate Back
```

without losing context.

---

# 22. Pagination in URL

Where useful:

```text
/students?page=2
```

or the framework's equivalent.

---

# 23. Search in URL

Search state may use:

```text
/students?search=atif
```

when this improves navigation/history behavior.

---

# 24. Tenant Context

Every authenticated route must operate inside a valid tenant context.

Conceptually:

```text
User
 ↓
Membership
 ↓
Tenant
 ↓
Application
```

---

# 25. Branch Context

Where branch-level functionality exists:

```text
Tenant
 ↓
Branch
 ↓
Route
```

The current branch must be known before executing branch-scoped operations.

---

# 26. Branch Switching

If the user has access to multiple branches, provide a branch selector.

Example:

```text
Current Branch
Aligarh Main Branch ▼
```

Switching branch should update relevant data and navigation context safely.

---

# 27. Tenant Switching

If a user belongs to multiple tenants, tenant switching must be explicit and safe.

Do not silently switch tenant context.

---

# 28. Role Model

Potential roles:

```text
Tenant Admin
Teacher
Accountant
Receptionist
Student
Parent
```

A platform-level administrator may also exist.

The final role list must match the canonical RBAC specification.

---

# 29. Role ≠ Permission

A role is a collection of permissions.

Conceptually:

```text
Role
 ↓
Permissions
 ↓
Actions
```

Do not hard-code business logic everywhere using role names.

Prefer permission checks where practical.

---

# 30. Permission Example

Instead of:

```text
if user.role === "admin"
```

prefer:

```text
if user.can("students.create")
```

when the permission system supports it.

---

# 31. Route Permission

Every protected feature should define the permission required to access it.

Example:

```text
/students
```

may require:

```text
students.view
```

while:

```text
/students/new
```

may require:

```text
students.create
```

---

# 32. Route Permission Matrix

Conceptual:

| Route | Permission |
|---|---|
| `/students` | `students.view` |
| `/students/new` | `students.create` |
| `/students/:id/edit` | `students.update` |
| `/attendance` | `attendance.view` |
| `/attendance/mark` | `attendance.mark` |
| `/payments` | `payments.view` |
| `/payments/new` | `payments.create` |
| `/exams` | `exams.view` |
| `/exams/:id/marks` | `marks.manage` |
| `/reports` | `reports.view` |
| `/settings/users` | `users.manage` |

The actual permission identifiers must match the canonical permission catalog.

---

# 33. Permission Guard

A route guard should conceptually perform:

```text
Authenticated?
      ↓
Tenant Valid?
      ↓
Branch Valid if Required?
      ↓
Permission Granted?
      ↓
Allow Route
```

Otherwise:

```text
Unauthorized
```

---

# 34. Unauthorized Page

Users who are authenticated but lack permission should see a clear unauthorized state.

Example:

```text
Access restricted

You don't have permission to access this page.

[Go to Dashboard]
```

Do not expose sensitive information about the protected resource.

---

# 35. Not Found Page

Invalid routes should display a dedicated 404 page.

Example:

```text
Page not found

The page you're looking for doesn't exist.

[Go to Dashboard]
```

---

# 36. Resource Not Found

A valid route with an invalid resource ID should show:

```text
Student not found
```

rather than a generic application crash.

---

# 37. Tenant Resource Not Found

If a resource belongs to another tenant, the system should not reveal that fact.

It should behave like an inaccessible/nonexistent resource.

---

# 38. Route Guard Architecture

Keep route protection centralized.

Avoid repeating complex authorization logic independently in every page.

Conceptually:

```text
ProtectedRoute
PermissionRoute
TenantRoute
BranchRoute
```

may be implemented as reusable guards.

---

# 39. Authentication Guard

Responsibilities:

```text
Check Session
Check Session Validity
Load User
Load Membership
Redirect if Unauthenticated
```

---

# 40. Tenant Guard

Responsibilities:

```text
Determine Active Tenant
Validate Membership
Validate Tenant Status
```

---

# 41. Branch Guard

Responsibilities:

```text
Determine Active Branch
Validate User Branch Access
Prevent Unauthorized Branch Context
```

---

# 42. Permission Guard

Responsibilities:

```text
Check Required Permission
Allow / Deny Navigation
```

---

# 43. Route Loading

Protected routes should not render protected content before authorization state is known.

Avoid:

```text
Loading...
↓
Sensitive Page briefly visible
↓
Redirect
```

---

# 44. Authorization Loading

Use a centralized loading state while authentication and permissions are being resolved.

---

# 45. Session Expiration

If the user's session expires:

```text
API Request
 ↓
Session Expired
 ↓
Clear Invalid Session
 ↓
Redirect to Login
```

---

# 46. Return URL

When appropriate, preserve the intended destination:

```text
/login?redirect=/students/123
```

After login:

```text
Login Success
 ↓
/students/123
```

Only allow safe internal redirects.

---

# 47. Avoid Open Redirects

Never redirect users to arbitrary external URLs based on untrusted query parameters.

---

# 48. Role-Based Navigation

Navigation should only show destinations relevant to the user's permissions.

Example:

```text
Teacher
 ├── Dashboard
 ├── Students
 ├── Attendance
 └── Exams
```

Accountant:

```text
Accountant
 ├── Dashboard
 ├── Students
 ├── Fees
 ├── Payments
 └── Reports
```

---

# 49. Hidden vs Disabled Navigation

If a user has no permission for a feature, normally hide it from navigation.

If the feature is important but unavailable because of configuration, a disabled/explained state may be more appropriate.

---

# 50. Navigation Must Match Authorization

Never show:

```text
Payments
```

as available navigation while every payment route immediately produces an authorization error for that same user.

The navigation and authorization system must share the same permission model.

---

# 51. Navigation Configuration

Prefer a centralized navigation configuration.

Conceptually:

```text
NavigationItem {
    label
    path
    icon
    permission
    feature
    children
}
```

This prevents duplicated navigation logic.

---

# 52. Feature Availability

Navigation may depend on:

```text
Permission
+
Tenant Type
+
Feature Configuration
+
Subscription Plan
```

where applicable.

---

# 53. School Navigation

Potential school navigation:

```text
Dashboard

Students

Academics
  Academic Years
  Classes
  Sections
  Subjects

Attendance

Exams

Fees
Payments

Communication

Reports

Settings
```

---

# 54. Coaching Navigation

Potential coaching navigation:

```text
Dashboard

Students

Courses
Batches
Enrollments

Attendance

Tests / Exams

Fees
Payments

Communication

Reports

Settings
```

---

# 55. Hybrid Tenant

A tenant may support both school and coaching functionality if the product requirements allow it.

Navigation should then combine the relevant modules without duplicating shared modules.

---

# 56. Student Navigation

A student should see only student-relevant functionality.

Example:

```text
Dashboard
My Profile
Attendance
Exams
Fees
Documents
Notifications
```

---

# 57. Parent Navigation

A parent may see:

```text
Dashboard
My Children
Attendance
Exams
Fees
Payments
Documents
Notifications
```

---

# 58. Teacher Navigation

A teacher may see:

```text
Dashboard
Students
My Classes / Batches
Attendance
Exams
Marks
Notifications
```

---

# 59. Accountant Navigation

An accountant may see:

```text
Dashboard
Students
Fees
Payments
Outstanding
Reports
```

---

# 60. Receptionist Navigation

A receptionist may see:

```text
Dashboard
Students
Admissions
Attendance
Fees
Payments
Communication
```

depending on permissions.

---

# 61. Tenant Admin Navigation

A tenant administrator may have broader access:

```text
Dashboard
Students
Academics
Attendance
Exams
Fees
Payments
Communication
Reports
Users
Settings
```

---

# 62. Platform Admin Navigation

Platform-level administration must be separated from tenant-level administration.

Conceptually:

```text
Platform Admin
 ↓
Tenants
Users
System Configuration
Platform Monitoring
```

A platform administrator must not accidentally operate inside a tenant context without an explicit context switch.

---

# 63. Mobile Navigation

Mobile navigation should expose only the most important destinations.

Example:

```text
Home
Students
Attendance
Fees
More
```

The exact destinations depend on the role.

---

# 64. Mobile More Menu

Secondary navigation can be placed under:

```text
More
```

but critical workflows should not be buried unnecessarily.

---

# 65. Desktop Sidebar

Desktop may expose a larger navigation tree.

Use grouping and collapsible sections where appropriate.

---

# 66. Breadcrumb Navigation

Breadcrumbs should follow the route hierarchy.

Example:

```text
Students
  /
Class 10
  /
Atif Afsar
```

---

# 67. Back Navigation

Detail workflows should support predictable browser back navigation.

Do not unexpectedly reset the user's previous list/filter state.

---

# 68. List → Detail → Back

Example:

```text
Students
 ↓
Student Profile
 ↓
Back
 ↓
Students
```

The list should ideally preserve:

```text
Search
Filters
Sort
Pagination
```

where practical.

---

# 69. Deep Links

Every important application page should be directly addressable by URL.

Example:

```text
/students/:studentId
/payments/:paymentId
/exams/:examId
```

---

# 70. Deep Link Authorization

A user opening a deep link must go through the same authorization checks as normal navigation.

Do not assume that because a user has a URL they should have access.

---

# 71. Browser Refresh

Refreshing any valid authenticated route should preserve the route and restore the required application state.

---

# 72. Browser Back/Forward

Application routing must integrate correctly with browser history.

Avoid unnecessary route replacement when push navigation is expected.

---

# 73. Unsaved Form Navigation

If the user has unsaved changes, provide an appropriate warning before leaving a form.

---

# 74. Route-Level Code Splitting

Large modules should be lazy-loaded where useful.

Potential modules:

```text
Students
Academics
Attendance
Exams
Finance
Reports
Settings
```

---

# 75. Route-Level Loading

Lazy-loaded routes should have intentional loading states.

Avoid blank screens during module loading.

---

# 76. Error Recovery

If a route-level component fails:

```text
Feature Error
 ↓
Retry
```

rather than crashing the entire application.

---

# 77. Permission Changes

If permissions change while the user is logged in, the application must eventually refresh the authorization state.

A previously accessible route must not remain permanently accessible after authorization has been revoked.

---

# 78. Deactivated User

If a user is deactivated:

```text
Active Session
 ↓
Authorization Failure / Session Refresh
 ↓
Logout
 ↓
Login
```

according to the authentication implementation.

---

# 79. Suspended Tenant

If a tenant is suspended, tenant users must not continue accessing normal tenant functionality.

The application should show an appropriate tenant status page.

---

# 80. Subscription Feature Gating

If subscription-based feature gating exists:

```text
Permission
+
Feature Enabled
+
Subscription Entitlement
```

may all be required.

---

# 81. Feature Gating ≠ Security

Frontend feature gating is not a replacement for backend enforcement.

---

# 82. Route Metadata

Routes should ideally define metadata such as:

```text
title
permission
feature
role
layout
breadcrumb
```

This makes routing predictable.

---

# 83. Example Route Definition

Conceptually:

```text
{
  path: "/students",
  title: "Students",
  permission: "students.view",
  layout: "app"
}
```

---

# 84. Route Naming Consistency

Use consistent terminology.

If the database/business domain calls the entity:

```text
Student
```

do not randomly call it:

```text
Learner
Pupil
Candidate
```

in different routes unless those are intentionally distinct concepts.

---

# 85. Navigation Terminology

Navigation labels should match:

```text
Database Domain
API Domain
Permission Domain
Business Terminology
```

This prevents confusion across the product.

---

# 86. Permission Naming

Permission identifiers should follow a predictable pattern.

Example:

```text
students.view
students.create
students.update
students.archive
```

Another domain:

```text
payments.view
payments.create
payments.refund
```

---

# 87. CRUD Permission Model

Where appropriate:

```text
view
create
update
delete/archive
```

may form the basic permission set.

Sensitive actions should receive more granular permissions.

---

# 88. Sensitive Permissions

Examples:

```text
payments.refund
payments.void
results.publish
users.manage
roles.manage
```

should not automatically be granted because a user can view the related resource.

---

# 89. Navigation Permission Rule

If:

```text
students.view = false
```

then the Students navigation item should generally not be displayed.

---

# 90. Action Permission Rule

If:

```text
students.update = false
```

the user may still access:

```text
/students/:id
```

if they have:

```text
students.view
```

but should not see/use the Edit action.

---

# 91. Route vs Action Permissions

These are different:

```text
Route Permission
→ Can access page?

Action Permission
→ Can perform operation?
```

Both must be implemented where required.

---

# 92. Example

Teacher:

```text
students.view = true
students.create = false
students.update = false
```

Result:

```text
Can view students
Cannot add students
Cannot edit students
```

---

# 93. API Enforcement

Even if the frontend hides:

```text
Add Student
```

the backend must still reject unauthorized:

```text
POST /students
```

requests.

---

# 94. Route Access Testing

Every protected route should have tests for:

```text
Unauthenticated
Authorized
Unauthorized
Wrong Tenant
Wrong Branch
Invalid Resource
```

---

# 95. Navigation Testing

Verify that each role sees the correct navigation.

Example:

```text
Teacher → no User Management
Accountant → no Exam Management unless permitted
Parent → no Tenant Settings
Student → no Payment Administration
```

---

# 96. Tenant Isolation Testing

Test:

```text
User A + Tenant A
        ↓
Tenant A routes ✓

User A + Tenant B resource
        ↓
Denied
```

---

# 97. Branch Isolation Testing

Where branch restrictions apply:

```text
User assigned Branch A
        ↓
Branch A resource ✓
Branch B resource ✗
```

---

# 98. Route Security Checklist

```text
☐ Authentication required
☐ Tenant context validated
☐ Branch context validated where applicable
☐ Route permission defined
☐ Backend authorization exists
☐ Unauthorized state implemented
☐ Resource-not-found state implemented
☐ Deep links tested
☐ Refresh tested
☐ Browser back tested
☐ Session expiration tested
```

---

# 99. Navigation Checklist

```text
☐ Navigation is role-aware
☐ Navigation is permission-aware
☐ Tenant type is respected
☐ Feature availability is respected
☐ Mobile navigation works
☐ Desktop sidebar works
☐ Active state is correct
☐ Breadcrumbs are correct
☐ No unauthorized links
☐ Terminology is consistent
```

---

# 100. Final Routing Principle

> **Routing must provide a predictable and role-aware navigation experience while maintaining strict separation between frontend UX and backend security. Every protected route must resolve authentication, tenant context, branch context where applicable, and permissions before rendering protected content. Navigation must derive from the same permission and feature model used by route guards, while backend authorization remains the final security boundary.**

---

# 101. Next Document

```text
38-AUTHENTICATION-AND-AUTHORIZATION-FLOW.md
```

This document will define:

```text
Authentication Architecture
Login
Logout
Session Management
Password Reset
Email Verification
User Invitations
Tenant Membership
Role Assignment
Permission Resolution
Session Expiration
Refresh Tokens
Protected APIs
RLS Interaction
Security Boundaries
Account Deactivation
Tenant Suspension
```

---

# END OF DOCUMENT
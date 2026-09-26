# Product Requirements Document (PRD)
# School + Coaching Centre ERP SaaS

**Document:** 01-PRODUCT-REQUIREMENTS.md  
**Version:** 1.0  
**Status:** Core Product Specification  
**Previous Document:** 00-MASTER-PROJECT-CONTEXT.md  
**Next Document:** 02-PRODUCT-VISION-AND-SCOPE.md

---

# 1. Purpose

This document defines the functional and product requirements for the School + Coaching Centre ERP SaaS.

The system must be designed as a reusable education-management platform capable of supporting two primary tenant types:

1. Schools
2. Coaching Centres / Institutes

The system should initially be capable of serving a specific school client while simultaneously being architected for future conversion into a multi-tenant SaaS product.

The application must NOT be architected as a single-school application that is later converted into SaaS.

Multi-tenancy, tenant isolation, configurable features, configurable terminology, and role-based access must be considered foundational requirements from the beginning.

---

# 2. Product Objective

The product should provide educational institutions with a modern, lightweight, customizable ERP that manages their major day-to-day operations from a single platform.

The primary objectives are:

- Reduce administrative workload.
- Centralize student/learner information.
- Simplify attendance management.
- Manage fees and payments.
- Manage admissions/enrollments.
- Manage classes/batches.
- Manage examinations and results.
- Manage timetables.
- Manage homework and assignments.
- Improve communication with parents and students.
- Provide useful dashboards and reports.
- Support QR-based workflows.
- Eventually provide AI-powered assistance.
- Allow different institutions to enable only the modules they need.

The product should compete primarily through:

- Better usability.
- Faster performance.
- Simpler workflows.
- Customization.
- Affordable pricing.
- Responsive support.
- Faster client-specific development.

---

# 3. Target Customers

## 3.1 Primary Customer: Schools

The School configuration should support:

- Students
- Parents
- Teachers
- Staff
- Classes
- Sections
- Academic years
- Admissions
- Attendance
- Fees
- Examinations
- Report cards
- Homework
- Timetables
- Communication
- Certificates

Optional school-specific modules may include:

- Transport
- Library
- Hostel
- Alumni
- Visitor management
- Lesson planning

---

# 3.2 Secondary Customer: Coaching Centres

The Coaching Centre configuration should support:

- Learners/students
- Parents
- Faculty
- Courses
- Batches
- Subjects
- Enrollments
- Attendance
- Fees
- Installments
- Tests
- Test series
- Rank comparison
- Homework/practice sheets
- Timetables
- Lead/inquiry management
- Communication

Coaching centres must NOT be forced into a school-style academic-year model.

Students must be able to:

- Join at different dates.
- Belong to multiple batches.
- Enroll in different courses.
- Have different fee plans.
- Take tests belonging to different test series.

---

# 4. Core Product Principle

The system should use a common ERP engine with tenant-specific configuration.

The application should NOT create completely separate codebases for schools and coaching centres.

Instead:

```text
                    ERP CORE
                       |
          +------------+------------+
          |                         |
       SCHOOL                   COACHING
          |                         |
       Config                    Config
          |                         |
   "Class/Section"              "Batch"
   "Student"                    "Learner"
   "Academic Year"              "Course"
   "Parent"                     "Enrollment"
```

The underlying database and business logic should be reusable wherever practical.

---

# 5. Tenant Concept

Every organization using the system is a tenant.

Examples:

```text
Tenant A
Type: SCHOOL
Name: ABC Public School

Tenant B
Type: COACHING
Name: XYZ Coaching Institute

Tenant C
Type: SCHOOL
Name: Delhi International School
```

Tenant data must remain isolated.

A user belonging to Tenant A must never be able to access Tenant B's data.

Tenant isolation is a critical security requirement.

---

# 6. Tenant Configuration

Every tenant must have configurable settings.

Examples:

```text
tenant_type
organization_name
logo
primary_color
secondary_color
address
contact_information
timezone
academic_year
currency
language
```

The tenant configuration must also determine terminology.

Example:

School:

```text
Class
Section
Student
Parent
Academic Year
Admission
```

Coaching:

```text
Batch
Course
Learner
Parent
Course Period
Enrollment
```

The UI should retrieve these labels from configuration instead of hardcoding them throughout the application.

---

# 7. Feature Toggle System

Every major module should be capable of being enabled or disabled per tenant.

Example:

```text
Attendance          ON
Fee Management      ON
Examinations        ON
Transport           OFF
Library             OFF
Hostel              OFF
AI Assistant        ON
Payroll             OFF
```

If a feature is disabled:

- It should not appear in navigation.
- Users should not be able to access its routes directly.
- Backend operations must also respect the feature state.
- Disabled functionality must not create confusing empty screens.
- Super Admin must be able to enable/disable permitted features.

Feature toggles must be implemented as a proper configuration mechanism, not merely as frontend hiding.

---

# 8. User Types

The system should support multiple levels of users.

## 8.1 Super Admin

Platform-level administrator.

Responsibilities:

- Manage tenants.
- Create tenants.
- Suspend tenants.
- Manage subscriptions.
- Manage platform settings.
- View platform-level metrics.
- Manage available modules.
- Manage onboarding.
- Manage tenant configuration.

Super Admin must have platform-level privileges but tenant data should still be accessed according to explicit platform permissions.

---

## 8.2 Tenant Admin

Organization administrator.

Responsibilities:

- Manage organization settings.
- Manage students/learners.
- Manage staff.
- Manage classes/batches.
- Manage admissions/enrollments.
- Manage fees.
- Manage attendance.
- Manage exams/tests.
- Manage communication.
- Manage enabled modules.

Tenant Admin should only access their own tenant.

---

## 8.3 Teacher / Faculty

Responsibilities may include:

- View assigned classes/batches.
- View students.
- Mark attendance.
- View timetable.
- Create homework.
- Enter marks.
- View student performance.
- Communicate with students/parents where permitted.

Teachers must only see information necessary for their assigned responsibilities.

---

## 8.4 Parent

Parent users should be able to:

- View child profile.
- View attendance.
- View fees.
- View payment history.
- View dues.
- View examination results.
- View report cards.
- View homework.
- View timetable.
- Receive announcements.
- Receive notifications.

A parent with multiple children should be able to switch between children.

---

## 8.5 Student / Learner

Where enabled, students should be able to:

- View profile.
- View attendance.
- View timetable.
- View homework.
- View examination results.
- View fees where appropriate.
- View announcements.
- View assignments.
- View test performance.

---

# 9. Core Modules

The initial ERP should contain the following core modules.

## 9.1 Student/Learner Management

The system must maintain complete student/learner records.

Minimum information should include:

- Name
- Date of birth
- Gender
- Photo
- Contact information
- Address
- Parent/guardian information
- Admission/enrollment information
- Class/batch information
- Status
- Documents where applicable

The system should support active, inactive, transferred, graduated, and other configurable statuses.

---

# 10. Staff Management

Staff records should include:

- Name
- Profile photo
- Contact information
- Role
- Department
- Joining date
- Status
- Assigned classes/batches
- Subjects
- Salary information where payroll is enabled

The system should distinguish between:

- Teaching staff
- Administrative staff
- Other staff

---

# 11. Class / Batch Management

## School

The system should support:

```text
Academic Year
    |
    Class
        |
        Section
            |
            Students
```

## Coaching

The system should support:

```text
Course
    |
    Batch
        |
        Students/Learners
```

Coaching students must be able to belong to multiple batches.

This is a mandatory architectural requirement.

---

# 12. Admission / Enrollment

## School

School admissions generally operate around academic-year enrollment.

The system should support:

- Admission application
- Student details
- Parent details
- Document collection
- Class/section allocation
- Admission number
- Fee setup
- Admission status

Possible states:

```text
Inquiry
Application
Under Review
Approved
Rejected
Admitted
```

---

## Coaching

Coaching enrollment must support flexible joining dates.

A learner can:

```text
Join Course A
       |
Join Batch A
       |
Later join Batch B
       |
Enroll in Course B
```

Enrollment must not assume that every student joins at the beginning of a fixed academic year.

---

# 13. Attendance

Attendance must support:

- Manual attendance.
- QR attendance.
- Date-based attendance.
- Class/batch-based attendance.
- Teacher-based attendance.
- Attendance history.
- Attendance reports.

Possible statuses:

```text
Present
Absent
Late
Leave
Excused
```

The exact statuses should be configurable where practical.

QR attendance logic from the existing QR attendance project should be reusable.

---

# 14. Fee Management

The fee system must support different payment models.

## School

Possible structure:

```text
Annual Fee
    |
    +-- Tuition
    +-- Transport
    +-- Activity
    +-- Examination
    +-- Other
```

## Coaching

Possible structure:

```text
Course Fee
    |
    +-- Installment 1
    +-- Installment 2
    +-- Installment 3
```

The system must support:

- Fee structures.
- Student-specific fees.
- Installments.
- Discounts.
- Concessions.
- Due dates.
- Paid amounts.
- Outstanding amounts.
- Payment history.
- Receipts.
- Online payments.

---

# 15. Online Payments

Razorpay should be used for online fee collection.

The payment system should support:

- Payment initiation.
- Payment verification.
- Successful payment.
- Failed payment.
- Pending payment.
- Payment records.
- Receipts.
- Webhook handling.

Payment status must be verified securely on the backend.

The frontend must never be treated as the source of truth for successful payment.

---

# 16. Timetable

The system should support timetable management.

School timetable:

```text
Day
Class
Section
Subject
Teacher
Room
Start Time
End Time
```

Coaching timetable:

```text
Day
Batch
Subject
Faculty
Room
Start Time
End Time
```

Users should see only relevant timetable entries.

---

# 17. Examination / Test Management

## School

Support:

- Exams.
- Subjects.
- Marks.
- Grades.
- Report cards.
- Result publication.
- Performance history.

## Coaching

Support:

- Individual tests.
- Test series.
- Subjects.
- Marks.
- Percentages.
- Rank.
- Batch comparison.
- Student comparison.
- Performance history.

The system should allow future analytics without requiring a database redesign.

---

# 18. Homework / Assignments

Teachers/faculty should be able to:

- Create homework.
- Assign homework to a class/batch.
- Set due date.
- Attach files.
- Add instructions.
- Track completion where supported.

Parents/students should be able to view assigned work.

---

# 19. Communication

The communication system should support:

- Notices.
- Announcements.
- Email.
- SMS where integrated.
- WhatsApp.
- In-app notifications.
- Push notifications in the future.

Communication must support targeting.

Example:

```text
All parents
Specific class
Specific section
Specific batch
Specific student
All teachers
All students
```

---

# 20. Inquiry / Lead Management

This module should behave differently depending on tenant type.

## School

Track:

- Visitor inquiries.
- Admission inquiries.
- Parent inquiries.
- Follow-ups.

## Coaching

Provide a lightweight CRM pipeline.

Example:

```text
New Inquiry
     ↓
Contacted
     ↓
Demo Given
     ↓
Follow-up
     ↓
Enrolled
     OR
Lost
```

Lead information should include:

- Name
- Phone
- Email
- Interested course
- Source
- Assigned staff
- Follow-up date
- Notes
- Status

---

# 21. Certificate Generation

The system should eventually generate configurable certificates.

Examples:

- Bonafide certificate.
- Transfer certificate.
- Character certificate.
- Course completion certificate.
- Participation certificate.

Templates should be configurable rather than hardcoded.

PDF generation should be handled through appropriate backend/server-side functionality.

---

# 22. HR & Payroll

When enabled, the system should support:

- Staff salary.
- Salary structure.
- Attendance linkage.
- Payroll periods.
- Salary calculation.
- Payslips.
- Payment status.

Payroll must be treated as an optional module.

---

# 23. Parent Portal

The parent portal is a major part of the product.

Parents should have a simple dashboard containing:

```text
Child
Attendance
Fees
Results
Homework
Timetable
Announcements
Notifications
```

If the parent has multiple children:

```text
Parent
 ├── Child A
 ├── Child B
 └── Child C
```

The parent must be able to switch between children without logging into separate accounts.

---

# 24. Teacher Portal

Teachers/faculty should have a focused interface.

Dashboard examples:

```text
Today's Classes
Today's Attendance
Pending Homework
Upcoming Tests
Recent Announcements
```

Quick actions:

```text
Mark Attendance
Add Homework
Enter Marks
View Students
View Timetable
```

The teacher interface should avoid exposing administrative functionality they do not need.

---

# 25. Dashboard

The admin dashboard should provide useful operational information.

Possible metrics:

```text
Total Students
Active Students
Today's Attendance
Pending Fees
Today's Collections
Upcoming Exams
Upcoming Admissions
Staff Count
```

The dashboard should be configurable based on enabled modules.

Do not create meaningless metrics simply to fill dashboard space.

---

# 26. Notifications

The system should eventually support:

- In-app notifications.
- Email.
- WhatsApp.
- SMS.
- Push notifications.

Examples:

```text
Fee Due
Payment Successful
Attendance Marked Absent
Exam Result Published
Homework Added
New Announcement
Timetable Change
```

Notifications should be generated through a centralized notification architecture.

---

# 27. AI Features

AI functionality is a differentiator and should be built after the core ERP workflows are stable.

## AI WhatsApp Assistant

The assistant should eventually answer common questions such as:

```text
"What are my child's pending fees?"

"When is the next exam?"

"What was my child's attendance this month?"

"When is the next class?"
```

The AI must only access information that the authenticated user is authorized to access.

AI must never bypass tenant isolation or permission checks.

---

## AI Report Summary

The system may generate plain-language performance summaries from student results.

Example:

```text
Marks/Data
     ↓
Performance Analysis
     ↓
AI-generated summary
     ↓
Teacher/Admin review
     ↓
Parent-visible report
```

AI-generated information should be treated as generated assistance, not unquestionable factual truth.

---

# 28. Super Admin / SaaS Management

The future SaaS platform must provide a separate Super Admin system.

Super Admin should manage:

- Tenants.
- Tenant status.
- Subscriptions.
- Plans.
- Enabled modules.
- Onboarding.
- Usage.
- Platform metrics.

Example:

```text
Total Organizations
Active Organizations
Trial Organizations
Suspended Organizations
Monthly Revenue
Active Users
Storage Usage
```

---

# 29. Subscription Management

The SaaS platform should eventually support:

- Monthly plans.
- Yearly plans.
- Trial periods.
- Renewal dates.
- Subscription status.
- Payment status.
- Grace periods.
- Suspension.

The exact pricing model should remain configurable.

Do not hardcode commercial pricing throughout the application.

---

# 30. Self-Onboarding

A new organization should eventually be able to onboard itself.

Example:

```text
Create Account
      ↓
Organization Details
      ↓
Select Organization Type
      ↓
Choose Plan
      ↓
Configure Basic Settings
      ↓
Create Admin
      ↓
Import Data
      ↓
Dashboard
```

The onboarding process should be simple enough that a new client can configure the basic system within a day.

---

# 31. Search

The ERP should provide useful global and module-specific search.

Examples:

```text
Search Student
Search Parent
Search Staff
Search Admission
Search Payment
Search Batch
Search Class
```

Search results must respect tenant and role permissions.

---

# 32. Reporting

The system should support reports for major modules.

Examples:

### Student

- Student list.
- Student demographic report.
- Active/inactive students.

### Attendance

- Daily attendance.
- Monthly attendance.
- Student attendance history.
- Class/batch attendance.

### Fees

- Collection report.
- Outstanding fees.
- Defaulters.
- Payment history.

### Exams

- Student result.
- Class result.
- Batch result.
- Rank list.

Reports should eventually support export to appropriate formats.

---

# 33. File Management

The system may need to store:

- Student photos.
- Student documents.
- Staff documents.
- Homework attachments.
- Certificates.
- Receipts.
- Organization assets.

Supabase Storage should be used.

Files must follow tenant-level security rules.

Public exposure of private student documents must never happen accidentally.

---

# 34. Auditability

Important actions should be recorded.

Examples:

```text
Who changed a student's information?
Who changed a fee?
Who marked attendance?
Who published results?
Who changed tenant settings?
Who enabled a feature?
```

Audit logs should include appropriate:

- User
- Tenant
- Action
- Entity
- Timestamp
- Relevant metadata

---

# 35. Security Requirements

Security is a first-class product requirement because the system handles educational and potentially sensitive student information.

The system must implement:

- Authentication.
- Role-based access.
- Tenant isolation.
- Database-level authorization.
- Supabase Row Level Security.
- Secure payment verification.
- Secure file access.
- Input validation.
- Proper session handling.
- Audit logging.
- Safe error handling.

Never rely exclusively on frontend authorization.

---

# 36. Mobile-First Requirement

The product must be designed mobile-first.

The most frequently used workflows should work comfortably on mobile screens.

Priority mobile workflows:

```text
Attendance
Fees
Student lookup
Notifications
Homework
Results
Timetable
Teacher actions
Parent dashboard
```

Desktop should provide enhanced workspace rather than being treated as the only primary interface.

---

# 37. UI/UX Requirements

The product should feel like a modern SaaS application.

Requirements:

- Clean interface.
- Clear hierarchy.
- Responsive design.
- Fast navigation.
- Consistent components.
- Proper loading states.
- Proper empty states.
- Proper error states.
- Accessible forms.
- Useful confirmation messages.
- Minimal unnecessary complexity.

Avoid copying outdated school ERP interfaces.

The product should feel significantly simpler and more modern than traditional ERP software.

---

# 38. Performance Requirements

The application should prioritize:

- Fast initial loading.
- Efficient database queries.
- Pagination for large datasets.
- Lazy loading where appropriate.
- Optimized images.
- Efficient React rendering.
- Proper caching where useful.

Do not load thousands of records into the browser unnecessarily.

---

# 39. Error Handling

Every important workflow must define:

```text
Loading
Success
Empty
Validation Error
Permission Error
Network Error
Server Error
```

Errors should be understandable to normal users.

Avoid exposing technical database errors to users.

Example:

Bad:

```text
PostgrestError: duplicate key value violates unique constraint...
```

Good:

```text
This admission number is already in use. Please choose another one.
```

---

# 40. Data Integrity

The system must prioritize data correctness.

Examples:

- Duplicate students should be prevented where appropriate.
- Payments must not be duplicated.
- Attendance should not accidentally create conflicting records.
- Marks should maintain valid ranges.
- Enrollment relationships must remain consistent.
- Deleted records should not break historical reporting.

Destructive operations should require confirmation where appropriate.

---

# 41. Extensibility

The architecture must allow future modules to be added without rewriting the existing ERP.

Future modules may include:

- Transport.
- Library.
- Hostel.
- Alumni.
- Visitor management.
- Lesson planning.
- Advanced analytics.
- AI features.
- Mobile applications.

Modules should be loosely coupled where practical.

---

# 42. Reuse Existing Projects

The following existing work should be treated as reusable intellectual and technical foundation:

### Play Place International School Management System

Existing:

- React.
- Supabase.
- Public website.
- Admin panel.
- Parent portal.

### EduQuery

Existing:

- Multi-tenant SaaS concepts.
- Supabase backend patterns.
- Education-focused workflows.
- WhatsApp deep-link routing/escalation.

### QR Attendance System

Existing:

- QR attendance logic.
- Coaching-centre attendance experience.

The new ERP should reuse proven patterns where they fit rather than unnecessarily rebuilding them.

---

# 43. Technology Requirements

Primary stack:

```text
Frontend:
React
Tailwind CSS

Backend / Database:
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Supabase Realtime where useful

Additional backend:
Node.js
Express

Payments:
Razorpay

Communication:
WhatsApp Business API
SMS/Email where required

Hosting:
Vercel
Supabase
```

React Native or PWA may be used for the parent-facing mobile experience initially.

---

# 44. MVP Requirements

The first sellable school MVP should prioritize:

1. Authentication
2. Roles
3. Student management
4. Staff management
5. Class/section management
6. Attendance
7. QR attendance
8. Fee management
9. Razorpay
10. Admissions
11. Timetable
12. Exams/results
13. Homework
14. Parent communication
15. Parent portal
16. Dashboard

The project should NOT delay the first client launch simply because every possible ERP module is unfinished.

---

# 45. MVP Differentiators

At least some differentiation should be visible in the initial product.

Potential differentiators:

- Modern UI.
- QR attendance.
- AI-powered features.
- Faster workflows.
- Better parent experience.
- Customizable terminology.
- Configurable modules.
- Faster support.
- Client-specific customization.

The MVP should demonstrate the product's advantages instead of attempting to reproduce every feature of a large incumbent ERP.

---

# 46. Non-Functional Requirements

The application must be:

- Secure.
- Responsive.
- Maintainable.
- Scalable.
- Multi-tenant ready.
- Mobile-friendly.
- Modular.
- Configurable.
- Observable.
- Testable.

---

# 47. Critical Architectural Rules

Antigravity MUST follow these rules while implementing the project:

### Rule 1 — Do not hardcode tenant-specific labels

Bad:

```javascript
"Class"
```

everywhere in the application.

Prefer:

```javascript
tenantConfig.labels.group
```

or the project's centralized label configuration system.

---

### Rule 2 — Do not hardcode features as universally available

Feature availability must be configuration-driven.

---

### Rule 3 — Do not assume one student belongs to one group

School and coaching requirements differ.

The database must support many-to-many relationships where required.

---

### Rule 4 — Do not assume fixed academic-year enrollment for every tenant

Coaching centres require flexible enrollment dates.

---

### Rule 5 — Never trust frontend authorization

Security must also exist at the backend/database level.

---

### Rule 6 — Every tenant-scoped record must have a reliable tenant relationship

Tenant isolation must be enforceable through database security policies.

---

### Rule 7 — Do not build duplicate implementations unnecessarily

If school and coaching workflows can share the same core engine, they should.

---

### Rule 8 — Do not over-engineer before the MVP

Build the architecture correctly, but avoid unnecessary infrastructure.

The product is being developed by a solo developer and must remain maintainable.

---

### Rule 9 — Do not implement every optional module before the first client

Prioritize the MVP.

---

### Rule 10 — Never sacrifice the core data model for visual speed

A feature that looks correct but creates an inflexible database will create major problems later.

---

# 48. Acceptance Criteria

The product requirements are considered satisfied when:

- A school tenant can be created.
- A coaching tenant can be created.
- Tenant data is isolated.
- Users can authenticate securely.
- Users receive role-appropriate access.
- Features can be enabled/disabled per tenant.
- Labels can be customized per tenant.
- Students/learners can be managed.
- Staff can be managed.
- Classes/sections or batches can be managed.
- Attendance can be recorded.
- Fees can be managed.
- Payments can be tracked.
- Admissions/enrollments can be managed.
- Timetables can be managed.
- Exams/tests can be managed.
- Homework can be managed.
- Communication can be sent.
- Parents can access relevant student information.
- Coaching students can belong to multiple batches.
- Coaching enrollments can have flexible dates.
- The system can evolve toward full SaaS operation without fundamental database redesign.

---

# 49. Implementation Philosophy

Antigravity should implement this product incrementally.

Do not attempt to generate the entire ERP in one step.

Recommended implementation sequence:

```text
Foundation
    ↓
Database
    ↓
Authentication
    ↓
Tenant Configuration
    ↓
Roles & Permissions
    ↓
Feature Flags
    ↓
Core ERP
    ↓
Portals
    ↓
Integrations
    ↓
AI
    ↓
SaaS Management
    ↓
Advanced Modules
```

Each phase should be completed, tested, and stabilized before moving to the next major phase.

---

# 50. Relationship With Other Documentation

This file defines **WHAT the product must do**.

It does not contain every technical implementation detail.

Use the other documentation files for specialized requirements:

```text
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
        ↓
Feature-specific specifications
```

If two documents appear to conflict, preserve the fundamental architectural principles defined in the Master Project Context and resolve the conflict explicitly before implementation.

---

# END OF DOCUMENT
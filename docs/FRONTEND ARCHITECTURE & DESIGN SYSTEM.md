# FRONTEND ARCHITECTURE & DESIGN SYSTEM
# School + Coaching Centre ERP SaaS

**Document:** `36-FRONTEND-ARCHITECTURE-AND-DESIGN-SYSTEM.md`  
**Version:** 1.0  
**Status:** Canonical Frontend Specification  
**Previous Document:** `35-DATA-MODEL-AND-DATABASE-CONTRACT.md`  
**Next Document:** `37-ROUTING-NAVIGATION-AND-ROLE-ACCESS.md`

---

# 1. Purpose

This document defines the frontend architecture and design system for the ERP.

The frontend must provide a consistent experience across:

```text
Desktop
Tablet
Mobile
```

The product is an ERP SaaS, so the UI must prioritize:

```text
Clarity
Speed
Consistency
Accessibility
Data Density
Ease of Use
Responsive Behavior
```

---

# 2. Frontend Philosophy

The application should feel like a modern professional SaaS product.

It must NOT feel like:

```text
Old-school ERP
Spreadsheet
Government Portal
Generic Admin Template
```

The interface should feel:

```text
Modern
Clean
Professional
Fast
Organized
Trustworthy
```

---

# 3. Mobile-First

All screens must be designed mobile-first.

Start with:

```text
Mobile
 ↓
Tablet
 ↓
Desktop
```

Do not design desktop first and simply shrink it.

---

# 4. Responsive Principle

The UI must adapt to screen size rather than forcing desktop layouts onto small screens.

---

# 5. Primary Breakpoints

Use a consistent responsive system.

Conceptually:

```text
Mobile
< 640px

Tablet
640px – 1023px

Desktop
≥ 1024px
```

Exact breakpoints may follow the chosen frontend framework's conventions.

---

# 6. Application Shell

The authenticated application should use:

```text
Sidebar / Navigation
        +
Top Header
        +
Main Content
```

Conceptually:

```text
┌───────────────────────────────────────┐
│ Header                                │
├──────────────┬────────────────────────┤
│ Navigation   │ Main Content            │
│              │                         │
│              │                         │
└──────────────┴────────────────────────┘
```

---

# 7. Mobile Application Shell

On mobile:

```text
Header
   ↓
Main Content
   ↓
Mobile Navigation / Menu
```

The desktop sidebar should not simply remain visible and consume screen width.

---

# 8. Sidebar

Desktop navigation should provide access to major modules.

Potential sections:

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
Settings
```

The exact navigation depends on the user's role.

---

# 9. Sidebar Behavior

The sidebar should support:

```text
Expanded
Collapsed
```

where appropriate.

---

# 10. Active Navigation

The current route must be visually identifiable.

Users should always know:

```text
Where am I?
```

---

# 11. Navigation Grouping

Navigation should group related modules.

Example:

```text
ACADEMIC
  Students
  Classes
  Sections
  Subjects
  Attendance
  Exams

FINANCE
  Fees
  Payments
  Expenses
  Reports
```

Do not create one enormous unstructured menu.

---

# 12. Header

The header may contain:

```text
Page Context
Search
Notifications
Tenant / Branch Selector
User Menu
```

Only show elements relevant to the current user and screen size.

---

# 13. Page Header

Every major page should have a clear page header.

Example:

```text
Students

Manage students, admissions and academic records.

[Import] [Add Student]
```

---

# 14. Breadcrumbs

Use breadcrumbs where they meaningfully improve navigation.

Example:

```text
Students / Class 10 / Atif Afsar
```

Avoid breadcrumbs on simple top-level screens where they add noise.

---

# 15. Page Layout

A typical page should follow:

```text
Page Header
 ↓
Summary / Filters
 ↓
Primary Content
```

---

# 16. Content Width

Content should have a sensible maximum width.

Do not stretch forms and text across an unnecessarily wide desktop screen.

---

# 17. Grid System

Use a consistent spacing/grid system.

Common layout patterns:

```text
1 Column
2 Columns
3 Columns
4 Columns
```

The grid should collapse gracefully on mobile.

---

# 18. Cards

Cards should be used for:

```text
Summary Metrics
Important Information
Grouped Content
Dashboard Widgets
```

Do not put every piece of information into a card.

---

# 19. Metric Cards

Example:

```text
Total Students
1,248

+8.2%
vs previous month
```

Metric cards should emphasize the number first.

---

# 20. Tables

Tables are essential for ERP workflows.

They should support:

```text
Sorting
Filtering
Pagination
Selection
Column Visibility
Search
```

where appropriate.

---

# 21. Mobile Tables

Do not force wide desktop tables onto mobile.

Use one of:

```text
Horizontal Scroll
Responsive Columns
Card/List Transformation
Priority Columns
```

depending on the data.

---

# 22. Table Priority

On small screens, display the most important fields first.

Example:

```text
Student
Status
Class
Actions
```

Secondary information can move into a detail view.

---

# 23. Table Actions

Actions should remain predictable.

Common pattern:

```text
View
Edit
More
```

Avoid cluttering every row with many buttons.

---

# 24. Bulk Selection

Where bulk actions are supported:

```text
☐ Student A
☐ Student B
☐ Student C
```

then:

```text
3 selected
[Export] [Archive] [Assign]
```

Only show bulk actions when selected.

---

# 25. Search

Search should be fast and obvious on high-volume pages.

Examples:

```text
Search students...
Search payments...
Search batches...
```

---

# 26. Filters

Filters should be easy to understand.

Example:

```text
Class
Section
Status
Academic Year
```

On mobile, filters may open in a bottom sheet or modal.

---

# 27. Filter State

Active filters should be visible.

Example:

```text
Class: 10
Status: Active
```

Provide a clear reset option.

---

# 28. Forms

Forms should be:

```text
Simple
Grouped
Validated
Accessible
Mobile-Friendly
```

---

# 29. Form Grouping

Large forms should be divided into meaningful sections.

Example:

```text
Personal Information

Contact Information

Guardian Information

Academic Information

Documents
```

---

# 30. Form Labels

Every input must have a visible, meaningful label.

Do not rely on placeholder text as the only label.

---

# 31. Required Fields

Required fields should be clearly identified.

---

# 32. Input Validation

Validation should happen:

```text
While interacting
+
On submit
```

but should not become unnecessarily aggressive.

---

# 33. Error Messages

Error messages must tell users:

```text
What went wrong
How to fix it
```

Bad:

```text
Invalid input.
```

Better:

```text
Enter a valid 10-digit mobile number.
```

---

# 34. Form Preservation

If submission fails, preserve valid user-entered data whenever possible.

Never unexpectedly clear an entire form because one field failed validation.

---

# 35. Save States

Buttons must communicate state.

Example:

```text
Save Student
```

while processing:

```text
Saving...
```

After success:

```text
Saved
```

Avoid duplicate submissions.

---

# 36. Destructive Actions

Destructive actions must require deliberate confirmation where appropriate.

Example:

```text
Delete Student?

This action cannot be undone.

[Cancel] [Delete]
```

---

# 37. Soft-Delete UX

If the backend uses archive/deactivation instead of deletion, the UI should use appropriate language:

```text
Archive Student
Deactivate User
Void Payment
```

Do not label every state change "Delete."

---

# 38. Modal Usage

Use modals for:

```text
Quick Actions
Short Forms
Confirmation
Focused Tasks
```

Avoid extremely large workflows inside small modals.

---

# 39. Drawer Usage

Drawers are useful for:

```text
Quick Detail
Filters
Secondary Information
```

especially on desktop.

---

# 40. Mobile Modal Behavior

On mobile, dialogs should adapt to the available screen.

Large forms may become:

```text
Full-Screen Sheet
```

rather than a tiny centered modal.

---

# 41. Toasts

Use toasts for lightweight feedback.

Examples:

```text
Student created successfully.
Payment recorded.
Settings updated.
```

Do not use toasts for critical information that users need to read later.

---

# 42. Notifications

In-app notifications should have:

```text
Unread State
Read State
Timestamp
Context
Destination
```

---

# 43. Loading States

Every async screen needs an intentional loading state.

Use:

```text
Skeleton
Spinner
Progress Indicator
```

depending on the interaction.

---

# 44. Skeleton Loading

For pages with predictable content structure, skeletons are preferred over blank screens.

Example:

```text
████████████
██████

██████████████████
████████████
```

---

# 45. Empty States

Empty states must explain:

```text
What is empty
Why it may be empty
What the user can do next
```

Example:

```text
No students yet.

Add your first student to start managing
attendance, fees and academic records.

[Add Student]
```

---

# 46. Empty State Avoidance

Do not show a dashboard full of empty boxes without useful guidance.

---

# 47. Error States

Errors should be understandable.

Example:

```text
Unable to load students.

Please try again.

[Retry]
```

---

# 48. Offline / Network Failure

If network connectivity fails, provide a clear state rather than silently doing nothing.

---

# 49. Accessibility

The frontend must target strong accessibility.

Important requirements:

```text
Keyboard Navigation
Visible Focus
Semantic HTML
Accessible Labels
Color Contrast
Screen Reader Support
Reduced Motion Support
```

---

# 50. Keyboard Navigation

All major workflows must be usable without a mouse where practical.

---

# 51. Focus Management

When opening a dialog:

```text
Focus → Dialog
```

When closing:

```text
Focus → Trigger
```

where appropriate.

---

# 52. Color

Color should communicate meaning but must not be the only signal.

Example:

```text
Green + "Paid"
Red + "Failed"
Yellow + "Pending"
```

not simply:

```text
Green
Red
Yellow
```

---

# 53. Status Badges

Use consistent badge styles.

Example:

```text
Active
Inactive
Pending
Completed
Failed
```

---

# 54. Typography

Use a clean modern sans-serif typography system.

Establish a clear hierarchy:

```text
Display
Heading
Subheading
Body
Caption
Label
```

Do not use many unrelated font sizes.

---

# 55. Font Weight

Use weight intentionally:

```text
Regular → body
Medium → labels
Semibold → headings
Bold → important emphasis
```

Avoid excessive bold text.

---

# 56. Spacing

Use a consistent spacing scale.

Conceptually:

```text
4
8
12
16
20
24
32
40
48
64
```

Avoid arbitrary spacing values throughout the application.

---

# 57. Border Radius

Use a consistent radius system.

Example:

```text
Small
Medium
Large
Full / Pill
```

---

# 58. Shadows

Use subtle shadows only when they improve hierarchy.

Avoid excessive:

```text
Glow
Heavy Shadow
Neumorphism
```

---

# 59. Icons

Use one consistent icon library.

Icons should:

```text
Have consistent visual weight
Have accessible labels where needed
Not replace important text unnecessarily
```

---

# 60. Buttons

Define consistent variants.

Typical:

```text
Primary
Secondary
Outline
Ghost
Destructive
```

---

# 61. Primary Action

Each page should have a clear primary action where appropriate.

Example:

```text
Students
                         [Add Student]
```

---

# 62. Button Hierarchy

Do not make every button visually primary.

The interface should communicate:

```text
Most Important
Secondary
Tertiary
Destructive
```

---

# 63. Responsive Buttons

On mobile:

```text
Full-width
Stacked
Icon + Label
```

may be used depending on context.

---

# 64. Dashboard Design

Dashboards should answer:

```text
What is happening?
What needs attention?
What changed?
What should I do next?
```

---

# 65. Dashboard Metrics

Potential school metrics:

```text
Students
Attendance
Fees Collected
Outstanding Fees
Upcoming Exams
Staff
```

Potential coaching metrics:

```text
Students
Active Batches
Attendance
Fees Collected
Outstanding Fees
Upcoming Tests
```

---

# 66. Role-Based Dashboard

Different roles should not see the same dashboard by default.

Example:

```text
Admin
→ Organization Overview

Teacher
→ Classes + Attendance + Exams

Accountant
→ Payments + Outstanding Fees

Parent
→ Child Overview

Student
→ Personal Academic Overview
```

---

# 67. Dashboard Personalization

Where useful, allow users to customize or reorder non-critical widgets.

Do not allow personalization to hide critical compliance/security information.

---

# 68. Student Profile

The student profile should act as a central record.

Conceptually:

```text
Student Header
 ↓
Overview
 ↓
Academics
 ↓
Attendance
 ↓
Fees
 ↓
Exams
 ↓
Documents
 ↓
Activity
```

---

# 69. Student Header

Display key information:

```text
Name
Admission ID
Class / Batch
Status
Profile Image where available
```

---

# 70. Student Tabs

Tabs should separate major domains without overwhelming the screen.

Example:

```text
Overview
Academics
Attendance
Fees
Exams
Documents
```

---

# 71. Student Profile Mobile

On mobile, tabs may become:

```text
Horizontal Scroll
Dropdown
Segmented Navigation
```

depending on the number of sections.

---

# 72. Data Density

ERP users often manage large datasets.

The UI should support high information density while maintaining readability.

Do not make every row excessively tall.

---

# 73. Progressive Disclosure

Show essential information first.

Additional information can be revealed through:

```text
Details
Drawer
Modal
Profile Page
Expandable Row
```

---

# 74. Confirmation UX

Confirmation dialogs should explain consequences.

Bad:

```text
Are you sure?
```

Better:

```text
Archive this student?

The student will no longer appear in active student lists,
but their historical records will remain available.

[Cancel] [Archive Student]
```

---

# 75. Search UX

Global search, if implemented, should provide categorized results.

Example:

```text
Students
Payments
Batches
Users
```

---

# 76. Command Palette

A command palette may be used for power users.

Potential actions:

```text
Add Student
Find Student
Record Payment
Mark Attendance
Open Reports
```

---

# 77. Keyboard Shortcuts

Shortcuts may be added for high-frequency desktop workflows.

They must never prevent normal mouse/touch interaction.

---

# 78. Notifications UX

Unread notifications should be visually distinguishable.

Example:

```text
● Fee payment received
● Exam result published
○ Attendance reminder
```

---

# 79. Date & Time

Display dates in a format appropriate to the tenant/user locale.

Store consistently according to the backend data contract.

---

# 80. Currency

Financial UI must display currency clearly.

For Indian tenants, the interface may display:

```text
₹10,000
```

when INR is configured.

Do not hard-code INR throughout the system if multi-currency support is planned.

---

# 81. Number Formatting

Use locale-aware formatting.

Example:

```text
1,24,500
```

for Indian number formatting where the locale requires it.

---

# 82. Responsive Forms

Desktop:

```text
First Name     Last Name
Phone          Email
Class          Section
```

Mobile:

```text
First Name

Last Name

Phone

Email

Class

Section
```

---

# 83. Touch Targets

Interactive controls must have sufficiently large touch targets.

Avoid tiny:

```text
6px icon buttons
```

that are difficult to tap.

---

# 84. Mobile Bottom Navigation

For frequently used mobile workflows, a bottom navigation may be used.

Keep it limited to the most important destinations.

---

# 85. Mobile Navigation

Mobile navigation should prioritize:

```text
Home
Students
Attendance
Fees
More
```

depending on role.

---

# 86. Desktop Navigation

Desktop can expose more modules through a sidebar.

---

# 87. Theme

The application may support:

```text
Light
Dark
System
```

if included in the product requirements.

The design tokens must work in both supported themes.

---

# 88. Design Tokens

All visual primitives should be centralized.

Examples:

```text
--color-background
--color-surface
--color-text
--color-muted
--color-primary
--color-danger

--spacing-sm
--spacing-md
--spacing-lg

--radius-sm
--radius-md
--radius-lg
```

The exact implementation depends on the frontend framework.

---

# 89. No Hard-Coded Design Values

Avoid scattering arbitrary values across components.

Bad:

```text
margin: 17px
border-radius: 13px
```

when those values do not belong to the design system.

---

# 90. Component Architecture

Build reusable components.

Potential shared components:

```text
Button
Input
Select
DatePicker
Modal
Drawer
Table
Badge
Card
Tabs
Dropdown
Toast
Pagination
EmptyState
ErrorState
Skeleton
```

---

# 91. Feature Components

Feature-specific components should live within their domain.

Example:

```text
students/
  components/
    StudentTable
    StudentForm
    StudentProfile
```

---

# 92. Avoid Giant Components

Do not create:

```text
StudentPage.tsx
```

containing thousands of lines of unrelated UI and business logic.

Break it into meaningful components.

---

# 93. Separation of Concerns

Frontend should separate:

```text
UI
State
API Calls
Business Formatting
Validation
Permissions
```

where practical.

---

# 94. API Layer

API calls should not be duplicated throughout components.

Use a centralized API/data-access layer.

Conceptually:

```text
Component
 ↓
Query / Mutation
 ↓
API Client
 ↓
Backend
```

---

# 95. Server State

Remote server data should be managed using the selected data-fetching/state strategy.

Avoid copying all server state into a global client store unnecessarily.

---

# 96. Local State

Use local state for:

```text
Modal Open
Input Values
UI Toggles
Temporary Selection
```

where appropriate.

---

# 97. Global State

Global state should be reserved for genuinely global concerns.

Examples:

```text
Authenticated User
Tenant Context
Theme
Global UI State
```

---

# 98. Permissions in UI

The frontend should hide or disable actions the user cannot perform.

However:

> **Frontend permission checks are UX only. Backend authorization remains authoritative.**

---

# 99. Route Protection

Protected pages must require authentication.

---

# 100. Role-Based Rendering

Example:

```text
if can("payments.create"):
    show "Record Payment"
```

Permission identifiers must match the canonical RBAC system.

---

# 101. Tenant Context in UI

The current tenant/branch context should be visible enough to reduce accidental operations in the wrong context.

---

# 102. Unsaved Changes

Important forms should warn users before navigating away when unsaved changes would be lost.

---

# 103. Optimistic UI

Optimistic updates may be used for low-risk interactions.

Do not use optimistic updates for financial operations unless consistency and rollback behavior are carefully implemented.

---

# 104. Financial UI

Financial actions require especially clear states.

Example:

```text
Payment
₹5,000
Status: Processing
```

Then:

```text
Status: Completed
```

or:

```text
Status: Failed
```

---

# 105. Attendance UI

Attendance should optimize for speed.

Typical workflow:

```text
Select Class / Batch
 ↓
Select Date
 ↓
Student List
 ↓
Mark Attendance
 ↓
Save
```

Bulk actions should be easy.

---

# 106. Exam UI

Exam entry should minimize repetitive typing.

Where appropriate:

```text
Student
Marks
Maximum Marks
Grade
```

should be visible in a dense but readable interface.

---

# 107. Fee UI

Financial screens should emphasize:

```text
Total Due
Paid
Outstanding
Status
Payment History
```

---

# 108. Reports UI

Reports should provide:

```text
Filters
Date Range
Export
Print
```

where applicable.

---

# 109. Export UX

Exports may be asynchronous for large datasets.

The UI should show:

```text
Preparing export...
```

rather than freezing the page.

---

# 110. Print UX

Printable documents should have dedicated print layouts rather than relying on arbitrary screenshots of the application UI.

---

# 111. Performance

Frontend performance must prioritize:

```text
Fast Initial Load
Fast Navigation
Minimal Unnecessary Requests
Virtualized Large Lists where needed
Lazy Loading
Optimized Images
Code Splitting
```

---

# 112. Large Lists

Student lists with thousands of records should not render thousands of DOM nodes unnecessarily.

Use pagination or virtualization.

---

# 113. Images

Profile images and documents should be:

```text
Optimized
Lazy Loaded
Responsive
```

where appropriate.

---

# 114. Accessibility + Performance

Do not sacrifice accessibility to achieve visual performance.

Both are first-class requirements.

---

# 115. Security

Never place sensitive secrets in frontend code.

Do not assume hiding an element provides security.

---

# 116. Client-Side Storage

Sensitive information should not be stored in insecure browser storage unnecessarily.

Use the application's established authentication/session strategy.

---

# 117. Error Boundary

The frontend should have error boundaries or equivalent recovery mechanisms so one broken feature does not crash the entire application.

---

# 118. Logging

Frontend errors should provide useful diagnostic information without leaking sensitive data.

---

# 119. Internationalization

The architecture should avoid hard-coding user-facing strings throughout business logic if localization may be required.

---

# 120. Localization

Potential future requirements:

```text
Language
Date Format
Number Format
Currency
Timezone
```

---

# 121. Component Definition of Done

A reusable component is complete when:

```text id="q1jz08"
☐ Responsive
☐ Accessible
☐ Keyboard Friendly where applicable
☐ Loading State
☐ Error State where applicable
☐ Empty State where applicable
☐ Consistent Design Tokens
☐ Mobile Tested
☐ Desktop Tested
```

---

# 122. Page Definition of Done

A page is complete when:

```text id="3a2qbc"
☐ Route Defined
☐ Authorization Defined
☐ Responsive Layout
☐ Loading State
☐ Empty State
☐ Error State
☐ Success Feedback
☐ Accessibility Reviewed
☐ API Integration
☐ Mobile Tested
☐ Desktop Tested
```

---

# 123. UX Quality Checklist

Before considering a screen complete:

```text id="az7f2f"
☐ Is the primary action obvious?
☐ Is the current context clear?
☐ Can the user recover from errors?
☐ Is empty state useful?
☐ Does mobile work properly?
☐ Are destructive actions clear?
☐ Are permissions respected?
☐ Are loading states intentional?
☐ Is the interface visually consistent?
☐ Can the user complete the task quickly?
```

---

# 124. Anti-Pattern: Generic Dashboard

Do not create one generic dashboard containing random:

```text
Cards
Charts
Tables
```

without answering actual user needs.

Every dashboard widget must have a purpose.

---

# 125. Anti-Pattern: Desktop Shrunk to Mobile

Never simply scale down the desktop layout.

Mobile must have its own information hierarchy.

---

# 126. Anti-Pattern: Modal Everything

Do not turn every workflow into a modal.

Use dedicated pages for complex workflows.

---

# 127. Anti-Pattern: Excessive Decoration

Do not prioritize:

```text
Gradients
Animations
Large Illustrations
Decorative Cards
```

over usability.

---

# 128. Animation

Use subtle motion for:

```text
Transitions
Feedback
Loading
Navigation
```

Avoid excessive animation in data-heavy ERP workflows.

---

# 129. Reduced Motion

Respect users who prefer reduced motion.

---

# 130. Design Consistency Rule

If a component already exists:

```text
Reuse it.
```

Do not create a visually different version of the same component without a documented reason.

---

# 131. Frontend Architecture Rule

Before creating a new UI component, ask:

```text
Does this already exist in the design system?
```

If yes:

```text
Reuse
```

If no:

```text
Determine whether it belongs in the shared design system
or only within the feature.
```

---

# 132. Final Frontend Principle

> **The ERP frontend must be mobile-first, responsive, accessible, fast, and highly consistent. It should feel like a modern SaaS product rather than a legacy ERP. Shared design tokens and reusable components must prevent visual fragmentation, while role-aware navigation and interfaces should ensure every user sees the workflows relevant to their responsibilities. Backend authorization remains the ultimate security boundary.**

---

# 133. Next Document

```text
37-ROUTING-NAVIGATION-AND-ROLE-ACCESS.md
```

This document will define:

```text
Application Routes
Public Routes
Authenticated Routes
Role-Based Routes
Tenant Routes
Branch Routes
Navigation Structure
Sidebar
Mobile Navigation
Route Guards
Permission Guards
Redirect Rules
Unauthorized Pages
Deep Links
Session Expiration
Role-Based Menu Visibility
```

---

# END OF DOCUMENT
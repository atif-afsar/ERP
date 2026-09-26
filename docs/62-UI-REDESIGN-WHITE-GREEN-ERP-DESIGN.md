# 62 — UI REDESIGN: WHITE + GREEN ERP DESIGN SYSTEM

**Project:** EduNexus ERP  
**Document:** 62-UI-REDESIGN-WHITE-GREEN-ERP-DESIGN.md  
**Status:** Implementation Specification  
**Priority:** HIGH  
**Applies To:** Desktop + Tablet + Mobile  
**Primary Goal:** Replace the current dark/AI-generated visual style with a clean, professional, understandable, production-ready ERP interface.

---

# 1. PURPOSE

The current interface uses a dark navy/purple visual style with excessive gradients, glowing elements, dark cards, and dense dashboard sections.

The redesign must create a UI that feels:

- Professional
- Trustworthy
- Simple
- Human-designed
- Easy to understand
- Suitable for schools
- Suitable for coaching centres
- Suitable for administrators
- Suitable for teachers
- Suitable for accountants
- Suitable for parents
- Suitable for students
- Mobile-friendly
- Accessible
- Fast
- Consistent

The new visual direction is:

> WHITE + GREEN + NEUTRAL UI

The interface must look like a serious education management product, not a futuristic AI dashboard.

---

# 2. DESIGN PHILOSOPHY

The interface should prioritize:

```text
Clarity
↓
Hierarchy
↓
Usability
↓
Consistency
↓
Accessibility
↓
Visual polish

Do NOT prioritize:

Gradients
Glow effects
Glassmorphism
Excessive rounded cards
Neon colors
Decorative elements
Huge typography
Unnecessary animations
3. PRIMARY VISUAL DIRECTION

The overall application should use:

Background:
White / Very Light Gray

Primary:
Green

Secondary:
Dark Green

Text:
Dark Gray / Near Black

Borders:
Light Gray

Cards:
White

Success:
Green

Warning:
Amber

Danger:
Red

Information:
Blue

Green should be the brand/action color, not the entire interface.

4. COLOR SYSTEM

Use CSS variables.

Example:

:root {
  --color-primary: #16a34a;
  --color-primary-hover: #15803d;
  --color-primary-light: #dcfce7;
  --color-primary-dark: #166534;

  --color-background: #f8faf9;
  --color-surface: #ffffff;
  --color-surface-muted: #f3f6f4;

  --color-text-primary: #17201b;
  --color-text-secondary: #647067;
  --color-text-muted: #8a958d;

  --color-border: #e2e8e4;

  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
  --color-info: #2563eb;
}

The exact values may be adjusted during implementation but the visual hierarchy must remain consistent.

5. REMOVE THE CURRENT DARK THEME

The current interface uses:

Dark navy background
Dark cards
Purple gradients
Blue glowing buttons
Neon borders
Large gradient hero panels

These should NOT be the default application theme.

Replace them with:

White page
Light gray sections
White cards
Green primary actions
Dark readable text
Subtle borders
Minimal shadows
6. NO EXCESSIVE GRADIENTS

Do not use gradients for:

Main page backgrounds
Cards
Navigation
Primary buttons
Dashboard headers

Gradients may only be used for rare decorative purposes where they provide real value.

7. NO GLOW EFFECTS

Remove:

box-shadow: 0 0 30px ...

and similar neon/glow effects.

Use subtle elevation instead.

Example:

box-shadow: 0 1px 3px rgba(0,0,0,0.06);
8. BORDER RADIUS

Use moderate corner rounding.

Recommended:

Small controls:
8px

Inputs:
8px

Buttons:
8px

Cards:
12px

Large sections:
16px

Avoid making every element extremely rounded.

9. APPLICATION LAYOUT

Desktop structure:

┌─────────────────────────────────────────────┐
│ Top Header                                  │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Sidebar      │ Main Content                 │
│              │                              │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘

Recommended:

Sidebar:
240px

Main content:
Flexible

Maximum content width:
1600px
10. SIDEBAR REDESIGN

The sidebar should be white.

Example:

┌────────────────────────┐
│ EduNexus                │
│ School ERP              │
├────────────────────────┤
│                         │
│ Overview                │
│ Dashboard               │
│                         │
│ STUDENTS                │
│ Students                │
│ Admissions              │
│                         │
│ ACADEMICS               │
│ Classes                 │
│ Attendance              │
│ Timetable               │
│ Examinations            │
│ Homework                │
│                         │
│ FINANCE                 │
│ Fees & Payments         │
│ Expenses                │
│                         │
│ OPERATIONS              │
│ Library                 │
│ Transport               │
│ Hostel                  │
│ Inventory               │
│                         │
└────────────────────────┘
11. SIDEBAR ACTIVE STATE

Active navigation should use a subtle green background.

Example:

Dashboard

becomes:

┌────────────────────────────┐
│ ▦  Dashboard               │
└────────────────────────────┘

with:

background: #dcfce7
text: #166534
icon: #16a34a

Do not use a glowing blue pill.

12. SIDEBAR TYPOGRAPHY

Navigation text:

14px–15px
font-weight: 500

Section labels:

11px–12px
font-weight: 600
text-transform: uppercase
letter-spacing: 0.04em
13. TOP HEADER

Desktop header:

┌──────────────────────────────────────────────┐
│ Logo │ Tenant │ Branch │ Search │ Bell │ User│
└──────────────────────────────────────────────┘

The header should remain simple.

14. TENANT SWITCHER

The tenant selector should look like a normal enterprise selector.

Example:

Active organization
Delhi International Public School

Dropdown:

Delhi International Public School
Apex IIT-JEE & Medical Academy

Do not make it visually dominant.

15. BRANCH SELECTOR

Place branch selection near the page context.

Example:

Branch
Main Campus (Dwarka)
⌄

Use a simple bordered control.

16. ROLE SWITCHING

Current UI shows many role buttons:

Super Admin
Principal
Teacher
Accountant
Staff
Parent
Student

This should NOT look like a row of permanent navigation buttons.

Instead use:

Current Role
Principal
⌄

Opening it shows authorized role/context options.

Only show roles the current authenticated user can actually access.

17. USER PROFILE

Replace the large dark profile element with:

┌──────────────────────────────┐
│ Avatar  Dr. Sunita Verma     │
│         Principal            │
└──────────────────────────────┘

Clicking opens:

Profile
Account Settings
Switch Role
Help
Logout
18. GLOBAL SEARCH

Search should be clearly identifiable.

Placeholder:

Search students, staff, classes...

Desktop width:

320px–480px

Mobile:

100%
19. DASHBOARD PAGE

The dashboard should not begin with a huge decorative hero card.

Instead:

Good morning, Dr. Verma

Here's what's happening at Delhi International Public School today.

[Academic Year] [Branch]

Then KPI cards.

20. DASHBOARD HEADER

Example:

Dashboard

Good morning, Dr. Verma.
Here's today's overview of your institution.

[Main Campus] [2026–27]

Primary action:

+ Add Student

Secondary actions:

Take Attendance
Collect Fee
Create Announcement
21. KPI CARDS

Use simple white cards.

Example:

┌──────────────────────┐
│ Total Students       │
│                      │
│ 1,284                │
│ ↑ 8.4% this month    │
└──────────────────────┘

Cards:

Total Students
Today's Attendance
Fee Collection
Active Staff
22. KPI CARD DESIGN

Each card should contain:

Label
Large Number
Optional comparison
Small icon

Do not use oversized decorative icons.

23. KPI COLORS

Use color only to communicate meaning.

Example:

Students:
Green

Attendance:
Blue/Green

Fees:
Green

Pending:
Amber

Problems:
Red

Do not assign a different neon color to every card.

24. NUMBER FORMATTING

Use readable Indian number formatting.

Examples:

1,284

₹50,000

₹12.4L

98.4%

For larger amounts:

₹12.45 Lakh

where appropriate.

25. ATTENDANCE CARD

Example:

Today's Attendance

92.4%

1,188 Present
96 Absent

[View Attendance]

A simple progress indicator may be used.

26. FEE SUMMARY

Replace the current large dark revenue panel.

Use:

Fee Collection

Collected
₹5,00,000

Outstanding
₹2,40,000

Collection Rate
67.5%

[View Fees]

Use a simple progress bar.

27. QUICK ACTIONS

Quick operations should be simple buttons.

Example:

Quick Actions

[ Add Student ]
[ Take Attendance ]
[ Collect Fee ]
[ Create Homework ]
[ Create Exam ]
[ Send Announcement ]

Maximum 6–8 actions.

28. RECENT ACTIVITY

Add:

Recent Activity

Example:

10:42 AM
Fee payment received
₹12,000 from Rahul Sharma

10:20 AM
New student admitted
Aarav Singh

09:50 AM
Attendance completed
Class 10-A
29. TODAY'S SCHEDULE

Show:

Today's Schedule

09:00
Class 10-A
Mathematics

10:00
Class 9-B
Science

11:00
Class 12-A
Physics
30. ALERTS

Important alerts should be visible without overwhelming the dashboard.

Example:

Attention Required

3 students have overdue fees
12 students are absent today
2 staff attendance records are incomplete

Each alert should link to the relevant module.

31. DASHBOARD GRID

Desktop:

┌──────────┬──────────┬──────────┬──────────┐
│ KPI      │ KPI      │ KPI      │ KPI      │
└──────────┴──────────┴──────────┴──────────┘

┌───────────────────────┬───────────────────┐
│ Fee Overview          │ Quick Actions     │
└───────────────────────┴───────────────────┘

┌───────────────────────┬───────────────────┐
│ Attendance             │ Today's Schedule  │
└───────────────────────┴───────────────────┘

┌────────────────────────────────────────────┐
│ Recent Activity                            │
└────────────────────────────────────────────┘
32. RESPONSIVE BREAKPOINTS

Use:

Mobile:
< 640px

Tablet:
640px–1023px

Desktop:
1024px+

Large Desktop:
1440px+
33. MOBILE NAVIGATION

Do NOT shrink the desktop sidebar onto mobile.

Mobile should use:

Top header
+
Bottom navigation
+
Mobile drawer

Example:

┌──────────────────────────┐
│ ☰  EduNexus       🔔     │
├──────────────────────────┤
│                          │
│ Dashboard                │
│                          │
│ KPI cards                │
│                          │
│                          │
├──────────────────────────┤
│ Home Students More       │
└──────────────────────────┘
34. MOBILE BOTTOM NAVIGATION

Recommended:

Home
Students
Attendance
Fees
More

Only show the most important destinations.

35. MOBILE DRAWER

The More menu should contain:

Academics
Examinations
Homework
Timetable
Communication
Library
Transport
Hostel
Inventory
Reports
Settings
36. MOBILE KPI CARDS

On mobile:

2-column grid

Example:

┌──────────────┬──────────────┐
│ Students     │ Attendance   │
│ 1,284        │ 92%          │
└──────────────┴──────────────┘

On very narrow screens:

1-column
37. MOBILE TABLES

Do not force large desktop tables onto mobile.

Use:

Responsive card list

Example:

Aarav Singh
Class 10-A
Present
08:42 AM

For complex data provide:

Horizontal scrolling

only when necessary.

38. MOBILE FORMS

Forms should use:

1 column

instead of multi-column layouts.

Example:

Student Name
[____________]

Class
[____________]

Section
[____________]

Parent Phone
[____________]

[Save Student]
39. BUTTON SYSTEM

Primary:

[ + Add Student ]

Secondary:

[ Export ]

Tertiary:

[ View Details ]

Danger:

[ Delete ]
40. BUTTON RULES

Buttons must:

Clearly describe their action
Use consistent height
Have readable text
Have visible hover state
Have visible disabled state
Have loading state

Avoid:

icon-only buttons

unless the meaning is universally clear.

41. ICON RULE

Icons support meaning.

They should not replace important labels.

Bad:

[👤]

Better:

[ 👤 Add Student ]
42. FORM DESIGN

Inputs must use visible labels.

Do not rely only on placeholders.

Bad:

[ Enter student name ]

Good:

Student Name
[ Enter student name ]
43. INPUT STATES

Every input must support:

Default
Hover
Focus
Filled
Disabled
Error
Success
44. ERROR MESSAGES

Errors must be understandable.

Bad:

Validation failed

Good:

Please enter the student's mobile number.
45. SUCCESS FEEDBACK

Use subtle notifications.

Example:

✓ Student added successfully.

Avoid large animated popups.

46. MODALS

Use modals only for focused actions.

Examples:

Confirm Delete
Add Student
Collect Fee
Change Status

Large workflows should use dedicated pages.

47. TABLE DESIGN

Desktop tables should be:

White
Readable
Bordered subtly
Compact
Sortable
Filterable

Example:

Student       Class     Attendance    Fee Status
--------------------------------------------------
Aarav Singh   10-A      96%           Paid
Riya Sharma   10-A      91%           Pending
48. TABLE ROW HOVER

Use a subtle background change.

Do not use bright colors.

49. STATUS BADGES

Use semantic badges.

Example:

Paid

Green.

Pending

Amber.

Overdue

Red.

Inactive

Gray.

50. EMPTY STATES

Every list needs an understandable empty state.

Example:

No students found

Try changing your search or filters.

[ Add Student ]
51. LOADING STATES

Use skeleton loading where useful.

Example:

████████████
██████
██████████████

Avoid flashing blank pages.

52. ERROR STATES

Example:

Unable to load students.

Please try again.

[ Retry ]
53. ACCESSIBILITY

The interface must support:

Keyboard navigation
Visible focus states
Readable contrast
Screen readers
Semantic HTML
ARIA labels where required
54. COLOR ACCESSIBILITY

Never communicate status using color alone.

Bad:

Green = Present
Red = Absent

Better:

✓ Present
✕ Absent

with color as secondary reinforcement.

55. TYPOGRAPHY

Recommended font:

Inter

Fallback:

system-ui
sans-serif

Hierarchy:

Page title:
28–32px

Section title:
18–22px

Card title:
14–16px

Body:
14–15px

Small:
12–13px

Avoid excessively large headings.

56. PAGE STRUCTURE

Every module should follow a consistent structure:

Page Title
Description
Primary Action

Filters / Search

Main Content

Pagination

Optional Secondary Content

Example:

Students

Manage students, guardians and enrollment.

[ + Add Student ]

[Search] [Class] [Status] [Filter]

Student Table
57. CONSISTENCY ACROSS MODULES

The same patterns must be used across:

Students
Staff
Classes
Attendance
Fees
Payments
Examinations
Homework
Timetable
Communication
Library
Transport
Hostel
Inventory
Reports
Settings

Do not design every page differently.

58. DASHBOARD PERSONALIZATION

Different roles should see relevant dashboards.

Principal:

Students
Attendance
Fees
Staff
Examinations
Alerts

Teacher:

Today's Classes
Attendance
Homework
Students
Examinations

Accountant:

Collections
Outstanding Fees
Payments
Expenses
Financial Reports

Parent:

Children
Attendance
Fees
Homework
Results
Announcements

Student:

Classes
Attendance
Homework
Examinations
Fees
Announcements
59. SCHOOL VS COACHING CENTRE

The same design system must work for both.

School dashboard examples:

Students
Classes
Attendance
Fees
Examinations
Transport
Library
Hostel

Coaching dashboard examples:

Students
Batches
Attendance
Fees
Tests
Results
Faculty
Study Material
60. DARK MODE

Dark mode should NOT be the primary visual mode.

If supported later:

Light
Dark
System

Light mode remains the default.

61. RESPONSIVE SIDEBAR

Desktop:

Expanded

Tablet:

Collapsed

Mobile:

Hidden

and opened through the menu button.

62. CONTENT WIDTH

Use:

max-width: 1600px;
margin: 0 auto;

Avoid stretching content across the entire screen on very large monitors.

63. SPACING SYSTEM

Use a consistent spacing scale:

4px
8px
12px
16px
20px
24px
32px
40px
48px

Avoid arbitrary spacing values.

64. CARD SPACING

Dashboard cards should have:

16–24px padding
16px gap
65. VISUAL DENSITY

The current interface is visually dense.

The new interface should use:

More whitespace
Clear sections
Short labels
Predictable controls

But avoid excessive whitespace that reduces information density.

ERP software should remain efficient.

66. REMOVE UNNECESSARY DECORATION

Remove:

Huge decorative gradients
Glow borders
Oversized icons
Floating decorative shapes
Unnecessary badges
Repeated pills
67. AI ASSISTANT

The AI Assistant should not dominate the UI.

Instead:

AI Assistant

should be accessible through:

Header
Contextual action
Floating button

depending on device.

The AI feature should feel integrated into the ERP rather than visually taking over the dashboard.

68. NOTIFICATION CENTER

Use a standard notification icon.

Click:

Notifications

3 new notifications

Fee payment received
Attendance incomplete
New admission submitted

View all
69. USER EXPERIENCE RULE

Every page should answer these questions immediately:

Where am I?

What information am I seeing?

What can I do?

What needs my attention?

What happens when I click this?
70. MOBILE UX RULE

On mobile:

One primary action
One clear page title
Simple filters
Scrollable content
Large enough touch targets
No horizontal layout overflow
71. TOUCH TARGETS

Interactive controls should generally provide approximately:

44px minimum touch target

on mobile.

72. NO HORIZONTAL OVERFLOW

The application must not create accidental page-level horizontal scrolling.

Test:

320px
360px
390px
412px
768px
1024px
1440px
1920px
73. RESPONSIVE TESTING

Every major page must be tested at:

320px
375px
390px
414px
768px
1024px
1280px
1440px
1920px
74. DASHBOARD IMPLEMENTATION TARGET

The redesigned dashboard should visually resemble:

WHITE BACKGROUND

Dashboard
Good morning, Dr. Verma.

[Branch] [Academic Year] [+ Add Student]

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Students   │ │ Attendance │ │ Collection │ │ Staff      │
│ 1,284      │ │ 92.4%      │ │ ₹5.0L      │ │ 84         │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌───────────────────────────────┐ ┌──────────────────────┐
│ Fee Collection                │ │ Quick Actions        │
│                               │ │                      │
│ ₹5,00,000                     │ │ Add Student          │
│ ███████████████░░░            │ │ Take Attendance      │
│ 67.5% collected               │ │ Collect Fee          │
└───────────────────────────────┘ └──────────────────────┘

┌───────────────────────────────┐ ┌──────────────────────┐
│ Attendance                    │ │ Today's Schedule     │
│                               │ │                      │
│ 92.4%                         │ │ 09:00 Mathematics    │
│ Present 1,188                 │ │ 10:00 Science        │
│ Absent 96                     │ │ 11:00 Physics        │
└───────────────────────────────┘ └──────────────────────┘
75. MOBILE DASHBOARD TARGET
┌──────────────────────────┐
│ ☰ EduNexus        🔔     │
├──────────────────────────┤
│ Dashboard                │
│ Good morning, Dr. Verma  │
│                          │
│ [Main Campus]            │
│                          │
│ ┌──────────┐ ┌──────────┐│
│ │ Students │ │ Attend.  ││
│ │ 1,284    │ │ 92.4%    ││
│ └──────────┘ └──────────┘│
│                          │
│ ┌──────────┐ ┌──────────┐│
│ │ Fees     │ │ Staff    ││
│ │ ₹5.0L    │ │ 84       ││
│ └──────────┘ └──────────┘│
│                          │
│ Quick Actions            │
│                          │
│ [Add Student]            │
│ [Attendance]             │
│ [Collect Fee]            │
│                          │
│ Today's Schedule         │
│                          │
├──────────────────────────┤
│ Home Students Attend More│
└──────────────────────────┘
76. IMPLEMENTATION REQUIREMENTS

The redesign must be implemented through reusable components.

Required components:

AppShell
Sidebar
MobileHeader
MobileBottomNav
TopHeader
TenantSwitcher
BranchSwitcher
RoleSwitcher
GlobalSearch
UserMenu

PageHeader
PageContainer
SectionHeader

StatCard
Card
ProgressBar
AlertCard
ActivityList
ScheduleList
QuickActions

Button
Input
Select
SearchInput
DatePicker
Modal
Drawer
Dropdown
Badge
Tooltip
Tabs
Pagination
Table
DataTable
EmptyState
LoadingState
ErrorState
Toast
77. COMPONENT RULE

Do not recreate buttons/cards/forms separately in every page.

Create reusable components.

Example:

components/ui/Button.tsx

components/ui/Card.tsx

components/ui/Badge.tsx

components/ui/Input.tsx
78. THEME VARIABLES

Do not hard-code colors throughout components.

Bad:

className="bg-[#16a34a]"

everywhere.

Prefer centralized theme variables/classes.

79. DESIGN TOKENS

Create centralized tokens for:

Colors
Spacing
Typography
Radius
Shadows
Breakpoints
Transitions
80. ANIMATION

Animations must be subtle.

Allowed:

Fade
Small slide
Button loading
Drawer transition
Dropdown transition
Skeleton

Avoid:

Large page animations
Constant floating elements
Glowing animations
Excessive hover effects
81. PERFORMANCE

Do not introduce heavy UI libraries solely for visual effects.

Keep the existing lightweight React/Vite architecture.

The existing project uses React 18, Vite 6 and TypeScript, so the redesign should work within the current stack rather than replacing the application architecture unnecessarily.

82. DATA INTEGRATION

The redesign must NOT change business logic unnecessarily.

UI components should consume the existing application services/data layer.

Example:

Dashboard
 ↓
Dashboard Service
 ↓
Supabase
 ↓
PostgreSQL

The redesign is visual/UX work, not permission bypassing or database duplication.

83. REAL DATA ONLY

Dashboard metrics must eventually come from the real database.

Do not leave:

4 students
50% attendance
₹50,000 collected
3 staff

as hard-coded demonstration values in production.

84. LOADING DASHBOARD

While real data loads:

StatCard Skeleton
StatCard Skeleton
StatCard Skeleton

Then populate with actual data.

85. PERMISSION-AWARE UI

Dashboard cards and actions must respect permissions.

Example:

No fee permission
→ Do not show fee management actions.

No student creation permission
→ Do not show Add Student action.

No staff permission
→ Do not expose staff financial information.

Backend authorization remains mandatory.

86. TENANT-AWARE UI

Every dashboard query must use the active tenant context.

Never display another tenant's data.

87. BRANCH-AWARE UI

When branch filtering is enabled:

Dashboard
 ↓
Active Branch
 ↓
Branch-scoped queries

Changing branch should refresh relevant dashboard data.

88. RESPONSIVE DATA

Do not simply scale desktop UI down.

Use responsive transformations:

Desktop table
→ Mobile cards

Desktop sidebar
→ Mobile drawer

Desktop multi-column form
→ Mobile single column

Desktop KPI row
→ Mobile 2-column grid

Desktop quick actions
→ Mobile stacked/grid actions
89. BROWSER TESTING

Test:

Chrome
Edge
Safari
Firefox

where supported.

90. FINAL ACCEPTANCE CRITERIA

The redesign is complete only when:

✓ White/light theme is default
✓ Green is the primary brand/action color
✓ Dark theme is removed as default
✓ Excessive gradients are removed
✓ Glow effects are removed
✓ Dashboard is visually clean
✓ Sidebar is understandable
✓ Navigation hierarchy is clear
✓ Role switching is understandable
✓ Tenant switching is understandable
✓ Branch switching is understandable
✓ Dashboard KPIs are readable
✓ Quick actions are clear
✓ Tables are readable
✓ Forms are understandable
✓ Errors are understandable
✓ Loading states exist
✓ Empty states exist
✓ Mobile navigation works
✓ Mobile dashboard works
✓ Mobile forms work
✓ Mobile tables work
✓ No horizontal overflow
✓ Touch targets are usable
✓ Accessibility is considered
✓ Existing permissions remain enforced
✓ Tenant isolation remains enforced
✓ Branch isolation remains enforced
✓ Real database data is supported
✓ No production mock data remains
91. IMPLEMENTATION ORDER

Implement in this order:

1. Design tokens
        ↓
2. Global theme
        ↓
3. App shell
        ↓
4. Sidebar
        ↓
5. Header
        ↓
6. Mobile navigation
        ↓
7. Buttons / Inputs / Cards
        ↓
8. Tables / Forms
        ↓
9. Dashboard
        ↓
10. Students
        ↓
11. Staff
        ↓
12. Attendance
        ↓
13. Fees
        ↓
14. Exams
        ↓
15. Homework
        ↓
16. Timetable
        ↓
17. Communication
        ↓
18. Remaining modules
        ↓
19. Responsive testing
        ↓
20. Accessibility testing
92. FINAL DESIGN PRINCIPLE

The final EduNexus interface should feel like:

A clean, trustworthy, professional education ERP that school and coaching-centre staff can understand immediately.

It should not feel like:

A futuristic AI dashboard template.

The UI must communicate information first and decoration second.

END OF DOCUMENT

### This is the direction I recommend

Your screenshot specifically shows the problems we need to fix:

**Current → New**

```text
Dark navy             → White / light gray
Purple/blue neon      → Green
Huge gradient hero    → Simple page header
Glowing cards         → Subtle bordered cards
Too many pills        → Normal controls
Role buttons everywhere → One role switcher
Dense dashboard       → Clear sections
Desktop-first         → Mobile-first responsive
AI-looking            → Professional ERP
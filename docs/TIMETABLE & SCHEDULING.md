# TIMETABLE & SCHEDULING
# School + Coaching Centre ERP SaaS

**Document:** `14-TIMETABLE-AND-SCHEDULING.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `13-ATTENDANCE-MANAGEMENT.md`  
**Next Document:** `15-HOMEWORK-AND-ASSIGNMENTS.md`

---

# 1. Purpose

This document defines the timetable and scheduling architecture of the ERP.

The system must support:

- School timetables
- Coaching batch schedules
- Teacher schedules
- Student schedules
- Room allocation
- Subject scheduling
- Recurring schedules
- Schedule conflicts
- Schedule changes
- Holiday awareness
- Attendance-session integration
- Mobile timetable views

The timetable must work with the academic structure defined previously.

---

# 2. Core Scheduling Architecture

The basic relationship is:

```text
ACADEMIC YEAR
      ↓
ACADEMIC CONTEXT
      ↓
SCHEDULE
      ↓
TIME SLOT
      ↓
SUBJECT
      ↓
TEACHER
      ↓
ROOM
```

For students:

```text
STUDENT
   ↓
ENROLLMENT
   ↓
ACADEMIC CONTEXT
   ↓
TIMETABLE
```

---

# 3. School Timetable

For schools:

```text
School
 ↓
Academic Year
 ↓
Class
 ↓
Section
 ↓
Subject
 ↓
Teacher
 ↓
Room
 ↓
Time Slot
```

Example:

```text
Monday
10A
Mathematics
Mr. Sharma
Room 201
9:00–10:00
```

---

# 4. Coaching Timetable

For coaching centres:

```text
Coaching Centre
 ↓
Academic Year
 ↓
Course
 ↓
Batch
 ↓
Subject
 ↓
Teacher
 ↓
Room
 ↓
Time Slot
```

Example:

```text
Monday
JEE Morning Batch
Physics
Mr. Sharma
Room 3
7:00–8:30
```

---

# 5. Schedule Entry

A schedule entry represents one planned teaching occurrence or recurring teaching rule.

Conceptually:

```text
Schedule Entry
 ├── Tenant
 ├── Academic Year
 ├── Academic Context
 ├── Subject
 ├── Teacher
 ├── Room
 ├── Day
 ├── Start Time
 └── End Time
```

---

# 6. Day of Week

Recurring schedules may use:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
```

The institution may disable days that are not used.

---

# 7. Time Slot

A time slot represents a period during which a class/session can occur.

Example:

```text
Period 1
09:00–10:00

Period 2
10:00–11:00
```

---

# 8. Flexible Time Slots

Coaching centres may use variable durations:

```text
07:00–08:30
08:30–10:00
```

The system must not assume every institution uses exactly one-hour periods.

---

# 9. School Periods

Schools may configure named periods:

```text
Period 1
Period 2
Break
Period 3
Period 4
Lunch
Period 5
```

Breaks should not be treated as teaching sessions.

---

# 10. Coaching Sessions

Coaching centres may schedule sessions directly by time:

```text
07:00–08:30 Physics
09:00–10:30 Chemistry
```

The UI should not force school-style period numbering when it is unnecessary.

---

# 11. Recurring Schedule

A recurring schedule means:

```text
Every Monday
Every Wednesday
Every Friday
```

for a defined date range.

Example:

```text
01-Apr-2026 → 31-Mar-2027
Monday
10:00–11:00
Mathematics
Class 10A
```

---

# 12. Schedule Start and End

Recurring entries should have:

```text
Start Date
End Date
```

This prevents schedules from continuing indefinitely.

---

# 13. Schedule Exceptions

A recurring class may be cancelled or changed on a particular date.

Example:

```text
Normal:
Monday 10:00 Mathematics

Exception:
15-Aug-2026
Cancelled
```

The exception must override the recurring schedule for that date.

---

# 14. Schedule Override

A specific occurrence can be changed without changing the entire recurring schedule.

Example:

```text
Normal:
Monday 10:00–11:00

15-Aug:
Changed to 11:00–12:00
```

Only the selected occurrence changes.

---

# 15. Holiday Handling

If the institution defines a holiday:

```text
Holiday
 ↓
Scheduled Classes
 ↓
No Normal Session
```

The system should avoid generating normal attendance sessions on holidays unless explicitly overridden.

---

# 16. Holiday Override

Authorized users may intentionally schedule a session on a holiday if the institution permits it.

Example:

```text
Holiday
 ↓
Special Class
 ↓
Scheduled
```

---

# 17. Teacher Conflict

A teacher cannot normally teach two sessions at the same time.

Invalid:

```text
10:00–11:00
Class 10A Mathematics
Teacher A

10:30–11:30
Class 10B Physics
Teacher A
```

The system should detect the overlap.

---

# 18. Student Conflict

A student's academic contexts should not create impossible overlapping sessions.

Example:

```text
Student enrolled in:
Batch A
Batch B

Both:
10:00–11:00
```

The system should warn or block according to configuration.

---

# 19. Room Conflict

A room cannot normally host two sessions simultaneously.

Invalid:

```text
Room 201
10:00–11:00
Class 10A

Room 201
10:30–11:30
Class 11A
```

---

# 20. Conflict Detection

Before saving a schedule, check:

```text
Teacher conflict
Room conflict
Academic context conflict
Student enrollment conflict
Time overlap
Date overlap
```

---

# 21. Conflict Severity

Possible levels:

```text
ERROR
WARNING
```

An error should prevent saving.

A warning can allow the administrator to continue deliberately.

---

# 22. Conflict Message

Example:

```text
Schedule conflict detected.

Mr. Sharma is already assigned to:
Class 10B — Mathematics
10:00–11:00

Your new schedule:
Class 10A — Physics
10:30–11:30
```

---

# 23. Schedule Creation

Flow:

```text
Timetable
 ↓
Create Schedule
 ↓
Select Academic Context
 ↓
Select Subject
 ↓
Select Teacher
 ↓
Select Room
 ↓
Select Day
 ↓
Select Time
 ↓
Set Date Range
 ↓
Validate
 ↓
Save
```

---

# 24. Quick Schedule Creation

For admins who frequently create schedules:

```text
Select Class/Batch
 ↓
Select Subject
 ↓
Select Teacher
 ↓
Select Time
 ↓
Save
```

Default values can reduce unnecessary input.

---

# 25. Timetable Grid

School desktop view:

```text
          Mon       Tue       Wed       Thu       Fri
09:00     Math      English   Physics   Math      Science
10:00     Physics   Math      English   Science   Math
11:00     Break     Break     Break     Break     Break
12:00     Science   Physics   Math      English   Physics
```

---

# 26. Mobile Timetable

On mobile, use a vertical list instead of a wide grid.

Example:

```text
MONDAY

09:00–10:00
Mathematics
Class 10A
Mr. Sharma
Room 201

10:00–11:00
Physics
Class 10A
Mr. Khan
Room 202
```

---

# 27. Teacher Timetable

Teacher view:

```text
My Schedule

MONDAY

09:00
Class 10A
Mathematics
Room 201

11:00
Class 9A
Mathematics
Room 103
```

---

# 28. Student Timetable

Student view:

```text
My Timetable

Monday
09:00 Mathematics
10:00 Physics
11:00 Break
12:00 English
```

The timetable must be generated from the student's active enrollment.

---

# 29. Parent Timetable

Parent view:

```text
Child: Rahul

Monday
09:00 Mathematics
10:00 Physics
12:00 English
```

For multiple children:

```text
Child A
Child B
```

must be selectable.

---

# 30. Admin Timetable

Admin can switch between:

```text
Class View
Section View
Batch View
Teacher View
Room View
```

according to institution type and permissions.

---

# 31. Academic Context Filter

School:

```text
Class
Section
```

Coaching:

```text
Course
Batch
```

Only relevant filters should be displayed.

---

# 32. Subject Filter

Allow:

```text
All Subjects
Mathematics
Physics
Chemistry
English
```

---

# 33. Teacher Filter

Allow administrators to inspect:

```text
Teacher A
Teacher B
Teacher C
```

and see their schedules.

---

# 34. Room Filter

Where room management exists:

```text
Room 101
Room 102
Lab 1
Auditorium
```

can be selected.

---

# 35. Room Configuration

A room can have:

```text
Room Name
Room Code
Capacity
Type
Status
```

Examples:

```text
Classroom
Laboratory
Computer Lab
Seminar Hall
```

---

# 36. Room Capacity

If:

```text
Room Capacity = 40
```

and:

```text
Expected Students = 55
```

the system should warn or block according to configuration.

---

# 37. Online Sessions

If the product supports online classes, a schedule may contain:

```text
Online Session
Meeting Link
Platform
```

Do not assume every schedule requires a physical room.

---

# 38. Physical vs Online

A schedule can conceptually be:

```text
PHYSICAL
```

or:

```text
ONLINE
```

or, where supported:

```text
HYBRID
```

---

# 39. Timetable Status

Possible statuses:

```text
Draft
Published
Cancelled
Archived
```

---

# 40. Draft Timetable

Draft schedules are not yet visible to students/parents unless explicitly permitted.

---

# 41. Published Timetable

Published schedules become visible to relevant users.

```text
Admin
 ↓
Publish
 ↓
Teacher
Student
Parent
```

---

# 42. Schedule Publishing

Before publishing:

```text
Validate conflicts
Validate required fields
Review changes
Confirm
```

---

# 43. Timetable Versioning

When practical, maintain timetable change history.

Example:

```text
Version 1
Published: 01-Apr

Version 2
Published: 15-Apr
```

This is especially useful when schedules change frequently.

---

# 44. Schedule Change

Example:

```text
Original:
Physics
10:00–11:00
Room 201

Changed:
Physics
11:00–12:00
Room 202
```

The system should preserve the change where audit/versioning is supported.

---

# 45. Cancellation

A class can be cancelled for a specific date.

```text
Scheduled
 ↓
Cancelled
```

The recurring schedule should remain unchanged unless the administrator chooses to change it permanently.

---

# 46. Rescheduling

A session can be moved:

```text
Monday 10:00
 ↓
Tuesday 12:00
```

The system should check conflicts for the new time.

---

# 47. Substitution

If a teacher is unavailable:

```text
Original Teacher
 ↓
Substitute Teacher
```

Example:

```text
Physics
Class 10A
Original: Mr. Sharma
Substitute: Mr. Khan
```

The original recurring assignment should remain intact where appropriate.

---

# 48. Substitute Permissions

The substitute teacher should gain the necessary session-level teaching access for that occurrence.

They should not automatically gain permanent access to the entire class.

---

# 49. Schedule and Attendance

The timetable can be the source for expected attendance sessions.

Example:

```text
Timetable
 ↓
Monday 10:00 Mathematics
 ↓
Attendance Session
 ↓
Student List
```

---

# 50. Attendance Auto-Creation

If enabled:

```text
Scheduled Class
 ↓
Attendance Session Automatically Available
```

The teacher can open:

```text
Today's Classes
 ↓
Take Attendance
```

---

# 51. Attendance Must Not Depend Exclusively on Timetable

Authorized users should still be able to create manual attendance sessions where the institution allows it.

This supports:

```text
Extra Class
Make-up Class
Special Session
Exam
```

---

# 52. Timetable and Homework

Homework can be associated with the scheduled subject/session.

Example:

```text
10:00 Mathematics
 ↓
Homework
 ↓
Class 10A
```

Detailed homework rules belong to the homework module.

---

# 53. Timetable and Exams

Exam sessions may require special scheduling.

Do not automatically treat every exam as a normal teaching session.

---

# 54. Timetable and Rooms

Exams may require:

```text
Room Allocation
Seat Capacity
Invigilator
```

These belong to exam scheduling when that module is implemented.

---

# 55. Schedule Search

Admins should be able to search/filter by:

```text
Teacher
Class
Section
Course
Batch
Subject
Room
Day
```

---

# 56. Today's Schedule

All users should have a context-appropriate "Today" view.

Teacher:

```text
Today's Classes
```

Student:

```text
Today's Timetable
```

Parent:

```text
Child's Timetable
```

Admin:

```text
Today's Schedule
```

---

# 57. Next Class

The dashboard can highlight:

```text
Next Class

Mathematics
10:00–11:00
Class 10A
Room 201
```

---

# 58. Current Class

If the current time falls inside a scheduled session:

```text
LIVE NOW

Physics
10:00–11:00
Room 202
```

For online sessions, a join action may be displayed if supported.

---

# 59. Teacher Quick Action

Teacher can see:

```text
Today's Classes

10:00 Mathematics
[Take Attendance]

12:00 Physics
[Take Attendance]
```

---

# 60. Student Quick Action

Student can see:

```text
Next Class
Mathematics
10:00 AM
Room 201
```

---

# 61. Parent Quick Action

Parent can see:

```text
Rahul
Next Class:
Physics — 11:00 AM
```

---

# 62. Timetable Empty State

If no timetable exists:

```text
No timetable has been published yet.
```

Admin may see:

```text
[Create Timetable]
```

---

# 63. No Classes Today

Display:

```text
No classes scheduled today.
```

Do not show a confusing empty table.

---

# 64. Cancelled Session UI

Cancelled sessions should be visually distinct.

Example:

```text
10:00 Mathematics
CANCELLED
```

Do not remove the record completely if historical/audit information is required.

---

# 65. Rescheduled Session UI

Example:

```text
10:00 Physics
RESCHEDULED

New Time:
12:00–13:00
```

---

# 66. Teacher Conflict UI

During creation:

```text
⚠ Teacher conflict

Mr. Sharma already has a class
from 10:00–11:00.
```

---

# 67. Room Conflict UI

```text
⚠ Room conflict

Room 201 is already booked
from 10:00–11:00.
```

---

# 68. Timetable Bulk Creation

For large schools/coaching centres, support efficient entry.

Possible workflow:

```text
Select Class/Batch
 ↓
Open Weekly Grid
 ↓
Click Empty Slot
 ↓
Select Subject
 ↓
Select Teacher
 ↓
Select Room
 ↓
Save
```

---

# 69. Weekly Grid Editing

Admin should be able to drag/move schedule entries where the UI supports it.

However:

```text
Drag
 ↓
Validate Conflict
 ↓
Confirm
```

must happen before committing.

---

# 70. Drag-and-Drop Safety

Do not immediately save a drag operation if it creates a conflict.

Show:

```text
Conflict detected.
Cannot move Mathematics to this slot.
```

---

# 71. Timetable Copy

Admin may need to copy a timetable:

```text
Class 10A
 ↓
Copy
 ↓
Class 10B
 ↓
Review
 ↓
Save
```

All copied entries must undergo conflict validation.

---

# 72. Batch Schedule Copy

Similarly:

```text
Morning Batch
 ↓
Copy Schedule
 ↓
Evening Batch
 ↓
Adjust Time
 ↓
Save
```

---

# 73. Academic Year Copy

When creating a new academic year, the previous timetable may be used as a starting template.

Flow:

```text
2025–26 Timetable
 ↓
Copy as Template
 ↓
2026–27
 ↓
Review
 ↓
Adjust
 ↓
Publish
```

Do not automatically publish copied schedules.

---

# 74. Timetable Templates

Templates can help with repeated structures.

Example:

```text
Class 10 Standard Timetable
```

Then customize:

```text
Section A
Section B
Section C
```

---

# 75. Timetable Validation

Before publication, validate:

```text
No teacher conflict
No room conflict
No impossible student conflict
All required fields present
Academic context active
Teacher active
Subject active
Date range valid
```

---

# 76. Inactive Teacher

Do not create new schedule assignments for an inactive teacher.

Existing historical schedules should remain intact.

---

# 77. Inactive Subject

Do not create new sessions for an inactive subject.

Historical sessions remain available.

---

# 78. Inactive Academic Context

Do not create new schedule entries for:

```text
Archived Class
Archived Batch
```

unless specifically creating historical data.

---

# 79. Tenant Isolation

Every schedule must belong to a tenant.

Tenant A must never access:

```text
Tenant B timetable
Tenant B rooms
Tenant B teachers
Tenant B classes
```

---

# 80. Permission Rules

### Tenant Admin

Can manage all permitted timetable configuration.

### Staff

Can manage according to assigned permissions.

### Teacher

Can view their schedule and relevant classes.

### Student

Can view their timetable.

### Parent

Can view their children's timetables.

---

# 81. Teacher Editing

Teachers should generally not be allowed to modify the master timetable unless explicitly granted permission.

They may:

```text
View
Request Change
Report Conflict
```

depending on product functionality.

---

# 82. Timetable Change Request

Advanced workflow:

```text
Teacher
 ↓
Request Schedule Change
 ↓
Reason
 ↓
Admin Review
 ↓
Approve / Reject
```

---

# 83. Schedule Notifications

When a published schedule changes, users may receive:

```text
Schedule Updated

Physics has moved from:
10:00 AM → 12:00 PM
```

Notification behavior must follow the notification configuration.

---

# 84. Notification Recipients

Potential recipients:

```text
Teacher
Students
Parents
```

only when they are affected and authorized.

---

# 85. Room Change Notification

Example:

```text
Room Changed

Mathematics
Today
Room 201 → Room 305
```

---

# 86. Cancellation Notification

Example:

```text
Class Cancelled

Physics
Today at 10:00 AM
```

---

# 87. Timetable Calendar View

The system may support:

```text
Day
Week
Month
```

views.

Weekly view is the primary timetable representation.

---

# 88. Calendar vs Timetable

Do not confuse:

```text
Academic Timetable
```

with:

```text
Personal Calendar
```

The timetable defines recurring academic sessions.

The calendar may later aggregate additional events.

---

# 89. Date-Specific Schedule

When viewing a particular date:

```text
31-Aug-2026
```

the system must resolve:

```text
Recurring Schedule
+
Exceptions
+
Cancellations
+
Reschedules
+
Holidays
```

to determine the final schedule.

---

# 90. Schedule Resolution Priority

Use the following conceptual priority:

```text
Specific Date Override
        ↓
Cancellation / Exception
        ↓
Recurring Schedule
```

The most specific applicable rule wins.

---

# 91. Attendance Resolution

When generating attendance for a date:

```text
Resolve Schedule
 ↓
Check Cancellation
 ↓
Check Special Session
 ↓
Create/Expose Attendance Session
```

Do not create attendance for a cancelled session.

---

# 92. Timezone

All schedule calculations must use the tenant's configured/local timezone.

Do not assume UTC is the display timezone.

---

# 93. Daylight Saving Consideration

For institutions in regions where daylight saving changes occur, recurring schedule calculations must use timezone-aware date/time handling.

---

# 94. Date Validation

The system should prevent:

```text
End Date < Start Date
```

and invalid time ranges such as:

```text
End Time <= Start Time
```

unless overnight sessions are explicitly supported.

---

# 95. Schedule Data Model Concept

Conceptually:

```text
SCHEDULE
 ├── tenant
 ├── academic_year
 ├── academic_context
 ├── subject
 ├── teacher
 ├── room
 ├── recurrence
 ├── start_date
 └── end_date

SCHEDULE OCCURRENCE / EXCEPTION
 ├── schedule
 ├── date
 ├── start_time
 ├── end_time
 ├── status
 └── override information
```

Actual table names must follow the canonical project schema.

---

# 96. Conflict Algorithm

Conceptually:

```text
For new schedule:

1. Find schedules in same tenant.
2. Filter overlapping date range.
3. Compare overlapping times.
4. Compare teacher.
5. Compare room.
6. Compare academic context/student scope.
7. Report conflicts.
```

---

# 97. Time Overlap Rule

Two sessions overlap when:

```text
New Start < Existing End
AND
New End > Existing Start
```

This should be evaluated using proper timezone-aware datetime logic.

---

# 98. Teacher Availability

Future enhancement:

```text
Teacher Availability
 ↓
Monday 9–5
Tuesday 9–1
```

Schedule creation can then detect unavailable periods.

This should not be assumed unless implemented.

---

# 99. Room Availability

Future enhancement:

```text
Room Availability
 ↓
Room 201
Monday–Friday
8 AM–6 PM
```

Again, implement only if included in the project's actual scope.

---

# 100. Performance

Timetable pages must remain responsive even with:

```text
Hundreds of classes
Hundreds of teachers
Many rooms
Large recurring schedules
```

Use efficient queries and avoid loading unrelated tenant data.

---

# 101. Caching

Published timetable data may be cached for read-heavy student/parent views, provided cache invalidation respects schedule updates and tenant isolation.

---

# 102. Mobile Performance

Teacher/student timetable screens should load only the relevant date/context where possible.

Avoid loading the entire institution timetable for a student.

---

# 103. Audit Events

Important events:

```text
schedule.created
schedule.updated
schedule.published
schedule.cancelled
schedule.rescheduled
schedule.archived
schedule.exception_created
schedule.substitute_assigned
```

---

# 104. Timetable Business Rules

The system must enforce:

1. Every schedule belongs to a tenant.
2. Every schedule belongs to an academic year/context.
3. Teacher conflicts are detected.
4. Room conflicts are detected.
5. Academic context conflicts are detected.
6. Historical schedules remain available where required.
7. Published schedules are visible only to authorized users.
8. Cancelled sessions remain auditable.
9. Specific-date overrides take precedence over recurring rules.
10. Timetable changes must not silently alter historical attendance.
11. Time calculations use the correct timezone.
12. Cross-tenant references are impossible.

---

# 105. Antigravity MUST NOT

Antigravity must NOT:

- Allow overlapping teacher assignments without explicit override.
- Allow overlapping room bookings without explicit override.
- Automatically change every recurring class when one occurrence needs changing.
- Delete cancelled historical sessions.
- Generate attendance for cancelled sessions.
- Expose the full tenant timetable to students unnecessarily.
- Allow teachers to edit master schedules without permission.
- Ignore holidays/exceptions when resolving schedules.
- Use the student's current class to rewrite historical schedules.
- Mix schedules between tenants.
- Trust client-side conflict checks as the only protection.

---

# 106. Complete School Workflow

```text
Admin
 ↓
Create Academic Year
 ↓
Create Classes
 ↓
Create Sections
 ↓
Create Subjects
 ↓
Assign Teachers
 ↓
Configure Rooms
 ↓
Create Weekly Timetable
 ↓
Validate Conflicts
 ↓
Publish
 ↓
Teacher / Student / Parent Views
 ↓
Attendance Sessions
```

---

# 107. Complete Coaching Workflow

```text
Admin
 ↓
Create Academic Year
 ↓
Create Courses
 ↓
Create Batches
 ↓
Create Subjects
 ↓
Assign Teachers
 ↓
Configure Rooms
 ↓
Create Batch Schedule
 ↓
Validate Conflicts
 ↓
Publish
 ↓
Teacher / Student / Parent Views
 ↓
Attendance Sessions
```

---

# 108. Final Architecture

```text
                         TENANT
                           |
                     ACADEMIC YEAR
                           |
                    ACADEMIC CONTEXT
                           |
                       TIMETABLE
                           |
              +------------+------------+
              |            |            |
           SUBJECT       TEACHER       ROOM
              |            |            |
              +------------+------------+
                           |
                       TIME SLOT
                           |
                     DATE / RECURRENCE
                           |
                +----------+----------+
                |                     |
            SCHEDULE              EXCEPTION
                |                     |
                +----------+----------+
                           |
                    FINAL SESSION
                           |
                 +---------+---------+
                 |                   |
             ATTENDANCE          USER VIEWS
```

---

# 109. Final Principle

> **The timetable represents the planned academic schedule. Recurring schedules define the normal pattern, while date-specific exceptions, cancellations, and reschedules determine what actually happens on a particular day. The resolved schedule can drive attendance and user-facing views, but timetable changes must never silently corrupt historical academic records.**

---

# 110. Next Document

The next specification is:

```text
15-HOMEWORK-AND-ASSIGNMENTS.md
```

It will define:

```text
Teacher
 ↓
Class / Section / Batch
 ↓
Subject
 ↓
Homework / Assignment
 ↓
Attachments
 ↓
Student Submission
 ↓
Teacher Review
 ↓
Marks / Feedback
 ↓
Parent & Student Visibility
```

It will cover **creating assignments, assigning to classes/batches, due dates, attachments, submissions, late submissions, teacher review, feedback, mobile workflows, notifications, and permission/security rules.**

---

# END OF DOCUMENT
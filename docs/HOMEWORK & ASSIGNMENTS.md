# HOMEWORK & ASSIGNMENTS
# School + Coaching Centre ERP SaaS

**Document:** `15-HOMEWORK-AND-ASSIGNMENTS.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `14-TIMETABLE-AND-SCHEDULING.md`  
**Next Document:** `16-EXAMS-AND-ASSESSMENTS.md`

---

# 1. Purpose

This document defines the complete Homework and Assignments module.

The module allows teachers to:

- Create homework.
- Create assignments.
- Assign work to classes, sections, or batches.
- Set due dates.
- Add instructions.
- Attach files.
- Track student submissions.
- Review submissions.
- Give marks.
- Give feedback.
- Track late submissions.
- Notify students and parents.
- View assignment performance.

The system must support both:

```text
SCHOOL
Class → Section → Subject → Students
```

and:

```text
COACHING
Course → Batch → Subject → Students
```

---

# 2. Core Architecture

The basic flow is:

```text
Teacher
   ↓
Create Assignment
   ↓
Select Academic Context
   ↓
Select Subject
   ↓
Set Instructions
   ↓
Set Due Date
   ↓
Attach Resources
   ↓
Publish
   ↓
Student
   ↓
View Assignment
   ↓
Submit
   ↓
Teacher
   ↓
Review
   ↓
Marks + Feedback
```

---

# 3. Assignment Types

The system may support:

```text
HOMEWORK
ASSIGNMENT
PROJECT
PRACTICE
CLASSWORK
```

The exact visible types can be configured by the institution.

The underlying assignment architecture should remain reusable.

---

# 4. Assignment

An assignment represents academic work given to students.

Example:

```text
Mathematics
Chapter 5 Exercises
Class 10A
Due: 02-Sep-2026
```

---

# 5. Homework

Homework is a recurring/common use case.

Example:

```text
Subject: Mathematics
Title: Quadratic Equations
Instructions:
Complete questions 1–10.
Due: Tomorrow
```

---

# 6. Academic Scope

Every assignment must belong to an academic context.

School:

```text
Academic Year
 ↓
Class
 ↓
Section
 ↓
Subject
```

Coaching:

```text
Academic Year
 ↓
Course
 ↓
Batch
 ↓
Subject
```

---

# 7. Student Scope

The assignment should be assigned to students through their relevant enrollment/context.

Do not manually maintain a separate student list unless the product explicitly supports individual assignment.

---

# 8. Individual Assignment

Advanced functionality may allow:

```text
Assignment
 ↓
Specific Student
```

Example:

```text
Remedial Mathematics Practice
Assigned only to Rahul
```

This must require appropriate teacher permission.

---

# 9. Group Assignment

The normal workflow should be group-based.

Example:

```text
Class 10A
 ↓
Mathematics
 ↓
Assignment
 ↓
All active students
```

---

# 10. Assignment Title

Every assignment must have a clear title.

Examples:

```text
Quadratic Equations Practice
Chapter 4 Homework
Physics Numericals
Organic Chemistry Worksheet
```

---

# 11. Instructions

Assignments should contain teacher instructions.

Example:

```text
Solve questions 1–15 from Exercise 4.2.
Show all working.
Submit as a PDF.
```

Instructions should support readable formatting.

---

# 12. Subject

Every academic assignment should normally be associated with a subject.

Example:

```text
Subject:
Mathematics
```

---

# 13. Teacher

The assignment should record the teacher who created or owns it.

Example:

```text
Created By:
Mr. Sharma
```

Teacher ownership must respect tenant and academic permissions.

---

# 14. Created Date

Record:

```text
Created At
```

This is useful for:

- Audit
- Sorting
- Reporting
- Notifications
- History

---

# 15. Due Date

Every submission-based assignment should have a due date.

Example:

```text
Due:
02-Sep-2026
11:59 PM
```

---

# 16. Due Time

The system should support both:

```text
Due Date
```

and:

```text
Due Date + Time
```

depending on institution configuration.

---

# 17. No Due Date

Some homework may intentionally have no strict deadline.

If supported:

```text
Due Date:
No deadline
```

The UI must clearly communicate that the assignment has no due date.

---

# 18. Publication Status

Assignments should support:

```text
DRAFT
PUBLISHED
CLOSED
ARCHIVED
```

---

# 19. Draft

Draft assignments are not visible to students/parents.

Teacher can continue editing them.

---

# 20. Published

Published assignments are visible to their intended recipients.

Flow:

```text
Draft
 ↓
Publish
 ↓
Student / Parent
```

---

# 21. Closed

Closed means:

```text
New submissions are no longer accepted.
```

Previously submitted work remains accessible to authorized users.

---

# 22. Archived

Archived assignments are retained for historical purposes but removed from active assignment lists.

---

# 23. Assignment Attachments

Teachers may attach learning materials such as:

```text
PDF
DOC/DOCX
PPT/PPTX
Images
Worksheets
Reference Files
```

The exact allowed file types should be controlled by the application.

---

# 24. Attachment Security

Uploaded files must be associated with:

```text
Tenant
Assignment
Uploader
```

and access must be authorized.

Do not expose private files through unrestricted public URLs.

---

# 25. Attachment Limits

The system should define:

```text
Maximum file size
Maximum number of attachments
Allowed MIME types
```

These should be configurable where practical.

---

# 26. Student Submission

A student can submit work through:

```text
File Upload
Text Response
```

or both, if supported.

Example:

```text
Submission

Answer:
Completed all questions.

Attachment:
math-homework.pdf
```

---

# 27. Submission Status

Recommended statuses:

```text
NOT_STARTED
DRAFT
SUBMITTED
LATE
RETURNED
RESUBMITTED
```

The exact status model should remain consistent throughout the system.

---

# 28. Not Started

Student has not submitted anything.

```text
Status: Not Submitted
```

---

# 29. Draft Submission

Student started preparing the submission but has not finalized it.

```text
Status: Draft
```

Draft submissions must not be treated as completed submissions.

---

# 30. Submitted

Student finalized the submission before the deadline.

```text
Status: Submitted
```

---

# 31. Late

If the student submits after the due date:

```text
Status: Late
```

The system should determine lateness using server-side timestamps.

---

# 32. Returned

Teacher can return the submission for correction if the workflow supports revisions.

Example:

```text
Teacher Review
 ↓
Needs Correction
 ↓
Return to Student
```

---

# 33. Resubmission

If enabled:

```text
Submitted
 ↓
Teacher Returns
 ↓
Student Corrects
 ↓
Resubmits
```

The system should preserve submission history.

---

# 34. Submission Attempts

If multiple submissions are supported, record:

```text
Attempt 1
Attempt 2
Attempt 3
```

Each attempt should have:

```text
Submitted At
Files
Text
Status
```

---

# 35. Submission Deadline

At the due time:

```text
Due Date/Time
 ↓
Compare current server time
 ↓
Determine On Time / Late
```

Do not rely on the student's device clock.

---

# 36. Late Submission Policy

Tenant configuration may determine:

```text
Allow Late Submission
Reject Late Submission
Allow With Warning
```

---

# 37. Late Submission Warning

If late submissions are allowed:

```text
This assignment is overdue.
Your submission will be marked late.
```

The student must clearly understand the consequence.

---

# 38. Teacher Review

Teacher can open:

```text
Assignment
 ↓
Submissions
 ↓
Student
 ↓
Submission
```

and review the work.

---

# 39. Submission List

Teacher view:

```text
Assignment: Quadratic Equations

Submitted     34
Pending        5
Late           3
Returned       2
```

---

# 40. Student Submission Table

Example:

```text
Student       Status       Submitted
Rahul         Submitted    01-Sep
Aman          Pending      —
Sameer        Late         03-Sep
Arjun         Submitted    02-Sep
```

---

# 41. Search Submissions

Teacher should be able to search by:

```text
Student Name
Student ID
Roll Number
```

---

# 42. Submission Filters

Useful filters:

```text
All
Pending
Submitted
Late
Returned
Resubmitted
Reviewed
Unreviewed
```

---

# 43. Teacher Feedback

Teacher can provide feedback.

Example:

```text
Good work.

Question 7 needs correction.
Please review the quadratic formula.
```

---

# 44. Marks

Assignments may optionally support marks.

Example:

```text
Marks:
8 / 10
```

The maximum marks should be defined by the assignment.

---

# 45. Grading

If the institution uses grades:

```text
A
B
C
D
```

the assignment may store a grade instead of, or in addition to, marks.

---

# 46. Rubrics

Advanced functionality may support:

```text
Accuracy
Presentation
Concept Understanding
Problem Solving
```

Each criterion can have a score.

This is optional and should not complicate the basic assignment workflow.

---

# 47. Review Status

Teacher review can use:

```text
UNREVIEWED
REVIEWED
RETURNED
```

---

# 48. Reviewed Submission

Example:

```text
Rahul
Marks: 9/10
Feedback: Excellent work.
Status: Reviewed
```

---

# 49. Parent Visibility

Parents can see assignments for their linked children.

Example:

```text
Rahul

Mathematics
Quadratic Equations

Due:
Tomorrow

Status:
Pending
```

---

# 50. Parent Submission Visibility

Parents may be able to see:

```text
Submitted
Pending
Late
Marks
Teacher Feedback
```

according to institution settings.

---

# 51. Parent Must Not Modify Student Work

Parents should not be able to:

```text
Submit as Student
Change Marks
Change Teacher Feedback
```

unless an explicitly designed parent-assisted workflow exists.

---

# 52. Student Dashboard

Student dashboard can show:

```text
Pending Assignments
Due Today
Overdue
Recently Graded
```

---

# 53. Assignment Cards

Example:

```text
Mathematics
Quadratic Equations

Due Tomorrow
Pending

[Open Assignment]
```

---

# 54. Due Soon

Assignments approaching the deadline can be grouped:

```text
Due Today
Due Tomorrow
Due This Week
```

---

# 55. Overdue

Example:

```text
Physics Worksheet
Overdue by 2 days
```

---

# 56. Assignment Detail

Student should see:

```text
Title
Subject
Teacher
Instructions
Attachments
Assigned Date
Due Date
Submission Status
Submission History
Feedback
Marks
```

---

# 57. Teacher Assignment Detail

Teacher should see:

```text
Title
Academic Context
Subject
Due Date
Instructions
Attachments
Submission Statistics
```

and management actions.

---

# 58. Assignment Creation UI

Recommended workflow:

```text
Create Assignment

Title
Subject
Class / Section / Batch
Instructions
Attachments
Assigned Date
Due Date
Submission Type
Maximum Marks

[Save Draft]
[Publish]
```

---

# 59. Mobile Assignment Creation

The teacher workflow should be mobile-friendly.

Use sections:

```text
Basic Details
Instructions
Attachments
Deadline
Grading
Publish
```

Avoid an unnecessarily large form.

---

# 60. Mobile Student Submission

Recommended:

```text
Assignment
 ↓
Instructions
 ↓
Attachments
 ↓
[Submit Work]
 ↓
Add Text
Upload File
 ↓
[Submit]
```

---

# 61. Submission Confirmation

Before final submission:

```text
Submit Assignment?

You will submit your current work
to Mr. Sharma.

[Cancel]
[Submit]
```

---

# 62. Submission Success

After submission:

```text
✓ Assignment submitted

Submitted:
02-Sep-2026, 10:32 AM

Status:
Submitted
```

---

# 63. Edit Submission

If editing is allowed:

```text
Submitted
 ↓
Edit
 ↓
Resubmit
```

The policy should define whether the new submission becomes a new attempt.

---

# 64. Submission Lock

After the due date, depending on policy:

```text
Edit Submission
```

may be disabled.

---

# 65. Teacher Download

Teacher can download student submissions if authorized.

Bulk download can be supported for large assignments.

---

# 66. Bulk Download

Example:

```text
Assignment
 ↓
Select Students
 ↓
Download Submissions
```

The system should package files safely.

---

# 67. File Naming

Downloaded files should avoid collisions.

Example:

```text
Rahul_Kumar_Quadratic_Equations.pdf
```

---

# 68. File Access Control

A submission file should only be accessible to:

```text
Student Owner
Authorized Teacher
Authorized Admin
Authorized Parent
```

according to institutional rules.

---

# 69. Assignment Notifications

When an assignment is published:

```text
Assignment Published

Mathematics
Quadratic Equations

Due:
02-Sep-2026
```

Notifications may go to students and parents if enabled.

---

# 70. Due Reminder

Optional reminder:

```text
Reminder

Your Mathematics assignment
is due tomorrow.
```

Notification timing should be configurable.

---

# 71. Late Notification

If a student becomes overdue:

```text
Assignment Overdue

Physics Worksheet
was due yesterday.
```

Only send if the institution enables such notifications.

---

# 72. Grading Notification

When teacher grades the assignment:

```text
Assignment Graded

Mathematics
Marks: 9/10

Teacher feedback is available.
```

---

# 73. Notification Preferences

Users should be able to follow tenant-supported notification preferences.

Examples:

```text
Email
Push
In-App
SMS
```

Only supported channels should appear.

---

# 74. Assignment Calendar

Assignments can appear in a student calendar:

```text
02 Sep
Mathematics Homework Due
```

---

# 75. Teacher Calendar

Teacher can see:

```text
Assignments Due
Submission Deadlines
Review Work
```

---

# 76. Homework Dashboard

Teacher dashboard:

```text
Assignments
----------------
Draft: 3
Published: 12
Pending Review: 28
Overdue: 6
```

---

# 77. Student Homework Dashboard

```text
My Assignments
----------------
Due Today: 2
Due This Week: 5
Overdue: 1
Completed: 18
```

---

# 78. Parent Homework Dashboard

```text
Rahul

Pending: 3
Due Today: 1
Overdue: 1
Recently Graded: 2
```

---

# 79. Assignment Search

Search by:

```text
Title
Subject
Teacher
Class
Batch
Date
Status
```

---

# 80. Assignment Filters

Teacher:

```text
Draft
Published
Closed
Archived
```

Student:

```text
Pending
Submitted
Late
Graded
Overdue
```

---

# 81. Assignment Sorting

Useful sorting:

```text
Due Date
Created Date
Subject
Status
```

---

# 82. Academic Year Isolation

Assignments must belong to the correct academic year.

Example:

```text
2025–26
Mathematics Homework
```

must not appear as an active assignment in:

```text
2026–27
```

unless explicitly copied or migrated.

---

# 83. Historical Assignments

Past assignments can remain visible in historical records.

Example:

```text
Academic Year:
2025–26

Archived Assignment
```

---

# 84. Assignment Copy

Teacher/admin may duplicate an assignment:

```text
Copy Assignment
 ↓
Change Class/Batch
 ↓
Change Due Date
 ↓
Publish
```

Copying should create a new assignment ID.

---

# 85. Do Not Clone Submissions

When an assignment is copied:

```text
Assignment Data → Copy
Submissions → DO NOT COPY
Marks → DO NOT COPY
Feedback → DO NOT COPY
```

---

# 86. Assignment Deletion

Draft assignments may be deletable according to permissions.

Published assignments should generally be archived rather than hard-deleted if students have interacted with them.

---

# 87. Historical Integrity

Never delete:

```text
Submitted Work
Teacher Feedback
Marks
Submission History
```

just because an assignment is archived.

---

# 88. Teacher Permissions

Teacher can generally:

```text
Create Assignment
Edit Own Draft
Publish Own Assignment
View Submissions
Review
Grade
Provide Feedback
Close Assignment
```

subject to tenant permissions.

---

# 89. Teacher Scope

Teacher should only create assignments for:

```text
Assigned Class/Section
```

or:

```text
Assigned Batch
```

and subjects they are authorized to teach.

---

# 90. Admin Permissions

Authorized administrators may:

```text
View All Assignments
Create
Edit
Archive
Review
Manage Configuration
```

---

# 91. Student Permissions

Student can:

```text
View Assigned Work
Submit
View Own Submission
View Own Marks
View Own Feedback
```

---

# 92. Student Restrictions

Student must not:

```text
View Another Student's Submission
Edit Teacher Feedback
Change Marks
Access Teacher-Only Attachments
```

---

# 93. Parent Permissions

Parent can:

```text
View Child Assignments
View Child Submission Status
View Marks
View Feedback
```

according to tenant settings.

---

# 94. Multi-Tenant Security

Every assignment and submission must be tenant-scoped.

Tenant A must never access:

```text
Tenant B Assignments
Tenant B Submissions
Tenant B Files
Tenant B Student Data
```

---

# 95. Authorization

Every API operation must verify:

```text
Authenticated User
Tenant Membership
Role
Academic Scope
Assignment Ownership
Student Relationship
```

---

# 96. Direct ID Protection

Do not trust:

```text
assignment_id
student_id
submission_id
```

from the client.

The server must verify that the user has access to the requested resource.

---

# 97. Submission Integrity

The server should record:

```text
Submitted At
Submitted By
Submission Attempt
File Metadata
```

The timestamp must come from the server.

---

# 98. Assignment Audit Events

Important events:

```text
assignment.created
assignment.updated
assignment.published
assignment.closed
assignment.archived

submission.started
submission.submitted
submission.resubmitted
submission.returned

submission.reviewed
submission.graded
```

---

# 99. Grade Audit

When marks change:

```text
Old Marks
New Marks
Changed By
Changed At
Reason if required
```

should be retained where audit functionality exists.

---

# 100. Assignment Data Model Concept

Conceptually:

```text
ASSIGNMENT
 ├── tenant
 ├── academic_year
 ├── academic_context
 ├── subject
 ├── teacher
 ├── title
 ├── instructions
 ├── assigned_at
 ├── due_at
 ├── status
 └── maximum_marks

ASSIGNMENT ATTACHMENT
 ├── assignment
 ├── file
 └── uploaded_by

SUBMISSION
 ├── assignment
 ├── student
 ├── enrollment
 ├── status
 ├── submitted_at
 └── attempt

SUBMISSION FILE
 ├── submission
 └── file

REVIEW
 ├── submission
 ├── reviewer
 ├── marks
 ├── grade
 ├── feedback
 └── reviewed_at
```

Actual table names must follow the canonical project schema.

---

# 101. Submission Relationship

The important relationship is:

```text
Student
 ↓
Enrollment
 ↓
Academic Context
 ↓
Assignment
 ↓
Submission
 ↓
Review
```

This preserves historical academic context.

---

# 102. Assignment Validation

Before publishing:

```text
Title exists
Subject exists
Academic Context exists
Teacher authorized
Due date valid
Academic year active
Student scope valid
Attachments valid
```

---

# 103. Due Date Validation

If a due date exists:

```text
Due Date >= Assigned Date
```

unless the institution explicitly allows retroactive assignments.

---

# 104. Published Assignment Validation

A published assignment must have all required information.

Do not allow:

```text
Published
Title = empty
Subject = empty
```

---

# 105. Submission Validation

Before accepting submission:

```text
Student authenticated
Student belongs to tenant
Student is assigned
Assignment published
Assignment not closed
Submission policy allows submission
File type valid
File size valid
```

---

# 106. Grading Validation

Before saving marks:

```text
Marks >= 0
Marks <= Maximum Marks
```

If grades are configured, validate them against the allowed grading scale.

---

# 107. Assignment Performance

The teacher can see:

```text
Total Students: 40
Submitted: 34
Pending: 6
Late: 3
Average Marks: 7.8/10
```

---

# 108. Submission Rate

Basic calculation:

```text
Submission Rate =
Submitted Students / Assigned Students × 100
```

---

# 109. Average Score

If marks exist:

```text
Average Score =
Total Awarded Marks / Total Maximum Possible Marks
```

The reporting layer may use a more appropriate aggregation when assignments have different maximum marks.

---

# 110. Low Submission Detection

Teacher can filter:

```text
Not Submitted
```

and quickly identify students requiring follow-up.

---

# 111. Student Assignment Performance

Student dashboard may show:

```text
Completed: 18
Pending: 3
Late: 2

Average Score:
84%
```

Only include metrics supported by actual grading data.

---

# 112. Parent Performance View

Parent may see:

```text
Assignments:
18 completed
2 pending
1 overdue
```

and selected graded results if enabled.

---

# 113. Empty States

Student:

```text
No assignments found.
```

Teacher:

```text
No assignments created yet.
```

Submission:

```text
No submissions yet.
```

---

# 114. Loading States

Examples:

```text
Loading assignments...
Loading submissions...
Uploading file...
Submitting assignment...
Saving feedback...
```

---

# 115. Error States

Examples:

```text
Unable to load assignment.
Unable to upload file.
Submission failed.
Assignment is no longer accepting submissions.
You do not have permission.
```

Errors should be actionable and understandable.

---

# 116. Upload Progress

For larger files:

```text
Uploading...
████████░░ 80%
```

Do not make users unsure whether their upload is still running.

---

# 117. File Upload Failure

If upload fails:

```text
Upload failed.
[Retry]
```

Do not lose the rest of the student's draft unnecessarily.

---

# 118. Mobile File Handling

Mobile users should be able to select files using the platform's standard file picker.

Where supported, students may also upload photos/scans of handwritten work.

---

# 119. Image Submission

If image submissions are supported:

```text
Camera
Gallery
File
```

may be available on mobile.

---

# 120. Teacher Review on Mobile

Teacher should be able to:

```text
Open Submission
 ↓
View File
 ↓
Enter Marks
 ↓
Enter Feedback
 ↓
Save
```

without requiring desktop.

---

# 121. Bulk Review

Future enhancement:

```text
Multiple Submissions
 ↓
Bulk Marking
```

should only be implemented if the grading model supports it safely.

---

# 122. Assignment and Timetable Integration

A teacher can create homework from a scheduled subject/session.

Example:

```text
Today's Mathematics Class
 ↓
Create Homework
 ↓
Class 10A
 ↓
Mathematics automatically selected
```

This reduces repetitive entry.

---

# 123. Assignment and Attendance Integration

Assignments should not modify attendance.

They are separate academic records.

The relationship is informational:

```text
Timetable
 ↓
Teaching Session
 ├── Attendance
 └── Assignment
```

---

# 124. Assignment and Notifications Integration

Publishing or grading may trigger notification events.

The assignment module should emit events rather than directly implement every notification channel.

---

# 125. Assignment and Analytics Integration

Assignment data can feed:

```text
Academic Analytics
Student Performance
Teacher Dashboard
Parent Dashboard
```

Analytics must use authorized, tenant-scoped data.

---

# 126. Performance Considerations

The system should support:

```text
Large classes
Large coaching batches
Many assignments
Many submissions
Large file attachments
```

without loading everything into a single page request.

---

# 127. Pagination

Submission lists should use pagination or efficient virtualized loading for large classes.

Avoid loading thousands of submissions at once.

---

# 128. File Storage

Files should be stored using the application's file-storage architecture.

Database records should reference file metadata rather than storing large binary files directly unless the chosen architecture explicitly requires it.

---

# 129. File Metadata

Useful metadata:

```text
File Name
MIME Type
Size
Storage Key
Uploaded By
Uploaded At
```

---

# 130. Security Scanning

If supported by the infrastructure, uploaded files should pass appropriate security validation/scanning before being made available.

---

# 131. Assignment Business Rules

The system must enforce:

1. Every assignment belongs to a tenant.
2. Every assignment belongs to an academic context.
3. Teachers can only assign within their authorized scope.
4. Students only see assignments assigned to them.
5. Parents only see assignments for linked children.
6. Submissions belong to a specific assignment and student.
7. Submission timestamps come from the server.
8. Late status is calculated consistently.
9. Marks cannot exceed maximum marks.
10. Historical submissions must remain intact.
11. Published assignments must not be silently deleted.
12. File access must be authorized.
13. Tenant isolation must be enforced server-side.
14. Assignment copies must not copy submissions or marks.

---

# 132. Antigravity MUST NOT

Antigravity must NOT:

- Expose another student's submission.
- Allow a student to change their marks.
- Allow students to modify teacher feedback.
- Allow teachers to assign work outside their authorized scope.
- Trust client timestamps for deadlines.
- Delete submitted work when an assignment is archived.
- Copy submissions when duplicating assignments.
- Allow marks above the maximum.
- Make private uploaded files publicly accessible.
- Mix assignments between tenants.
- Treat draft submissions as final submissions.
- Automatically mark assignments submitted without explicit user action.

---

# 133. Complete Teacher Workflow

```text
Teacher Login
      ↓
Assignments
      ↓
Create Assignment
      ↓
Select Class/Batch
      ↓
Select Subject
      ↓
Enter Instructions
      ↓
Attach Resources
      ↓
Set Due Date
      ↓
Set Marks
      ↓
Save / Publish
      ↓
Students Notified
      ↓
Students Submit
      ↓
Teacher Reviews
      ↓
Marks + Feedback
      ↓
Student / Parent Notified
```

---

# 134. Complete Student Workflow

```text
Student Login
      ↓
Assignments
      ↓
Open Assignment
      ↓
Read Instructions
      ↓
Download/View Resources
      ↓
Prepare Work
      ↓
Upload / Enter Answer
      ↓
Submit
      ↓
Confirmation
      ↓
Teacher Review
      ↓
Marks + Feedback
```

---

# 135. Complete Parent Workflow

```text
Parent Login
      ↓
Select Child
      ↓
Assignments
      ↓
View Pending / Completed
      ↓
Open Assignment
      ↓
View Submission Status
      ↓
View Marks / Feedback
```

---

# 136. Final Architecture

```text
                         TENANT
                           |
                     ACADEMIC YEAR
                           |
                    ACADEMIC CONTEXT
                           |
                         SUBJECT
                           |
                       ASSIGNMENT
                     /     |      \
                    /      |       \
             INSTRUCTIONS  FILES   DUE DATE
                    |
                 STUDENTS
                    |
                SUBMISSIONS
                    |
             +------+------+
             |             |
           FILES         REVIEW
                           |
                    MARKS / FEEDBACK
                           |
             +-------------+-------------+
             |             |             |
          STUDENT        PARENT       TEACHER
```

---

# 137. Final Principle

> **An assignment is an academic task attached to a specific tenant, academic year, context, subject, and authorized teacher. Students interact with their own assignments and submissions, while teachers manage only their permitted academic scope. Submission history, grading, feedback, and files must remain secure and historically accurate.**

---

# 138. Next Document

The next specification is:

```text
16-EXAMS-AND-ASSESSMENTS.md
```

It will define:

```text
Exam / Assessment
      ↓
Academic Context
      ↓
Subject
      ↓
Exam Schedule
      ↓
Question / Marks
      ↓
Student Attempt / Result
      ↓
Evaluation
      ↓
Grades
      ↓
Report / Performance
```

It will cover **exams, tests, assessments, marks, grading, question structures, exam schedules, results, student performance, teacher evaluation, parent visibility, and academic reporting.**

---

# END OF DOCUMENT
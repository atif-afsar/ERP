# LIBRARY MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `57-LIBRARY-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Library Management Specification  
**Previous Document:** `56-INVENTORY-ASSET-MANAGEMENT.md`  
**Next Document:** `58-TRANSPORT-MANAGEMENT.md`

---

# 1. Purpose

This module manages the institution's library operations.

It covers:

```text
Library
Books
Book Titles
Book Copies
ISBN
Authors
Publishers
Categories
Shelves
Locations
Members
Library Cards
Book Issue
Book Return
Renewal
Reservation
Fines
Lost Books
Damaged Books
Library Rules
Library Reports
```

It must support:

```text
School
Coaching Centre
Multi-Branch Institution
Multi-Tenant SaaS
```

---

# 2. Core Principle

The library must distinguish between:

```text
Book Title
Book Copy
Library Member
Library Transaction
```

For example:

```text
Book Title:
Physics for Class 11

Copies:
COPY-001
COPY-002
COPY-003
```

A title represents the intellectual work.

A copy represents the physical item that can actually be issued.

---

# 3. Book Title

A book title contains bibliographic information.

Conceptually:

```text
BookTitle
---------
id
title
subtitle
isbn
edition
language
publisherId
publicationYear
description
categoryId
```

---

# 4. Book Copy

Each physical copy should have its own identity.

Conceptually:

```text
BookCopy
--------
id
bookTitleId
accessionNumber
barcode
locationId
status
condition
acquisitionDate
acquisitionCost
```

---

# 5. Accession Number

Every physical library copy should have a unique accession number.

Example:

```text
LIB-2026-00125
```

The accession number should remain associated with that physical copy throughout its lifecycle.

---

# 6. Barcode

A library copy may have a barcode.

Example:

```text
BC-00125
```

Barcode scanning can be used for:

```text
Issue
Return
Renewal
Inventory
Verification
```

---

# 7. ISBN

Books may contain:

```text
ISBN-10
ISBN-13
```

ISBN identifies the publication rather than necessarily the individual physical copy.

---

# 8. Multiple Copies

One title may have many copies.

Example:

```text
Book:
Mathematics Class 10

Copies:
10
```

Availability must be calculated at the copy level.

---

# 9. Book Status

Possible title/copy statuses should be clearly separated.

For copies:

```text
AVAILABLE
ISSUED
RESERVED
LOST
DAMAGED
UNDER_REPAIR
WITHDRAWN
```

---

# 10. Book Condition

Possible:

```text
NEW
GOOD
FAIR
DAMAGED
POOR
```

Condition changes must be auditable where appropriate.

---

# 11. Author

Authors should be stored as reusable entities.

Conceptually:

```text
Author
------
id
name
biography
```

A book can have multiple authors.

---

# 12. Publisher

Conceptually:

```text
Publisher
---------
id
name
contact
website
```

A publisher can publish many titles.

---

# 13. Book Category

Examples:

```text
Fiction
Non-Fiction
Science
Mathematics
Physics
Chemistry
Biology
History
Geography
Competitive Exams
Reference
Children
```

Categories must be configurable.

---

# 14. Book Tags

Optional tags can provide flexible classification.

Examples:

```text
Entrance Exam
Class 10
Class 11
Reference
Competitive
Recommended
```

---

# 15. Language

Book language should be stored explicitly.

Examples:

```text
English
Hindi
Urdu
Bengali
Other
```

Do not assume all books use the institution's default language.

---

# 16. Edition

Edition information should be stored.

Example:

```text
5th Edition
Revised Edition
Student Edition
```

Different editions may be represented as separate titles/publications where necessary.

---

# 17. Library Location

A library may contain:

```text
Building
Floor
Room
Section
Shelf
Rack
```

---

# 18. Shelf

Conceptually:

```text
Shelf
-----
id
libraryId
name
code
locationId
status
```

---

# 19. Shelf Hierarchy

Example:

```text
Library
 └── Ground Floor
      └── Science Section
           ├── Shelf A
           ├── Shelf B
           └── Shelf C
```

---

# 20. Member

A member is a person authorized to borrow library material.

Possible member types:

```text
Student
Teacher
Staff
Other Authorized Member
```

---

# 21. Member Identity

The library should reference existing institutional identities.

Examples:

```text
Student → Student Module
Teacher → Staff Module
Staff → Staff Module
```

Do not create duplicate student or staff identities.

---

# 22. Library Member Record

Conceptually:

```text
LibraryMember
-------------
id
memberType
referenceId
libraryCardId
status
joinedAt
```

---

# 23. Library Card

A member may have a library card.

Possible fields:

```text
Card Number
Issue Date
Expiry Date
Status
```

---

# 24. Library Card Status

Possible:

```text
ACTIVE
EXPIRED
BLOCKED
LOST
CANCELLED
```

---

# 25. Membership Status

Possible:

```text
ACTIVE
SUSPENDED
EXPIRED
CANCELLED
```

A suspended member should not be allowed to issue books.

---

# 26. Library Rules

The institution should configure rules such as:

```text
Maximum Books
Loan Duration
Renewal Limit
Fine Per Day
Grace Period
Reservation Limit
Member-Specific Rules
```

---

# 27. Member-Specific Rules

Different member types may have different limits.

Example:

```text
Student:
Maximum 2 books

Teacher:
Maximum 5 books
```

Rules should be configurable rather than hard-coded.

---

# 28. Book Issue

The issue workflow:

```text
Member
 ↓
Select Available Copy
 ↓
Validate Eligibility
 ↓
Create Issue Transaction
 ↓
Set Due Date
 ↓
Copy Status → ISSUED
```

---

# 29. Issue Eligibility

Before issuing, check:

```text
Member Active
Library Card Valid
No Membership Suspension
Borrowing Limit
Outstanding Restrictions
Copy Available
```

---

# 30. Issue Transaction

Conceptually:

```text
LibraryIssue
------------
id
memberId
bookCopyId
issuedAt
dueAt
issuedBy
status
```

---

# 31. Due Date

Due date should be calculated using configured library rules.

Example:

```text
Issue Date:
3 September

Loan Period:
14 days

Due Date:
17 September
```

---

# 32. Return

Return workflow:

```text
Book Copy
 ↓
Scan / Select Copy
 ↓
Find Active Issue
 ↓
Record Return
 ↓
Evaluate Condition
 ↓
Calculate Fine
 ↓
Copy → AVAILABLE
```

---

# 33. Return Transaction

Conceptually:

```text
LibraryReturn
-------------
issueId
returnedAt
receivedBy
condition
notes
```

---

# 34. Late Return

If:

```text
Return Date > Due Date
```

the system may calculate a fine according to configured rules.

---

# 35. Fine Calculation

Conceptually:

```text
Late Days
×
Configured Daily Fine
=
Fine
```

Example:

```text
Late Days: 5
Fine: ₹2/day

Fine:
₹10
```

Actual rules must be configurable.

---

# 36. Grace Period

The library may configure a grace period.

Example:

```text
Due Date: 10 Sep
Grace Period: 2 days
Fine starts: 13 Sep
```

---

# 37. Fine Entity

Conceptually:

```text
LibraryFine
----------
id
memberId
issueId
amount
reason
status
createdAt
```

---

# 38. Fine Status

Possible:

```text
PENDING
WAIVED
PAID
CANCELLED
```

---

# 39. Fine Payment

Fine payment should integrate with the centralized payment/finance system where applicable.

Do not build a second payment ledger inside the library module.

---

# 40. Fine Waiver

Authorized users may waive fines.

A waiver should require:

```text
Reason
Actor
Timestamp
Original Amount
Waived Amount
```

---

# 41. Partial Fine Payment

If supported:

```text
Fine:
₹100

Paid:
₹50

Outstanding:
₹50
```

---

# 42. Renewal

A member may renew an issued book if rules permit.

Workflow:

```text
Issued Book
 ↓
Renewal Request
 ↓
Validate Rules
 ↓
New Due Date
```

---

# 43. Renewal Restrictions

Renewal may be blocked when:

```text
Renewal Limit Reached
Reservation Exists
Member Suspended
Book Overdue
Institution Rule Blocks Renewal
```

The exact policy must be configurable.

---

# 44. Renewal Count

Track:

```text
renewalCount
```

Example:

```text
Allowed:
2 renewals

Current:
1
```

---

# 45. Reservation

Members may reserve a book title or copy depending on library policy.

Recommended model:

```text
Member
 ↓
Reserve Book Title
 ↓
Available Copy
 ↓
Reservation Fulfilled
```

---

# 46. Reservation Entity

Conceptually:

```text
LibraryReservation
------------------
id
memberId
bookTitleId
createdAt
expiresAt
status
queuePosition
```

---

# 47. Reservation Status

Possible:

```text
ACTIVE
READY
FULFILLED
EXPIRED
CANCELLED
```

---

# 48. Reservation Queue

If multiple members reserve the same title:

```text
Member A → Position 1
Member B → Position 2
Member C → Position 3
```

The queue must preserve ordering.

---

# 49. Reservation Fulfillment

When a copy becomes available:

```text
Available Copy
 ↓
Reservation Queue
 ↓
First Eligible Member
 ↓
Reservation → READY
```

The system may notify the member.

---

# 50. Reservation Expiry

A reservation may expire after a configured period.

Example:

```text
Ready for Pickup:
3 days
```

After expiry:

```text
Reservation → EXPIRED
```

---

# 51. Lost Book

If a member reports a book lost:

```text
Issue
 ↓
Lost
 ↓
Book Copy → LOST
```

The issue must remain in history.

---

# 52. Lost Book Charge

The institution may configure a replacement charge.

Example:

```text
Book Value:
₹500

Replacement Charge:
₹600
```

The amount should be configurable.

---

# 53. Damaged Book

When returned damaged:

```text
Return
 ↓
Condition Assessment
 ↓
DAMAGED
```

The system may create a charge if policy requires it.

---

# 54. Damaged Book Charge

Possible charge components:

```text
Repair Cost
Replacement Cost
Penalty
```

These should be represented explicitly.

---

# 55. Book Repair

A damaged book may enter:

```text
UNDER_REPAIR
```

After repair:

```text
UNDER_REPAIR
 ↓
AVAILABLE
```

or:

```text
UNDER_REPAIR
 ↓
WITHDRAWN
```

---

# 56. Book Withdrawal

A book may be withdrawn from circulation because of:

```text
Severe Damage
Obsolescence
Duplicate Stock
Lost / Unrecoverable
Other Authorized Reason
```

The copy should remain historically recorded.

---

# 57. Library Inventory

The library should support periodic inventory verification.

Workflow:

```text
Expected Copies
 ↓
Physical Scan
 ↓
Compare
 ↓
Missing / Unexpected / Correct
```

---

# 58. Library Stock Count

Possible results:

```text
FOUND
MISSING
MOVED
DAMAGED
UNEXPECTED
```

---

# 59. Book Search

Search by:

```text
Title
Author
ISBN
Publisher
Category
Accession Number
Barcode
Shelf
Language
Edition
```

---

# 60. Availability Search

Users should be able to see:

```text
Available Copies
Issued Copies
Reserved Copies
Total Copies
```

Example:

```text
Physics Class 11

Total: 10
Available: 4
Issued: 5
Reserved: 1
```

---

# 61. Catalog View

Recommended catalog information:

```text
Cover
Title
Author
ISBN
Edition
Category
Language
Availability
Location
```

---

# 62. Member Profile

Recommended:

```text
Member Information
Library Card
Current Issues
Issue History
Returns
Renewals
Reservations
Outstanding Fines
```

---

# 63. Current Borrowings

Example:

```text
Physics
Due: 10 Sep

Mathematics
Due: 15 Sep
```

---

# 64. Overdue List

Authorized staff should see:

```text
Member
Book
Issue Date
Due Date
Days Overdue
Estimated Fine
```

---

# 65. Overdue Notifications

The system may notify members:

```text
Before Due Date
On Due Date
After Due Date
```

Notification timing should be configurable.

---

# 66. Library Dashboard

Possible metrics:

```text
Total Titles
Total Copies
Available Copies
Issued Copies
Overdue Books
Reserved Books
Lost Books
Damaged Books
Outstanding Fines
```

---

# 67. Recent Activity

Show:

```text
Recent Issues
Recent Returns
Recent Renewals
Recent Reservations
Recent Fine Payments
```

---

# 68. Library Reports

Useful reports:

```text
Book Catalog
Book Inventory
Issued Books
Returned Books
Overdue Books
Fine Report
Member Report
Reservation Report
Lost Books
Damaged Books
Popular Books
Circulation Report
```

---

# 69. Circulation Report

Example:

```text
September 2026

Issues: 1,250
Returns: 1,180
Renewals: 220
Reservations: 85
```

---

# 70. Popular Books

Possible metric:

```text
Issue Count
Renewal Count
Reservation Count
```

Do not infer popularity from availability alone.

---

# 71. Member Circulation Report

Example:

```text
Student
Books Issued: 25
Books Returned: 23
Overdue: 2
```

---

# 72. Fine Report

Show:

```text
Member
Fine Reason
Amount
Paid
Outstanding
Status
```

---

# 73. Branch Library

For multi-branch institutions:

```text
Branch A Library
Branch B Library
Branch C Library
```

Each library may maintain separate copies and locations.

---

# 74. Inter-Branch Transfer

If enabled:

```text
Branch A
Book Copy
 ↓
Transfer
 ↓
Branch B
```

The physical copy identity should remain intact.

---

# 75. Transfer History

Record:

```text
From Branch
To Branch
Copy
Date
Requested By
Approved By
Received By
```

---

# 76. Library Member Integration

Students should be linked to the central student record.

Staff should be linked to the central staff record.

Do not duplicate:

```text
Name
Student ID
Employee ID
```

as independent identity records.

---

# 77. Finance Integration

Library may generate:

```text
Fine
Replacement Charge
Damage Charge
```

Finance/payment systems should handle financial posting and payment.

---

# 78. Notification Integration

Use the centralized notification system for:

```text
Due Reminder
Overdue Notice
Reservation Ready
Reservation Expired
Fine Notice
Membership Expiry
```

---

# 79. Permission Model

Potential permissions:

```text
library.read
library.catalog.create
library.catalog.update
library.copy.create
library.copy.update
library.issue
library.return
library.renew
library.reserve
library.fine.read
library.fine.create
library.fine.waive
library.inventory
library.transfer
library.reports
library.export
```

---

# 80. Permission-Aware UI

Example:

```text
No library.issue
→ Hide Issue Button

No library.return
→ Hide Return Action

No library.fine.waive
→ Hide Waive Fine

No library.copy.update
→ Hide Edit Copy
```

Backend authorization remains mandatory.

---

# 81. Tenant Isolation

All library data must be scoped by tenant.

Tenant A must never access Tenant B's:

```text
Books
Copies
Members
Issues
Returns
Reservations
Fines
Reports
```

---

# 82. Branch Isolation

Branch-scoped users should only see libraries and copies they are authorized to access.

---

# 83. Audit Trail

Important events:

```text
Book Title Created
Book Title Updated
Book Copy Created
Book Copy Updated
Book Issued
Book Returned
Book Renewed
Reservation Created
Reservation Cancelled
Fine Created
Fine Waived
Fine Paid
Book Marked Lost
Book Marked Damaged
Book Withdrawn
Library Transfer
```

---

# 84. Issue Integrity

A physical copy can have only one active issue at a time.

The system must prevent:

```text
COPY-001
→ Issued to Student A

COPY-001
→ Issued to Student B
```

simultaneously.

---

# 85. Return Integrity

A return must correspond to an active issue.

Do not allow a copy to be returned twice for the same transaction.

---

# 86. Renewal Integrity

A renewal must reference an active issue.

Do not create multiple conflicting due dates.

---

# 87. Reservation Integrity

A reservation must have a valid member and book title.

Queue position must remain consistent.

---

# 88. Idempotency

Repeated requests must not create duplicate:

```text
Issues
Returns
Renewals
Reservations
Fine Payments
Transfers
```

---

# 89. Concurrency

Library issue/return operations must be concurrency-safe.

Example:

```text
Only 1 copy available.

User A attempts issue.
User B attempts issue.
```

Only one transaction may successfully claim the copy.

---

# 90. Date & Time

Use the institution's configured timezone.

Store:

```text
Issue Timestamp
Due Date
Return Timestamp
Renewal Timestamp
Reservation Timestamp
Fine Creation Timestamp
```

---

# 91. Financial Precision

Fine and replacement charges must use exact monetary arithmetic.

Do not use floating-point arithmetic for money.

---

# 92. Empty States

Examples:

```text
No books found.
```

```text
No copies are currently available.
```

```text
This member has no active issues.
```

```text
No overdue books.
```

```text
No outstanding fines.
```

---

# 93. Loading States

Provide loading states for:

```text
Catalog
Book Detail
Member Detail
Issue Screen
Return Screen
Reservations
Fines
Reports
```

---

# 94. Error Handling

Use actionable messages.

Example:

```text
This book cannot be issued because the member has reached the borrowing limit.
```

Instead of:

```text
LibraryValidationException.
```

---

# 95. Data Retention

Do not delete historical:

```text
Issue Transactions
Return Transactions
Fine Records
Reservations
Book Transfers
Book Withdrawals
```

Historical records are part of the library audit trail.

---

# 96. Deleting Books

Deleting a book title/copy with historical transactions should generally not physically delete the historical record.

Use:

```text
Archived
Withdrawn
Inactive
```

states where appropriate.

---

# 97. Self-Service Catalog

Optional student/staff access may allow:

```text
Search Books
View Availability
View Location
View Current Borrowings
Request Reservation
```

---

# 98. Self-Service Restrictions

Users must not be able to:

```text
Modify Catalog
Change Book Status
Waive Fines
Edit Transactions
Modify Library Rules
```

unless explicitly authorized.

---

# 99. Barcode Workflow

Recommended issue workflow:

```text
Scan Member Card
 ↓
Scan Book Barcode
 ↓
Validate
 ↓
Confirm Issue
```

Return:

```text
Scan Book Barcode
 ↓
Find Active Issue
 ↓
Calculate Fine
 ↓
Confirm Return
```

---

# 100. Definition of Done

The Library module is complete when an authorized institution can:

```text
Create Book Titles
      ↓
Create Physical Copies
      ↓
Assign Locations
      ↓
Register Members
      ↓
Issue Books
      ↓
Track Due Dates
      ↓
Renew Books
      ↓
Return Books
      ↓
Calculate Fines
      ↓
Accept Fine Payments
      ↓
Manage Reservations
      ↓
Track Lost/Damaged Books
      ↓
Transfer Copies
      ↓
Perform Library Inventory
      ↓
Generate Reports
```

while preserving:

```text
Tenant Isolation
Branch Isolation
Permission Enforcement
Copy-Level Accuracy
Transaction History
Financial Integrity
Auditability
```

---

# 101. Final Principle

> **The library catalog describes what a book is; the physical copy describes what can actually be borrowed. Every issue, return, renewal, reservation, fine, transfer, loss, and damage event must be tied to a specific member and/or physical copy and must remain historically auditable.**

---

# 102. Next Document

```text
58-TRANSPORT-MANAGEMENT.md
```

The next module will define:

```text
Transport
Vehicles
Drivers
Routes
Stops
Students
Route Allocation
Vehicle Capacity
Transport Fees
Transport Attendance
Pickup / Drop
Vehicle Maintenance
Fuel
Documents
Driver Assignment
Route Changes
Transport Reports
```

---

# END OF DOCUMENT
# HOSTEL MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `59-HOSTEL-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Hostel Management Specification  
**Previous Document:** `58-TRANSPORT-MANAGEMENT.md`  
**Next Document:** `60-HOSTEL-MESS-MANAGEMENT.md`

---

# 1. Purpose

This module manages student hostel/residential operations.

It covers:

```text
Hostel
Hostel Buildings
Blocks
Floors
Rooms
Beds
Room Types
Hostel Allocation
Student Residence
Wardens
Supervisors
Check-In
Check-Out
Room Transfers
Hostel Attendance
Visitors
Incidents
Complaints
Maintenance
Hostel Fees
Hostel Rules
Hostel Reports
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

The hostel system must distinguish between:

```text
Hostel
Building / Block
Floor
Room
Bed
Student Residence
Allocation
Check-In / Check-Out
Attendance
Visitor
Incident
Fee
```

A room is not a bed.

A bed is the physical accommodation unit assigned to a student.

Example:

```text
Hostel A
 └── Block A
      └── Floor 1
           └── Room 101
                ├── Bed 1
                ├── Bed 2
                ├── Bed 3
                └── Bed 4
```

---

# 3. Hostel

A hostel represents a residential facility.

Conceptually:

```text
Hostel
------
id
name
code
branchId
genderPolicy
status
```

---

# 4. Hostel Status

Possible:

```text
ACTIVE
INACTIVE
UNDER_MAINTENANCE
CLOSED
```

---

# 5. Hostel Gender Policy

Possible:

```text
MALE
FEMALE
MIXED
```

If the institution requires gender-separated accommodation, the system must enforce the configured policy during allocation.

---

# 6. Hostel Building / Block

A hostel may contain multiple blocks.

Example:

```text
Boys Hostel
 ├── Block A
 ├── Block B
 └── Block C
```

Conceptually:

```text
HostelBlock
-----------
id
hostelId
name
code
status
```

---

# 7. Floor

Each block may contain multiple floors.

Example:

```text
Block A
 ├── Ground Floor
 ├── First Floor
 └── Second Floor
```

Conceptually:

```text
HostelFloor
----------
id
blockId
name
sequence
status
```

---

# 8. Room

A room belongs to a floor.

Conceptually:

```text
HostelRoom
----------
id
floorId
roomNumber
roomTypeId
capacity
status
```

---

# 9. Room Number

Room numbers should be unique within the relevant hostel/block context.

Example:

```text
101
102
103
```

---

# 10. Room Type

Possible:

```text
SINGLE
DOUBLE
TRIPLE
FOUR_BED
DORMITORY
OTHER
```

Room types should be configurable.

---

# 11. Room Capacity

Capacity defines the maximum number of active beds/students.

Example:

```text
Room 101
Capacity: 4
Occupied: 3
Available: 1
```

---

# 12. Bed

Each physical sleeping space should have its own identity.

Conceptually:

```text
HostelBed
---------
id
roomId
bedNumber
status
```

---

# 13. Bed Status

Possible:

```text
AVAILABLE
ALLOCATED
OCCUPIED
BLOCKED
UNDER_MAINTENANCE
RETIRED
```

The exact lifecycle may depend on the institution's operational model.

---

# 14. Bed-Level Allocation

Student accommodation should preferably be allocated at bed level.

Example:

```text
Student A → Bed 1
Student B → Bed 2
Student C → Bed 3
```

This prevents ambiguity when multiple students share a room.

---

# 15. Student Residence

A student's hostel stay is represented as a residence record.

Conceptually:

```text
StudentResidence
----------------
id
studentId
hostelId
blockId
roomId
bedId
effectiveFrom
effectiveTo
status
```

---

# 16. Residence Status

Possible:

```text
PENDING
ACTIVE
TRANSFERRED
CHECKED_OUT
CANCELLED
```

---

# 17. Allocation

Allocation determines where a student is assigned.

Workflow:

```text
Student
 ↓
Hostel
 ↓
Block
 ↓
Room
 ↓
Bed
 ↓
Allocation
```

---

# 18. Allocation Eligibility

Before allocation, validate:

```text
Student Exists
Student Eligible
Hostel Active
Room Active
Bed Available
Gender Policy
Capacity
Effective Dates
```

---

# 19. Capacity Validation

The system must prevent allocation beyond capacity.

Example:

```text
Room Capacity: 4
Occupied: 4

New Allocation:
BLOCKED
```

Unless an authorized override is explicitly supported.

---

# 20. Allocation Dates

Every allocation must support:

```text
Effective From
Effective To
```

This allows the system to preserve historical residence records.

---

# 21. Room Transfer

A student may be transferred to another bed/room.

Workflow:

```text
Current Bed
 ↓
Transfer Request
 ↓
Validate New Bed
 ↓
Approve if required
 ↓
Close Current Allocation
 ↓
Create New Allocation
```

Historical allocation must remain intact.

---

# 22. Transfer Reason

Possible:

```text
Student Request
Administrative Decision
Maintenance
Discipline
Medical / Safety Requirement
Room Reorganization
Other
```

The reason should be configurable.

---

# 23. Transfer History

Record:

```text
Old Hostel
Old Room
Old Bed
New Hostel
New Room
New Bed
Effective Date
Reason
Requested By
Approved By
```

---

# 24. Check-In

Check-in confirms that the student has physically entered the hostel.

Workflow:

```text
Allocation
 ↓
Check-In
 ↓
Residence Active
```

---

# 25. Check-In Record

Conceptually:

```text
HostelCheckIn
-------------
residenceId
checkedInAt
checkedInBy
notes
```

---

# 26. Check-Out

Check-out ends the student's hostel residence.

Workflow:

```text
Active Residence
 ↓
Check-Out
 ↓
Bed Released
 ↓
Residence Closed
```

---

# 27. Check-Out Record

Conceptually:

```text
HostelCheckOut
--------------
residenceId
checkedOutAt
checkedOutBy
reason
notes
```

---

# 28. Check-Out Reasons

Possible:

```text
Academic Year Completed
Course Completed
Student Withdrawal
Parent Request
Transfer
Disciplinary Action
Temporary Leave
Other
```

---

# 29. Temporary Leave

A student may temporarily leave the hostel without ending the residence.

Example:

```text
Residence:
ACTIVE

Leave:
5 Sep → 8 Sep
```

The bed remains allocated.

---

# 30. Hostel Leave

If hostel leave management is supported:

```text
HostelLeave
-----------
studentId
residenceId
startDate
endDate
reason
status
approvedBy
```

---

# 31. Leave Status

Possible:

```text
PENDING
APPROVED
REJECTED
CANCELLED
COMPLETED
```

---

# 32. Warden

A warden is responsible for hostel administration/supervision.

A warden may be linked to the central staff system.

Do not duplicate employee identity unnecessarily.

---

# 33. Warden Assignment

Conceptually:

```text
WardenAssignment
----------------
wardenId
hostelId
blockId
effectiveFrom
effectiveTo
status
```

---

# 34. Supervisor

A hostel may also have supervisors/caretakers.

They may be assigned to:

```text
Hostel
Block
Floor
Shift
```

---

# 35. Warden Permissions

Wardens may receive permissions such as:

```text
View Residents
Manage Attendance
Manage Check-In
Manage Check-Out
Record Incidents
Manage Visitors
Manage Complaints
```

They should not automatically receive:

```text
Finance
Payroll
HR
Academic Administration
```

permissions.

---

# 36. Hostel Attendance

The system may record resident attendance.

Possible statuses:

```text
PRESENT
ABSENT
ON_LEAVE
OUT_WITH_PERMISSION
EXCUSED
```

---

# 37. Attendance Date

Attendance should be associated with:

```text
Student
Residence
Hostel
Date
Status
Recorded By
```

---

# 38. Attendance Workflow

Example:

```text
Today's Resident List
 ↓
Mark Attendance
 ↓
Submit
 ↓
Lock / Audit
```

---

# 39. Attendance Correction

Corrections should preserve:

```text
Original Status
New Status
Reason
Actor
Timestamp
```

---

# 40. Night Attendance

If the institution uses night roll call, it may have a dedicated attendance event.

Example:

```text
Night Roll Call
10:00 PM
```

This should remain distinct from academic attendance.

---

# 41. Visitor Management

Hostels may record authorized visitors.

Conceptually:

```text
HostelVisitor
-------------
id
studentId
visitorName
relationship
phone
visitDate
checkIn
checkOut
purpose
status
```

---

# 42. Visitor Relationship

Examples:

```text
Parent
Guardian
Sibling
Relative
Authorized Representative
Other
```

---

# 43. Visitor Check-In

Workflow:

```text
Visitor Arrives
 ↓
Identify Student
 ↓
Record Visitor
 ↓
Check In
```

---

# 44. Visitor Check-Out

When the visitor leaves:

```text
checkOut
```

must be recorded.

---

# 45. Visitor Restrictions

Visitors should only access the hostel according to configured rules.

Examples:

```text
Visiting Hours
Allowed Days
Visitor Type
Student Restrictions
```

---

# 46. Hostel Incident

An incident represents an operational/safety event.

Examples:

```text
Unauthorized Absence
Fight
Property Damage
Rule Violation
Emergency
Security Issue
Other
```

---

# 47. Incident Entity

Conceptually:

```text
HostelIncident
--------------
id
hostelId
studentId
roomId
date
type
severity
description
status
reportedBy
```

---

# 48. Incident Severity

Possible:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 49. Incident Workflow

```text
Reported
 ↓
Reviewed
 ↓
Action Taken
 ↓
Resolved
```

Some incidents may remain open until formally closed.

---

# 50. Complaint

Students may submit hostel complaints.

Examples:

```text
Room Issue
Water
Electricity
Cleaning
Food
Maintenance
Internet
Security
Other
```

---

# 51. Complaint Entity

Conceptually:

```text
HostelComplaint
---------------
id
studentId
hostelId
roomId
category
description
priority
status
createdAt
resolvedAt
```

---

# 52. Complaint Status

Possible:

```text
OPEN
ASSIGNED
IN_PROGRESS
RESOLVED
CLOSED
REJECTED
```

---

# 53. Complaint Priority

Possible:

```text
LOW
MEDIUM
HIGH
URGENT
```

---

# 54. Complaint Assignment

A complaint may be assigned to:

```text
Warden
Supervisor
Maintenance Staff
Administrator
```

---

# 55. Maintenance

Hostel maintenance may cover:

```text
Room
Bed
Furniture
Electrical
Plumbing
Cleaning
Building
Common Area
Other
```

---

# 56. Maintenance Request

Conceptually:

```text
HostelMaintenanceRequest
------------------------
id
hostelId
roomId
bedId
category
description
priority
status
assignedTo
createdAt
resolvedAt
```

---

# 57. Maintenance Status

Possible:

```text
OPEN
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

# 58. Common Areas

Hostel may contain:

```text
Study Room
Dining Area
Recreation Room
Washroom
Laundry
Common Hall
Prayer Room
Other
```

Common-area maintenance should not require a student room.

---

# 59. Hostel Rules

Each hostel may define rules covering:

```text
Entry Time
Exit Time
Visitor Hours
Night Roll Call
Leave Policy
Room Changes
Prohibited Items
Conduct
Noise
Cleanliness
```

Rules should be configurable.

---

# 60. Curfew

If applicable, the hostel may configure a curfew.

Example:

```text
Curfew:
10:00 PM
```

The system should treat this as an operational rule, not an academic attendance rule.

---

# 61. Late Entry

A student arriving after curfew may be recorded as:

```text
Late Entry
```

with:

```text
Timestamp
Reason
Authorized By
```

---

# 62. Outing

If supported, a student may leave hostel temporarily.

Conceptually:

```text
HostelOuting
------------
studentId
residenceId
outAt
expectedReturnAt
actualReturnAt
reason
approvedBy
status
```

---

# 63. Outing Status

Possible:

```text
REQUESTED
APPROVED
OUT
RETURNED
OVERDUE
CANCELLED
```

---

# 64. Overdue Return

If:

```text
Actual Return
>
Expected Return
```

the outing can be marked:

```text
OVERDUE
```

according to institution policy.

---

# 65. Emergency Contact

Hostel staff may need access to emergency contact information from the central student/guardian records.

Do not duplicate the source of truth.

---

# 66. Student Room Profile

Authorized users may view:

```text
Student
Hostel
Block
Floor
Room
Bed
Check-In Date
Current Status
Roommates
```

---

# 67. Room Occupancy

Example:

```text
Room 203

Capacity: 4
Occupied: 3
Available: 1
```

---

# 68. Hostel Occupancy

Example:

```text
Hostel A

Total Beds: 200
Occupied: 174
Available: 26
Occupancy: 87%
```

---

# 69. Occupancy Calculation

Conceptually:

```text
Occupied Beds
÷
Total Active Beds
×
100
```

Blocked or retired beds should not be treated as available capacity.

---

# 70. Roommate View

Authorized users may view roommates for a student.

Only the minimum necessary information should be displayed.

---

# 71. Hostel Fee

Hostel fees should integrate with the central finance/fee system.

Possible components:

```text
Accommodation Fee
Security Deposit
Mess Fee
Other Hostel Charges
```

Mess may be handled by a separate module.

---

# 72. Hostel Fee Plan

Conceptually:

```text
HostelFeePlan
------------
id
hostelId
roomTypeId
amount
frequency
effectiveFrom
effectiveTo
status
```

---

# 73. Fee Frequency

Possible:

```text
MONTHLY
QUARTERLY
TERM
ANNUAL
CUSTOM
```

---

# 74. Security Deposit

If applicable, the system should track the security deposit through the finance system.

Do not create an independent hostel payment ledger.

---

# 75. Hostel Damage Charges

Damage charges may originate from:

```text
Room Damage
Furniture Damage
Lost Property
Other
```

These should be posted through the centralized finance system.

---

# 76. Room Inventory

Optional room inventory may track:

```text
Bed
Mattress
Table
Chair
Cupboard
Fan
Light
Other Assets
```

The inventory/asset module remains the source of truth for institutional assets.

---

# 77. Asset Integration

A hostel room can reference assets from the central Asset/Inventory module.

Do not create duplicate asset records.

---

# 78. Room Inspection

Periodic room inspections may record:

```text
Inspection Date
Inspector
Condition
Issues Found
Notes
```

---

# 79. Inspection Status

Possible:

```text
SCHEDULED
COMPLETED
FAILED
REQUIRES_ACTION
```

---

# 80. Hostel Dashboard

Possible metrics:

```text
Total Hostels
Active Residents
Total Beds
Occupied Beds
Available Beds
Occupancy %
Today's Check-Ins
Today's Check-Outs
Residents on Leave
Open Complaints
Open Maintenance
Open Incidents
```

---

# 81. Hostel Search

Search by:

```text
Hostel
Block
Floor
Room
Bed
Student
Student ID
Warden
```

---

# 82. Filters

Useful filters:

```text
Hostel
Block
Room Type
Bed Status
Residence Status
Gender
Check-In Status
Attendance Status
Complaint Status
Maintenance Status
```

---

# 83. Allocation Screen

The allocation interface should make availability obvious.

Example:

```text
Hostel A
 ↓
Block B
 ↓
Floor 2
 ↓
Room 205
 ↓
Bed 1 — Occupied
Bed 2 — Available
Bed 3 — Available
Bed 4 — Blocked
```

---

# 84. Allocation Safety

Before confirming allocation, display:

```text
Student
Hostel
Room
Bed
Effective Date
Current Occupancy
Capacity
```

---

# 85. Double Allocation Prevention

A bed cannot have two overlapping active allocations.

Example:

```text
Bed 1
Student A
1 Sep → 30 Sep

Student B
15 Sep → 15 Oct
```

This must be blocked because the date ranges overlap.

---

# 86. Historical Allocation

When a student transfers:

```text
Old Allocation → CLOSED
New Allocation → ACTIVE
```

Do not overwrite the old room/bed.

---

# 87. Check-In Integrity

A student should not have multiple simultaneous active hostel residences unless the institution explicitly supports multiple residences.

---

# 88. Check-Out Integrity

Checking out must release the bed.

After successful check-out:

```text
Bed → AVAILABLE
```

unless the bed is otherwise blocked or under maintenance.

---

# 89. Leave Integrity

Hostel leave should not release the bed.

The residence remains active.

---

# 90. Visitor Privacy

Visitor information should only be accessible to authorized hostel/security users.

---

# 91. Student Privacy

Hostel users should not automatically gain access to unrelated:

```text
Academic Information
Financial Information
HR Information
Other Private Data
```

---

# 92. Permission Model

Potential permissions:

```text
hostel.read
hostel.create
hostel.update
hostel.archive
hostel.room.manage
hostel.bed.manage
hostel.allocation.manage
hostel.checkin
hostel.checkout
hostel.transfer
hostel.attendance
hostel.leave
hostel.outing
hostel.visitor
hostel.complaint
hostel.maintenance
hostel.incident
hostel.fees
hostel.inspection
hostel.reports
hostel.export
```

---

# 93. Permission-Aware UI

Example:

```text
No hostel.allocation.manage
→ Hide Allocate Student

No hostel.checkout
→ Hide Check-Out Action

No hostel.visitor
→ Hide Visitor Controls

No hostel.incident
→ Hide Incident Actions
```

Backend authorization remains mandatory.

---

# 94. Tenant Isolation

All hostel data must be scoped by tenant.

Tenant A must never access Tenant B's:

```text
Hostels
Rooms
Beds
Residents
Visitors
Complaints
Incidents
Attendance
Fees
```

---

# 95. Branch Isolation

Branch-scoped users should only access authorized hostel facilities and residents.

---

# 96. Audit Trail

Important events:

```text
Hostel Created
Hostel Updated
Block Created
Room Created
Bed Created
Bed Status Changed
Student Allocated
Student Checked In
Student Transferred
Student Checked Out
Attendance Recorded
Attendance Corrected
Leave Created
Outing Created
Visitor Checked In
Visitor Checked Out
Complaint Created
Complaint Updated
Maintenance Created
Incident Reported
Fee Charge Created
```

---

# 97. Idempotency

Repeated requests must not create duplicate:

```text
Allocations
Check-Ins
Check-Outs
Attendance Records
Visitor Entries
Complaints
Maintenance Requests
Charges
```

where the operation should be unique.

---

# 98. Concurrency

Allocation operations must be concurrency-safe.

Example:

```text
Bed 101-A
Status: AVAILABLE

Admin A allocates it.
Admin B allocates it simultaneously.
```

Only one allocation may succeed.

---

# 99. Date & Time

Use the institution's configured timezone.

Store timestamps for:

```text
Allocation
Check-In
Check-Out
Attendance
Visitor Entry
Visitor Exit
Outing
Incident
Complaint
Maintenance
Inspection
```

---

# 100. Financial Precision

Hostel fees, deposits, damage charges, and other monetary values must use exact monetary arithmetic.

---

# 101. Notifications

Optional notifications:

```text
Hostel Allocation
Room Transfer
Check-In Reminder
Check-Out Reminder
Leave Approval
Outing Approval
Overdue Return
Complaint Update
Maintenance Update
Incident Alert
Fee Reminder
```

Use the centralized notification system.

---

# 102. Parent Visibility

Where enabled, parents/guardians may see:

```text
Hostel Assignment
Check-In / Check-Out
Approved Leave
Outing Status
Selected Hostel Notifications
```

Only information related to their linked child should be visible.

---

# 103. Reports

Useful reports:

```text
Hostel Register
Room Register
Bed Register
Resident Register
Room Occupancy
Hostel Occupancy
Allocation History
Transfer History
Check-In Report
Check-Out Report
Attendance Report
Leave Report
Outing Report
Visitor Report
Complaint Report
Maintenance Report
Incident Report
Hostel Fee Report
```

---

# 104. Resident Register

Example:

```text
Student
Student ID
Hostel
Block
Floor
Room
Bed
Check-In Date
Status
```

---

# 105. Occupancy Report

Example:

```text
Hostel A
Total Beds: 200
Occupied: 174
Available: 26
Blocked: 0
Occupancy: 87%
```

---

# 106. Attendance Report

Show:

```text
Student
Date
Hostel
Room
Status
Recorded By
```

---

# 107. Visitor Report

Show:

```text
Visitor
Student
Relationship
Check-In
Check-Out
Purpose
Status
```

---

# 108. Maintenance Report

Show:

```text
Hostel
Room
Category
Priority
Assigned To
Created
Resolved
Status
```

---

# 109. Empty States

Examples:

```text
No hostels found.
```

```text
No available beds in this hostel.
```

```text
No active residents found.
```

```text
No open complaints.
```

```text
No visitors recorded today.
```

---

# 110. Loading States

Provide loading states for:

```text
Hostel Dashboard
Hostel List
Room List
Bed List
Allocation
Resident Profile
Attendance
Visitors
Complaints
Maintenance
Incidents
Reports
```

---

# 111. Error Handling

Use actionable errors.

Example:

```text
Bed B-203-04 is already allocated for the selected period.
```

Instead of:

```text
AllocationConflictException.
```

---

# 112. Student Integration

Students must reference the central Student module.

Do not duplicate:

```text
Student Name
Student ID
Guardian Identity
```

inside Hostel.

---

# 113. Staff Integration

Wardens and supervisors who are employees should reference the central Staff module.

---

# 114. Finance Integration

Hostel charges, deposits, and fees must integrate with Finance.

The Hostel module must not become a second accounting system.

---

# 115. Asset Integration

Room furniture and equipment should reference the centralized Inventory/Asset module where applicable.

---

# 116. Notification Integration

Hostel notifications should use the centralized notification architecture.

---

# 117. Data Retention

Do not delete historical:

```text
Residence Records
Room Allocations
Transfers
Check-In / Check-Out
Attendance
Visitors
Complaints
Incidents
Maintenance
Inspections
```

Archive where necessary.

---

# 118. Definition of Done

The Hostel module is complete when an authorized institution can:

```text
Create Hostels
      ↓
Create Blocks
      ↓
Create Floors
      ↓
Create Rooms
      ↓
Create Beds
      ↓
Configure Capacity
      ↓
Assign Wardens
      ↓
Allocate Students
      ↓
Check Students In
      ↓
Track Attendance
      ↓
Manage Leave / Outings
      ↓
Manage Visitors
      ↓
Transfer Students
      ↓
Check Students Out
      ↓
Manage Complaints
      ↓
Manage Maintenance
      ↓
Record Incidents
      ↓
Manage Hostel Fees
      ↓
Generate Reports
```

while preserving:

```text
Tenant Isolation
Branch Isolation
Student Privacy
Bed-Level Accuracy
Capacity Accuracy
Historical Integrity
Permission Enforcement
Financial Integrity
Auditability
```

---

# 119. Final Principle

> **Hostel management is fundamentally bed-level accommodation management. Every active resident must have a valid allocation, every allocation must reference a specific physical bed, overlapping allocations must be impossible, and historical residence information must never be overwritten.**

---

# 120. Next Document

```text
60-HOSTEL-MESS-MANAGEMENT.md
```

The next module will define:

```text
Hostel Mess
Meal Plans
Breakfast
Lunch
Dinner
Snacks
Mess Attendance
Meal Consumption
Menus
Mess Charges
Food Vendors
Kitchen
Inventory Integration
Meal Exceptions
Mess Feedback
Mess Reports
```

---

# END OF DOCUMENT
# TRANSPORT MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `58-TRANSPORT-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Transport Management Specification  
**Previous Document:** `57-LIBRARY-MANAGEMENT.md`  
**Next Document:** `59-HOSTEL-MANAGEMENT.md`

---

# 1. Purpose

This module manages institutional transportation.

It covers:

```text
Transport
Vehicles
Drivers
Routes
Stops
Route Allocation
Student Transport Enrollment
Pickup / Drop Points
Vehicle Capacity
Transport Attendance
Trip Management
Vehicle Maintenance
Fuel
Vehicle Documents
Driver Assignment
Route Changes
Transport Fees
Transport Reports
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

The transport system must separate:

```text
Vehicle
Driver
Route
Stop
Trip
Student Allocation
Transport Enrollment
Transport Fee
```

A route is not the same thing as a trip.

Example:

```text
Route:
Aligarh → Ramghat Road → School

Trip:
Morning Pickup
3 September 2026
```

---

# 3. Vehicle

A vehicle represents an institution-owned or contracted transport vehicle.

Conceptually:

```text
Vehicle
-------
id
vehicleNumber
registrationNumber
vehicleType
capacity
status
branchId
```

---

# 4. Vehicle Number

Every vehicle must have a unique identifier.

Example:

```text
BUS-001
```

The legal registration number should also be stored separately.

---

# 5. Vehicle Registration

Store:

```text
Registration Number
Registration Date
Registration Expiry
```

Registration information must be protected from unauthorized modification.

---

# 6. Vehicle Types

Possible:

```text
School Bus
Mini Bus
Van
Car
Auto
Other
```

Vehicle types should be configurable.

---

# 7. Vehicle Capacity

Every vehicle should have a configured capacity.

Example:

```text
Capacity: 40
Allocated Students: 37
Available Capacity: 3
```

The system must prevent allocations beyond configured capacity unless explicitly permitted.

---

# 8. Vehicle Status

Possible:

```text
ACTIVE
IN_SERVICE
UNDER_MAINTENANCE
OUT_OF_SERVICE
RETIRED
SUSPENDED
```

---

# 9. Vehicle Ownership

Possible:

```text
OWNED
LEASED
CONTRACTED
```

This should be configurable.

---

# 10. Vehicle Documents

Documents may include:

```text
Registration Certificate
Insurance
Permit
Fitness Certificate
Pollution Certificate
Other Required Documents
```

Documents should follow the centralized document architecture.

---

# 11. Document Expiry

The system should track expiry dates.

Example:

```text
Insurance:
Expires in 20 days
```

Authorized users may receive notifications before expiry.

---

# 12. Driver

A driver may be an institutional staff member or an external transport worker.

Conceptually:

```text
Driver
------
id
staffId
name
phone
licenseNumber
licenseExpiry
status
```

If the driver is a staff member, reference the central Staff record rather than duplicating identity.

---

# 13. Driver License

Store:

```text
License Number
License Type
Issue Date
Expiry Date
```

Access should be restricted appropriately.

---

# 14. Driver Status

Possible:

```text
ACTIVE
INACTIVE
SUSPENDED
ON_LEAVE
EXPIRED_DOCUMENT
```

---

# 15. Driver Assignment

A driver may be assigned to a vehicle or route.

Example:

```text
Driver A
 ↓
BUS-001
```

Assignments should preserve history.

---

# 16. Driver Assignment History

Do not overwrite previous assignments.

Example:

```text
Driver A
 ↓
BUS-001
 ↓
BUS-003
```

Historical assignments must remain auditable.

---

# 17. Route

A route defines a planned transportation path.

Conceptually:

```text
Route
-----
id
name
code
branchId
vehicleId
defaultDriverId
status
```

---

# 18. Route Example

```text
Route A

Stop 1 → Quarsi
Stop 2 → Dodhpur
Stop 3 → Civil Lines
Stop 4 → School
```

---

# 19. Route Stop

A route consists of ordered stops.

Conceptually:

```text
RouteStop
---------
routeId
stopId
sequence
pickupTime
dropTime
```

---

# 20. Stop

A stop is a physical pickup/drop location.

Conceptually:

```text
Stop
----
id
name
address
latitude
longitude
status
```

Location coordinates are optional but useful for maps and route planning.

---

# 21. Stop Sequence

Order matters.

Example:

```text
1. Quarsi
2. Dodhpur
3. Civil Lines
4. School
```

The system must preserve sequence.

---

# 22. Pickup and Drop

A student may have:

```text
Pickup Stop
Drop Stop
```

These may be different depending on institution policy.

---

# 23. Transport Enrollment

A student can enroll for transportation.

Conceptually:

```text
Student
 ↓
Transport Enrollment
 ↓
Route
 ↓
Pickup Stop
 ↓
Drop Stop
```

---

# 24. Transport Enrollment Entity

Conceptually:

```text
TransportEnrollment
-------------------
id
studentId
routeId
pickupStopId
dropStopId
effectiveFrom
effectiveTo
status
```

---

# 25. Enrollment Status

Possible:

```text
ACTIVE
PENDING
SUSPENDED
CANCELLED
COMPLETED
```

---

# 26. Effective Dates

Transport enrollment must support dates.

Example:

```text
Route A
Effective:
1 September

End:
31 March
```

Historical allocations must remain available.

---

# 27. Student Transport Allocation

The system must know exactly:

```text
Student
Vehicle
Route
Pickup Stop
Drop Stop
Effective Period
```

for each active allocation.

---

# 28. Capacity Validation

When assigning a student:

```text
Current Allocation
+
New Student
≤
Vehicle Capacity
```

If capacity is exceeded, the system should block the assignment or require an explicit authorized override.

---

# 29. Capacity Dashboard

Example:

```text
BUS-001
Capacity: 40
Allocated: 36
Available: 4
```

---

# 30. Route Capacity

Capacity must account for active students assigned to the relevant vehicle/trip.

Do not count cancelled or expired transport enrollments as active capacity.

---

# 31. Route Change

A student may change route.

Workflow:

```text
Current Route
 ↓
Change Request
 ↓
New Route
 ↓
Capacity Validation
 ↓
Approval if required
 ↓
New Allocation
```

The previous allocation remains in history.

---

# 32. Stop Change

A student may change pickup/drop stop.

Do not modify historical trips as a side effect.

The change becomes effective from the configured date.

---

# 33. Trip

A trip represents an actual transportation run.

Examples:

```text
Morning Pickup
Afternoon Drop
Special Trip
```

---

# 34. Trip Entity

Conceptually:

```text
Trip
----
id
routeId
vehicleId
driverId
tripType
scheduledDate
scheduledStart
scheduledEnd
status
```

---

# 35. Trip Types

Possible:

```text
MORNING_PICKUP
AFTERNOON_DROP
SPECIAL
EXTRA
```

---

# 36. Trip Status

Possible:

```text
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
DELAYED
```

---

# 37. Trip Lifecycle

```text
Scheduled
 ↓
Vehicle / Driver Confirmed
 ↓
Started
 ↓
Stops Completed
 ↓
Trip Completed
```

---

# 38. Trip Cancellation

If a trip is cancelled:

```text
Trip → CANCELLED
```

Students should not be marked absent merely because the institution cancelled the trip.

---

# 39. Transport Attendance

Transport attendance tracks whether a student used the transport service.

Possible statuses:

```text
BOARDED
NOT_BOARDED
DROPPED
ABSENT
EXCUSED
```

The exact workflow should follow institution policy.

---

# 40. Pickup Attendance

Example:

```text
Student A
Pickup:
BOARDED
```

This can be recorded at the pickup stop.

---

# 41. Drop Attendance

Example:

```text
Student A
Drop:
DROPPED
```

The system should distinguish pickup from drop events.

---

# 42. Attendance Timestamp

Transport events should record:

```text
Timestamp
Stop
Trip
Student
Recorded By
```

---

# 43. Transport Attendance Entity

Conceptually:

```text
TransportAttendance
-------------------
tripId
studentId
stopId
eventType
status
timestamp
recordedBy
```

---

# 44. Manual Attendance

Authorized transport staff may manually record attendance.

Every manual change must be auditable.

---

# 45. Transport Attendance Correction

Corrections should preserve:

```text
Original Value
New Value
Actor
Timestamp
Reason
```

---

# 46. Parent Visibility

Parents may optionally see transport information for their children:

```text
Assigned Route
Pickup Stop
Drop Stop
Scheduled Time
Trip Status
Attendance
```

Only their linked children may be visible.

---

# 47. Student Visibility

Students may see their own:

```text
Route
Stops
Transport Schedule
```

according to institution configuration.

---

# 48. Transport Schedule

A route may have scheduled times.

Example:

```text
Quarsi
7:10 AM

Dodhpur
7:20 AM

Civil Lines
7:35 AM

School
7:50 AM
```

Times should be configurable.

---

# 49. Stop Timing

Each route stop may have:

```text
Pickup Time
Drop Time
```

These are planned times and should not be confused with actual arrival times.

---

# 50. Actual Arrival

If tracking is supported:

```text
Scheduled:
7:20 AM

Actual:
7:27 AM
```

This enables delay reporting.

---

# 51. Delay

A trip may be considered delayed when:

```text
Actual Time
>
Scheduled Time + Configured Threshold
```

The threshold should be configurable.

---

# 52. Route Tracking

Optional real-time tracking may support:

```text
Vehicle Location
Current Stop
Next Stop
Trip Status
Estimated Arrival
```

This must integrate with a dedicated location/tracking service where applicable.

---

# 53. GPS

If GPS tracking is implemented, location data should be treated separately from core transport records.

Do not make GPS mandatory for basic transport management.

---

# 54. Driver App

An optional driver-facing interface may provide:

```text
Today's Trips
Assigned Route
Stop List
Student List
Start Trip
Record Pickup
Record Drop
Report Incident
Complete Trip
```

---

# 55. Driver Permissions

Drivers should only access transport information required for their assigned trips.

They should not automatically access:

```text
Finance
Payroll
HR
Other Branches
Unrelated Student Data
```

---

# 56. Student Privacy

Transport users should only see the minimum student information required for transportation.

Avoid exposing unnecessary:

```text
Academic Data
Financial Data
Medical Data
Personal Information
```

---

# 57. Transport Fee

Transport fees may be associated with enrollment.

Conceptually:

```text
Student
 ↓
Transport Enrollment
 ↓
Transport Fee Plan
 ↓
Invoice
 ↓
Payment
```

Finance remains the source of truth for invoices and payments.

---

# 58. Fee Structure

Transport fee may depend on:

```text
Route
Distance
Stop
Vehicle
Student Type
Frequency
Academic Period
```

Rules must be configurable.

---

# 59. Transport Fee Plan

Conceptually:

```text
TransportFeePlan
---------------
id
name
routeId
amount
frequency
effectiveFrom
effectiveTo
status
```

---

# 60. Fee Frequency

Possible:

```text
MONTHLY
QUARTERLY
TERM
ANNUAL
CUSTOM
```

---

# 61. Proration

If a student joins or leaves transport mid-period, the institution may support prorated fees.

The proration rule must be configurable.

---

# 62. Transport Fee Integration

Do not duplicate payment records.

The transport module should reference:

```text
Invoice
Payment
Outstanding Balance
```

from the Finance/Fees system.

---

# 63. Transport Suspension

Transport service may be suspended for a student.

Possible reasons:

```text
Parent Request
Administrative Decision
Temporary Suspension
Fee Policy
Other
```

The reason and effective dates should be recorded.

---

# 64. Transport Cancellation

When transport is cancelled:

```text
Enrollment → CANCELLED
```

Future trips should no longer treat the student as an active passenger.

Historical trips remain unchanged.

---

# 65. Vehicle Maintenance

Vehicles require regular maintenance.

Examples:

```text
Service
Oil Change
Tyre Replacement
Repair
Inspection
Cleaning
```

---

# 66. Maintenance Record

Conceptually:

```text
VehicleMaintenance
------------------
vehicleId
date
type
description
cost
vendor
odometer
nextDueDate
status
```

---

# 67. Maintenance Status

Possible:

```text
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

# 68. Vehicle Service Schedule

Recurring maintenance may be configured based on:

```text
Date
Mileage
Engine Hours
Other Metric
```

---

# 69. Odometer

Where applicable, record:

```text
Current Odometer
Service Odometer
```

This helps schedule maintenance.

---

# 70. Fuel Management

Optional fuel tracking may record:

```text
Vehicle
Date
Fuel Quantity
Fuel Cost
Odometer
Vendor
Reference
```

---

# 71. Fuel Record

Conceptually:

```text
FuelEntry
---------
vehicleId
date
quantity
unitCost
totalCost
odometer
vendorId
```

---

# 72. Fuel Efficiency

If enough data exists, the system may calculate:

```text
Distance
÷
Fuel Consumed
```

to estimate efficiency.

This should be presented as a calculated metric rather than manually entered as the source of truth.

---

# 73. Vehicle Expenses

Vehicle-related expenses may include:

```text
Fuel
Maintenance
Repairs
Insurance
Permit
Tolls
Other
```

Finance should remain the source of truth for accounting.

---

# 74. Incident

Transport staff may report incidents.

Examples:

```text
Vehicle Breakdown
Accident
Delay
Student Issue
Route Obstruction
Other
```

---

# 75. Incident Entity

Conceptually:

```text
TransportIncident
-----------------
id
tripId
vehicleId
driverId
date
type
description
severity
status
```

---

# 76. Incident Severity

Possible:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 77. Incident Workflow

```text
Reported
 ↓
Reviewed
 ↓
Resolved
```

where applicable.

---

# 78. Emergency Handling

If a critical transport incident occurs, authorized administrators should be able to access relevant:

```text
Trip
Vehicle
Driver
Route
Passenger List
```

information quickly.

---

# 79. Passenger Manifest

Each trip should be able to produce a passenger list based on active transport enrollments.

Example:

```text
Trip:
BUS-001

Passengers:
Student A
Student B
Student C
...
```

---

# 80. Manifest Accuracy

The passenger manifest must use the enrollment effective at the trip date.

Future route changes must not incorrectly modify historical manifests.

---

# 81. Route Capacity Validation

Before trip assignment, verify:

```text
Active Passengers
≤
Vehicle Capacity
```

If not, block or explicitly require an authorized override.

---

# 82. Vehicle Substitution

A route may temporarily use another vehicle.

Example:

```text
Normal:
BUS-001

Today:
BUS-003
```

The temporary assignment must be recorded without permanently changing the route's default vehicle.

---

# 83. Driver Substitution

Similarly:

```text
Default Driver:
Driver A

Temporary Driver:
Driver B
```

must be recorded for the specific trip/date.

---

# 84. Route Change History

Record:

```text
Old Route
New Route
Effective Date
Requested By
Approved By
Reason
```

---

# 85. Stop Change History

Record:

```text
Old Stop
New Stop
Effective Date
Reason
Actor
```

---

# 86. Transport Dashboard

Possible metrics:

```text
Active Vehicles
Vehicles Under Maintenance
Active Routes
Active Drivers
Students Using Transport
Today's Trips
Delayed Trips
Cancelled Trips
Vehicle Capacity Utilization
Outstanding Transport Fees
```

---

# 87. Vehicle Dashboard

Example:

```text
BUS-001

Capacity: 40
Passengers: 36
Status: ACTIVE
Driver: Driver A
Route: Route A
Next Maintenance: 15 Sep
```

---

# 88. Route Dashboard

Example:

```text
Route A

Vehicle: BUS-001
Driver: Driver A
Passengers: 36
Stops: 8
Morning Pickup: 7:00 AM
School Arrival: 7:50 AM
```

---

# 89. Transport Search

Search by:

```text
Vehicle Number
Registration Number
Driver
Route
Stop
Student
```

---

# 90. Transport Filters

Useful filters:

```text
Branch
Vehicle Status
Route Status
Driver Status
Trip Status
Maintenance Status
Enrollment Status
```

---

# 91. Transport Reports

Useful reports:

```text
Vehicle Register
Driver Register
Route Register
Student Transport List
Route Passenger List
Vehicle Capacity Report
Transport Attendance
Trip Report
Delay Report
Maintenance Report
Fuel Report
Incident Report
Transport Fee Report
```

---

# 92. Route Passenger Report

Example:

```text
Route A

Stop 1:
8 Students

Stop 2:
12 Students

Stop 3:
16 Students
```

---

# 93. Vehicle Utilization

Possible metric:

```text
Allocated Seats
÷
Vehicle Capacity
×
100
```

Example:

```text
36 / 40
=
90% utilization
```

---

# 94. Maintenance Report

Show:

```text
Vehicle
Maintenance Type
Date
Cost
Vendor
Odometer
Next Due Date
Status
```

---

# 95. Fuel Report

Show:

```text
Vehicle
Date
Quantity
Cost
Odometer
Average Efficiency
```

---

# 96. Permission Model

Potential permissions:

```text
transport.read
transport.vehicle.create
transport.vehicle.update
transport.vehicle.archive
transport.driver.manage
transport.route.create
transport.route.update
transport.route.manage
transport.enrollment.manage
transport.trip.manage
transport.attendance
transport.maintenance
transport.fuel
transport.incident
transport.fees
transport.reports
transport.export
```

---

# 97. Permission-Aware UI

Example:

```text
No transport.route.manage
→ Hide Route Management

No transport.enrollment.manage
→ Hide Student Allocation

No transport.attendance
→ Hide Attendance Controls

No transport.maintenance
→ Hide Maintenance Actions
```

Backend authorization remains mandatory.

---

# 98. Tenant Isolation

All transport data must be scoped by tenant.

Tenant A must never access Tenant B's:

```text
Vehicles
Drivers
Routes
Students
Trips
Attendance
Fees
Maintenance
```

---

# 99. Branch Isolation

Branch users should only access authorized:

```text
Vehicles
Routes
Drivers
Trips
Students
```

---

# 100. Audit Trail

Important events:

```text
Vehicle Created
Vehicle Updated
Vehicle Assigned
Driver Assigned
Route Created
Route Updated
Student Enrolled
Student Route Changed
Student Transport Cancelled
Trip Created
Trip Started
Trip Completed
Trip Cancelled
Attendance Recorded
Attendance Corrected
Maintenance Created
Fuel Recorded
Incident Reported
```

---

# 101. Idempotency

Repeated operations must not create duplicate:

```text
Trip
Transport Enrollment
Attendance Event
Fuel Entry
Maintenance Entry
Fee Record
```

when the operation should be unique.

---

# 102. Concurrency

Concurrent enrollment requests must not cause vehicle capacity to be exceeded.

Example:

```text
Capacity: 40
Current: 39

Two users simultaneously add one student.
```

Only one should succeed unless the institution explicitly allows over-capacity.

---

# 103. Historical Integrity

Never silently modify historical:

```text
Trips
Passenger Manifests
Attendance
Route Assignments
Driver Assignments
Vehicle Assignments
Maintenance
Fuel Records
```

---

# 104. Date Handling

Use the institution's configured timezone.

Transport events must clearly distinguish:

```text
Scheduled Date
Scheduled Time
Actual Time
Effective From
Effective To
```

---

# 105. Financial Precision

Transport fees, fuel costs, maintenance costs, and other monetary values must use exact monetary arithmetic.

---

# 106. Notifications

Optional notifications:

```text
Route Assignment
Route Change
Transport Suspension
Trip Delay
Trip Cancellation
Vehicle Document Expiry
Maintenance Due
```

Use the centralized notification architecture.

---

# 107. Parent Notifications

Where enabled, parents may receive:

```text
Bus Delayed
Trip Cancelled
Route Changed
Pickup / Drop Update
```

Only information relevant to their linked child should be visible.

---

# 108. Empty States

Examples:

```text
No vehicles found.
```

```text
No active routes found.
```

```text
No students are assigned to this route.
```

```text
No trips scheduled for today.
```

---

# 109. Loading States

Provide loading states for:

```text
Transport Dashboard
Vehicle List
Vehicle Detail
Routes
Trip List
Student Allocation
Attendance
Maintenance
Fuel
Reports
```

---

# 110. Error Handling

Use actionable errors.

Example:

```text
BUS-001 cannot be assigned to this route because its capacity is already full.
```

Instead of:

```text
CapacityValidationException.
```

---

# 111. Student Integration

Students must reference the central Student module.

Do not create a second student identity system inside Transport.

---

# 112. Staff Integration

Drivers who are institutional employees should reference the central Staff module.

Do not duplicate employee records.

---

# 113. Finance Integration

Transport fees, fuel, maintenance, and other costs should integrate with Finance.

Transport must not create a separate accounting ledger.

---

# 114. Notification Integration

All transport notifications should use the centralized notification system.

---

# 115. Maps Integration

If maps are supported:

```text
Stop Coordinates
Route Visualization
Vehicle Location
Estimated Arrival
```

should integrate with a mapping/location provider.

The core ERP must continue functioning if live map tracking is unavailable.

---

# 116. Data Retention

Do not delete historical:

```text
Trip Records
Attendance
Enrollment History
Route Changes
Vehicle Maintenance
Fuel Records
Incidents
```

Use archived/inactive states where necessary.

---

# 117. Definition of Done

The Transport module is complete when an authorized institution can:

```text
Create Vehicles
      ↓
Register Drivers
      ↓
Create Routes
      ↓
Create Stops
      ↓
Assign Vehicles
      ↓
Assign Drivers
      ↓
Enroll Students
      ↓
Assign Pickup / Drop Stops
      ↓
Validate Capacity
      ↓
Schedule Trips
      ↓
Record Pickup / Drop Attendance
      ↓
Track Delays / Cancellations
      ↓
Manage Vehicle Maintenance
      ↓
Track Fuel
      ↓
Record Incidents
      ↓
Manage Transport Fees
      ↓
Generate Reports
```

while preserving:

```text
Tenant Isolation
Branch Isolation
Student Privacy
Capacity Accuracy
Historical Integrity
Permission Enforcement
Financial Integrity
Auditability
```

---

# 118. Final Principle

> **Transport is a relationship between students, routes, stops, vehicles, drivers, and actual trips. Keep planned routes separate from actual trip events, preserve historical allocations, enforce vehicle capacity, and never allow changes to today's configuration to rewrite historical transportation records.**

---

# 119. Next Document

```text
59-HOSTEL-MANAGEMENT.md
```

The next module will define:

```text
Hostel
Buildings
Blocks
Floors
Rooms
Beds
Hostel Allocation
Student Residence
Warden
Roommate Management
Check-In
Check-Out
Hostel Attendance
Visitors
Mess
Hostel Fees
Complaints
Maintenance
Incidents
Hostel Reports
```

---

# END OF DOCUMENT
# HOSTEL MESS MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `60-HOSTEL-MESS-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Hostel Mess Management Specification  
**Previous Document:** `59-HOSTEL-MANAGEMENT.md`  
**Next Document:** `61-HEALTH-MEDICAL-MANAGEMENT.md`

---

# 1. Purpose

This module manages food and mess operations for students residing in hostels.

It covers:

```text
Hostel Mess
Meal Plans
Menus
Breakfast
Lunch
Dinner
Snacks
Meal Attendance
Meal Consumption
Meal Eligibility
Meal Exceptions
Kitchen Operations
Food Vendors
Food Inventory Integration
Mess Charges
Mess Feedback
Mess Complaints
Meal Wastage
Mess Reports
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

The Mess module must separate:

```text
Meal
Meal Plan
Menu
Meal Eligibility
Meal Attendance
Meal Consumption
Food Inventory
Vendor
Mess Charge
Feedback
Complaint
```

A menu defines what is planned.

A meal record represents the actual meal event.

A student's meal eligibility determines whether they can consume that meal.

---

# 3. Mess

A mess represents a food-service facility.

Conceptually:

```text
Mess
----
id
name
code
branchId
hostelId
status
```

A hostel may have one or multiple mess facilities.

---

# 4. Mess Status

Possible:

```text
ACTIVE
INACTIVE
TEMPORARILY_CLOSED
CLOSED
```

---

# 5. Mess Operating Hours

The institution may configure operating hours.

Example:

```text
Breakfast
7:00 AM - 9:00 AM

Lunch
12:30 PM - 2:30 PM

Dinner
7:30 PM - 9:30 PM
```

Operating hours must be configurable.

---

# 6. Meal Types

Supported meal types:

```text
BREAKFAST
LUNCH
DINNER
SNACK
OTHER
```

Institutions may enable or disable specific meal types.

---

# 7. Meal

A meal is an actual scheduled food-service event.

Conceptually:

```text
Meal
----
id
messId
mealType
date
startTime
endTime
status
```

Example:

```text
Breakfast
3 September 2026
7:00 AM - 9:00 AM
```

---

# 8. Meal Status

Possible:

```text
SCHEDULED
OPEN
CLOSED
CANCELLED
COMPLETED
```

---

# 9. Menu

A menu defines planned food items for a meal.

Example:

```text
Breakfast

Poha
Boiled Egg
Banana
Milk
Tea
```

---

# 10. Menu Entity

Conceptually:

```text
Menu
----
id
mealType
date
messId
status
```

---

# 11. Menu Items

A menu contains food items.

Conceptually:

```text
MenuItem
--------
menuId
foodItemId
quantity
unit
notes
```

---

# 12. Food Item

A food item represents something served by the mess.

Examples:

```text
Rice
Dal
Roti
Paneer
Vegetable
Milk
Egg
Fruit
Tea
```

Food items should be reusable across menus.

---

# 13. Food Item Entity

Conceptually:

```text
FoodItem
--------
id
name
category
unit
status
```

---

# 14. Food Categories

Possible:

```text
GRAIN
DAL
VEGETABLE
FRUIT
DAIRY
PROTEIN
BEVERAGE
SNACK
DESSERT
OTHER
```

Categories should be configurable.

---

# 15. Weekly Menu

The system should support recurring weekly menus.

Example:

```text
Monday
Breakfast → Poha
Lunch → Rice + Dal
Dinner → Roti + Sabzi

Tuesday
Breakfast → Paratha
...
```

A weekly menu can generate daily meal menus.

---

# 16. Menu Templates

Institutions may create reusable menu templates.

Conceptually:

```text
Menu Template
-------------
name
mealType
dayOfWeek
foodItems
```

---

# 17. Menu Versioning

Published menus should not be silently overwritten.

If the menu changes:

```text
Old Menu
 ↓
New Version
```

Historical records should remain traceable.

---

# 18. Menu Publication

Possible workflow:

```text
Draft
 ↓
Reviewed
 ↓
Published
```

---

# 19. Menu Status

Possible:

```text
DRAFT
PUBLISHED
ARCHIVED
CANCELLED
```

---

# 20. Student Meal Plan

A student may be assigned a meal plan.

Conceptually:

```text
Student
 ↓
Hostel Residence
 ↓
Meal Plan
```

---

# 21. Meal Plan Entity

```text
MealPlan
--------
id
name
messId
breakfastEnabled
lunchEnabled
dinnerEnabled
snackEnabled
status
effectiveFrom
effectiveTo
```

---

# 22. Meal Plan Examples

```text
FULL_BOARD
```

includes:

```text
Breakfast
Lunch
Dinner
```

Another plan:

```text
HALF_BOARD
```

may include:

```text
Breakfast
Dinner
```

The institution decides the actual configuration.

---

# 23. Meal Eligibility

The system must determine whether a student is eligible for a meal.

Eligibility may depend on:

```text
Active Hostel Residence
Meal Plan
Effective Date
Leave
Outing
Suspension
Institution Policy
```

---

# 24. Meal Eligibility Example

```text
Student A
Residence: ACTIVE
Meal Plan: FULL_BOARD
Date: 3 Sep

Eligible:
Breakfast
Lunch
Dinner
```

---

# 25. Hostel Leave Integration

A student on approved hostel leave may be excluded from meal eligibility according to institution policy.

Example:

```text
Leave:
5 Sep → 8 Sep

Meals:
Not counted during leave
```

The rule must be configurable.

---

# 26. Outing Integration

If the student is temporarily outside the hostel:

```text
OUT
```

meal eligibility may be affected according to institution policy.

---

# 27. Meal Attendance

The system may record whether a student consumed/collected a meal.

Possible statuses:

```text
ELIGIBLE
CONSUMED
NOT_CONSUMED
EXCUSED
NOT_ELIGIBLE
```

---

# 28. Meal Attendance Entity

Conceptually:

```text
MealAttendance
--------------
id
mealId
studentId
status
recordedAt
recordedBy
```

---

# 29. Meal Check-In

Meal attendance may be recorded through:

```text
QR Code
RFID
Biometric Device
Student ID
Manual Selection
```

The exact method is configurable.

---

# 30. QR Meal Check-In

Example:

```text
Student scans QR
 ↓
Student identified
 ↓
Eligibility checked
 ↓
Meal recorded
```

---

# 31. Duplicate Meal Scan

A student should not be counted twice for the same meal unless the institution explicitly allows multiple servings.

Example:

```text
Student A
Lunch
12:45 PM

Second scan:
BLOCKED
```

---

# 32. Manual Meal Attendance

Authorized staff may manually record meal attendance.

Manual changes must be auditable.

---

# 33. Attendance Correction

Corrections must preserve:

```text
Original Status
New Status
Reason
Actor
Timestamp
```

---

# 34. Meal Consumption

Consumption represents actual meal usage.

It can be used for:

```text
Meal Counts
Food Planning
Cost Analysis
Wastage Analysis
Vendor Planning
```

---

# 35. Meal Count

Example:

```text
Lunch
Eligible Students: 180
Consumed: 164
Not Consumed: 16
```

---

# 36. Kitchen Planning

Meal consumption data may help calculate required food quantities.

Example:

```text
Expected Meals:
180

Actual Consumption:
164

Planning Quantity:
Configured by institution
```

The system should not automatically assume exact food quantities without configured recipes/serving rules.

---

# 37. Recipe

Optional recipe management may define ingredients for food items.

Example:

```text
Dal
 ↓
Dal
Water
Spices
Oil
```

---

# 38. Recipe Entity

Conceptually:

```text
Recipe
------
id
foodItemId
servings
ingredients
instructions
status
```

---

# 39. Ingredient

Ingredients may reference the central inventory system.

Examples:

```text
Rice
Wheat
Oil
Salt
Dal
Vegetables
Milk
```

---

# 40. Inventory Integration

The Mess module should not create a completely separate inventory system.

Where the ERP has centralized inventory:

```text
Mess
 ↓
Inventory
 ↓
Stock
```

should be used.

---

# 41. Stock Consumption

If inventory integration is enabled, meal preparation may consume inventory.

Example:

```text
Rice:
-20 kg
Dal:
-8 kg
Oil:
-2 L
```

Inventory remains the source of truth.

---

# 42. Stock Adjustment

Authorized staff may record adjustments for:

```text
Spoilage
Damage
Wastage
Counting Error
Other
```

Adjustments must be audited.

---

# 43. Food Vendor

The mess may purchase food or ingredients from vendors.

Conceptually:

```text
FoodVendor
----------
id
name
contact
status
```

Vendor information may integrate with the central procurement/vendor module.

---

# 44. Vendor Integration

If a centralized vendor/procurement system exists, Mess should reference it instead of creating duplicate vendor identities.

---

# 45. Procurement

The mess may request:

```text
Rice
Dal
Vegetables
Milk
Eggs
Oil
Spices
```

through the central procurement workflow.

---

# 46. Purchase Records

Financial and procurement records should remain in the Finance/Procurement modules.

Mess may reference:

```text
Purchase Order
Vendor
Invoice
Expense
```

but should not duplicate accounting records.

---

# 47. Mess Charges

The institution may charge students for mess services.

Conceptually:

```text
Student
 ↓
Mess Plan
 ↓
Mess Charge
 ↓
Finance Invoice
 ↓
Payment
```

---

# 48. Mess Fee Plan

Conceptually:

```text
MessFeePlan
----------
id
name
messId
amount
frequency
effectiveFrom
effectiveTo
status
```

---

# 49. Fee Frequency

Possible:

```text
MONTHLY
QUARTERLY
TERM
ANNUAL
CUSTOM
```

---

# 50. Fee Proration

If a student joins or leaves a meal plan during a billing period, prorated charging may be supported.

The institution must configure the proration rule.

---

# 51. Finance Integration

The Mess module must not maintain its own payment ledger.

Payments should be recorded in the central Finance module.

---

# 52. Meal Exemption

A student may receive a meal exemption according to institutional policy.

Examples:

```text
Medical Requirement
Special Permission
Religious / Dietary Policy
Temporary Exemption
Other
```

The system should only expose sensitive details to authorized users.

---

# 53. Meal Exception

An exception may affect an individual meal.

Example:

```text
Student A
Lunch
3 September
Exception:
Not Eligible
```

---

# 54. Meal Exception Entity

Conceptually:

```text
MealException
-------------
mealId
studentId
type
reason
status
approvedBy
```

---

# 55. Meal Exception Approval

If approval is required:

```text
Requested
 ↓
Reviewed
 ↓
Approved / Rejected
```

---

# 56. Dietary Preferences

Where supported, the system may record non-sensitive dietary preferences.

Examples:

```text
Vegetarian
Non-Vegetarian
No Egg
No Onion
No Garlic
Other
```

These should be configurable and handled according to institution policy.

---

# 57. Allergies / Medical Information

Medical or allergy information is sensitive.

If the ERP supports such information, it must be handled through the dedicated health/medical module and exposed to Mess only when necessary and authorized.

Do not duplicate medical records inside Mess.

---

# 58. Special Meal

The institution may support special meals for:

```text
Dietary Requirement
Medical Requirement
Approved Exception
Event
```

The special meal should reference the relevant student and meal.

---

# 59. Meal Cancellation

A scheduled meal may be cancelled.

Example:

```text
Dinner
10 September
Status:
CANCELLED
```

Cancellation should not be treated as student absence.

---

# 60. Meal Rescheduling

If supported, a meal can be rescheduled.

The system must preserve the original planned event and record the change.

---

# 61. Meal Closure

After the meal service ends:

```text
Meal
 ↓
CLOSED
```

Further attendance changes should require appropriate authorization.

---

# 62. Meal Reopening

If required, authorized staff may reopen a closed meal.

This action must be audited.

---

# 63. Meal Wastage

The system may track food wastage.

Examples:

```text
Prepared Food
Remaining Food
Spoiled Food
Discarded Food
```

---

# 64. Wastage Record

Conceptually:

```text
FoodWastage
-----------
mealId
foodItemId
quantity
unit
reason
recordedBy
recordedAt
```

---

# 65. Wastage Reasons

Possible:

```text
OVER_PREPARATION
SPOILAGE
DAMAGE
LOW_CONSUMPTION
QUALITY_ISSUE
OTHER
```

---

# 66. Wastage Reporting

Example:

```text
September

Rice:
12 kg wasted

Dal:
5 kg wasted

Vegetables:
18 kg wasted
```

---

# 67. Mess Feedback

Students may submit feedback about meals.

Example categories:

```text
Taste
Quality
Quantity
Temperature
Variety
Cleanliness
Other
```

---

# 68. Feedback Entity

Conceptually:

```text
MessFeedback
-----------
id
studentId
mealId
rating
category
comment
createdAt
```

---

# 69. Rating

Possible:

```text
1
2
3
4
5
```

The institution may configure the scale.

---

# 70. Feedback Privacy

Institutions may optionally allow anonymous feedback.

If anonymous feedback is enabled, the system must not expose the student's identity to users who are not authorized to access it.

---

# 71. Mess Complaint

A complaint differs from ordinary feedback.

Examples:

```text
Food Quality Issue
Foreign Object
Food Shortage
Hygiene Issue
Service Issue
Other
```

---

# 72. Complaint Entity

Conceptually:

```text
MessComplaint
-------------
id
studentId
mealId
category
priority
description
status
createdAt
resolvedAt
```

---

# 73. Complaint Status

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

# 74. Complaint Priority

Possible:

```text
LOW
MEDIUM
HIGH
URGENT
```

---

# 75. Complaint Assignment

Complaints may be assigned to:

```text
Mess Manager
Warden
Kitchen Supervisor
Administrator
```

---

# 76. Kitchen Staff

Mess operations may involve:

```text
Chef
Cook
Kitchen Assistant
Cleaner
Mess Manager
Supervisor
```

Where these are institutional employees, reference the central Staff module.

---

# 77. Kitchen Shift

Optional shift management may define:

```text
Morning Shift
Afternoon Shift
Evening Shift
Night Shift
```

---

# 78. Kitchen Hygiene

The system may record hygiene checks.

Example:

```text
Kitchen Cleanliness
Food Storage
Utensils
Water
Waste Disposal
```

---

# 79. Hygiene Inspection

Conceptually:

```text
MessInspection
--------------
messId
date
inspector
category
status
notes
```

---

# 80. Inspection Status

Possible:

```text
PASSED
FAILED
REQUIRES_ACTION
```

---

# 81. Kitchen Equipment

Equipment may include:

```text
Gas Stove
Refrigerator
Freezer
Oven
Mixer
Water Purifier
Utensils
Other
```

Equipment should reference the centralized Asset/Inventory module where applicable.

---

# 82. Equipment Maintenance

Maintenance requests may be created for:

```text
Refrigerator
Oven
Stove
Water Purifier
Other Equipment
```

The centralized maintenance/asset system remains the source of truth where available.

---

# 83. Meal Count Dashboard

Example:

```text
Today's Meals

Breakfast:
172 / 180

Lunch:
165 / 180

Dinner:
Expected
```

---

# 84. Mess Dashboard

Possible metrics:

```text
Today's Meals
Expected Students
Meals Consumed
Meal Exceptions
Food Wastage
Open Complaints
Average Meal Rating
Active Meal Plans
Monthly Mess Revenue
Monthly Food Cost
```

---

# 85. Consumption Rate

Conceptually:

```text
Meals Consumed
÷
Eligible Meals
×
100
```

Example:

```text
165 / 180
=
91.67%
```

---

# 86. Wastage Rate

If configured:

```text
Food Wastage
÷
Prepared Quantity
×
100
```

This should only be calculated where quantities use compatible units.

---

# 87. Food Cost

Food cost may be calculated from procurement/inventory data.

The Mess module should reference financial data rather than creating duplicate accounting values.

---

# 88. Meal Forecasting

The system may estimate expected meal counts from:

```text
Active Residents
+
Meal Plan
-
Approved Exceptions
-
Eligible Leave / Outing Adjustments
```

Actual meal consumption should remain separate.

---

# 89. Forecast Example

```text
Active Residents:
200

Full Meal Plan:
180

Excluded:
10

Expected Lunch:
170
```

---

# 90. Meal Plan Change

If a student's meal plan changes:

```text
Old Plan
 ↓
End Date
 ↓
New Plan
 ↓
Effective Date
```

Historical meal eligibility must not be rewritten.

---

# 91. Meal History

A student profile may show:

```text
Meal Date
Meal Type
Status
Mess
Recorded At
```

according to permission.

---

# 92. Meal Search

Search by:

```text
Student
Meal
Date
Mess
Food Item
```

---

# 93. Filters

Useful filters:

```text
Mess
Hostel
Meal Type
Date
Meal Status
Attendance Status
Meal Plan
Complaint Status
Food Category
```

---

# 94. Reports

Useful reports:

```text
Daily Meal Report
Meal Consumption Report
Meal Attendance Report
Meal Plan Report
Menu Report
Food Item Report
Wastage Report
Food Cost Report
Vendor Report
Mess Fee Report
Feedback Report
Complaint Report
Hygiene Inspection Report
```

---

# 95. Daily Meal Report

Example:

```text
Lunch
3 September

Eligible:
180

Consumed:
165

Not Consumed:
15

Consumption:
91.67%
```

---

# 96. Menu Report

Show:

```text
Date
Meal Type
Food Items
Published Status
```

---

# 97. Wastage Report

Show:

```text
Date
Meal
Food Item
Quantity
Reason
Recorded By
```

---

# 98. Feedback Report

Show aggregated:

```text
Meal
Average Rating
Number of Responses
Category Breakdown
```

Student identities should only appear where permitted.

---

# 99. Complaint Report

Show:

```text
Complaint
Student
Meal
Category
Priority
Status
Assigned To
Created
Resolved
```

---

# 100. Permission Model

Potential permissions:

```text
mess.read
mess.create
mess.update
mess.archive
mess.menu.manage
mess.meal.manage
mess.meal_attendance
mess.meal_exception
mess.meal_plan
mess.wastage
mess.feedback
mess.complaint
mess.vendor
mess.inventory
mess.inspection
mess.maintenance
mess.fees
mess.reports
mess.export
```

---

# 101. Permission-Aware UI

Example:

```text
No mess.menu.manage
→ Hide Menu Management

No mess.meal_attendance
→ Hide Meal Attendance Controls

No mess.wastage
→ Hide Wastage Actions

No mess.fees
→ Hide Fee Controls
```

Backend authorization remains mandatory.

---

# 102. Tenant Isolation

All Mess data must be scoped by tenant.

Tenant A must never access Tenant B's:

```text
Messes
Menus
Meals
Meal Plans
Attendance
Complaints
Vendors
Wastage
Fees
```

---

# 103. Branch Isolation

Branch-scoped users must only access authorized mess facilities and related students.

---

# 104. Student Privacy

Mess staff should only receive student information necessary to operate meal services.

Avoid exposing unrelated:

```text
Academic Data
Financial Details
HR Data
Medical Data
```

unless specifically authorized and required.

---

# 105. Audit Trail

Important events:

```text
Mess Created
Mess Updated
Menu Created
Menu Published
Menu Updated
Meal Created
Meal Cancelled
Meal Rescheduled
Meal Attendance Recorded
Meal Attendance Corrected
Meal Plan Assigned
Meal Plan Changed
Meal Exception Created
Meal Exception Approved
Wastage Recorded
Feedback Submitted
Complaint Created
Complaint Resolved
Inspection Completed
```

---

# 106. Idempotency

Repeated requests must not create duplicate:

```text
Meals
Meal Attendance
Meal Exceptions
Meal Plan Assignments
Wastage Records
Complaints
Charges
```

where the operation should be unique.

---

# 107. Concurrency

Meal attendance must be concurrency-safe.

Example:

```text
Student A scans QR
while
Staff manually records Student A
```

The system must prevent duplicate consumption records for the same meal unless multiple servings are explicitly supported.

---

# 108. Historical Integrity

Never silently modify historical:

```text
Menus
Meals
Attendance
Meal Plans
Exceptions
Wastage
Complaints
```

Changes should create history or audit records.

---

# 109. Date Handling

Use the institution's configured timezone.

Meal records must distinguish:

```text
Scheduled Date
Scheduled Time
Actual Attendance Time
Effective Date
```

---

# 110. Financial Precision

Mess fees, food costs, vendor costs, and other monetary values must use exact monetary arithmetic.

---

# 111. Notifications

Optional notifications:

```text
Menu Published
Meal Cancelled
Meal Schedule Changed
Meal Plan Changed
Complaint Updated
Special Meal Approved
Fee Reminder
```

Use the centralized notification architecture.

---

# 112. Parent Visibility

Where enabled, parents may see:

```text
Meal Plan
Selected Meal Information
Mess Charges
Relevant Notifications
```

Only information related to their linked child should be visible.

---

# 113. Empty States

Examples:

```text
No mess facilities found.
```

```text
No menu published for this date.
```

```text
No meal records found.
```

```text
No open mess complaints.
```

```text
No food wastage recorded.
```

---

# 114. Loading States

Provide loading states for:

```text
Mess Dashboard
Meal List
Menu
Meal Attendance
Meal Plans
Food Items
Wastage
Feedback
Complaints
Reports
```

---

# 115. Error Handling

Use actionable errors.

Example:

```text
Student is not eligible for this meal.
```

Instead of:

```text
MealEligibilityException.
```

Another example:

```text
This student has already been marked as having consumed lunch today.
```

---

# 116. Hostel Integration

The Mess module may reference:

```text
Hostel
Residence
Student
Leave
Outing
```

from the Hostel module.

It must not duplicate hostel residence data.

---

# 117. Student Integration

Students must reference the central Student module.

---

# 118. Staff Integration

Mess employees should reference the central Staff module.

---

# 119. Inventory Integration

Food ingredients should reference the centralized Inventory system where available.

---

# 120. Procurement Integration

Food purchases should integrate with the centralized Procurement/Vendor system.

---

# 121. Finance Integration

Mess charges and costs should integrate with Finance.

---

# 122. Health Integration

Sensitive dietary/medical requirements should integrate with the Health/Medical module rather than being duplicated inside Mess.

---

# 123. Notification Integration

All notifications should use the centralized notification system.

---

# 124. Data Retention

Do not delete historical:

```text
Meal Records
Attendance
Menus
Meal Plans
Exceptions
Wastage
Complaints
Feedback
Inspections
Charges
```

Archive where necessary.

---

# 125. Definition of Done

The Mess module is complete when an authorized institution can:

```text
Create Mess
      ↓
Configure Meal Types
      ↓
Create Food Items
      ↓
Create Menus
      ↓
Publish Menus
      ↓
Create Meals
      ↓
Assign Student Meal Plans
      ↓
Calculate Meal Eligibility
      ↓
Record Meal Consumption
      ↓
Manage Exceptions
      ↓
Track Food Wastage
      ↓
Manage Inventory Integration
      ↓
Manage Vendors
      ↓
Track Mess Charges
      ↓
Collect Feedback
      ↓
Handle Complaints
      ↓
Perform Inspections
      ↓
Generate Reports
```

while preserving:

```text
Tenant Isolation
Branch Isolation
Student Privacy
Meal Eligibility Accuracy
Duplicate Prevention
Historical Integrity
Permission Enforcement
Financial Integrity
Auditability
```

---

# 126. Final Principle

> **Mess management must distinguish planned food service from actual consumption. Menus define what should be served, meal records define the actual service event, and student eligibility determines who can consume it. Never overwrite historical meal plans or consumption records, and keep inventory and finance as centralized sources of truth.**

---

# 127. Next Document

```text
61-HEALTH-MEDICAL-MANAGEMENT.md
```

The next module will define:

```text
Health Records
Medical Profile
Nurse / Medical Staff
Clinic
Appointments
Medical Visits
Symptoms
Diagnosis
Treatment
Medication Records
Prescriptions
Emergency Cases
First Aid
Health Screening
Vaccination Records
Medical Documents
Parent Notifications
Health Reports
Privacy & Access Control
```

---

# END OF DOCUMENT
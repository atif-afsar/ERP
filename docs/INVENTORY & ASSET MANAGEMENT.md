# INVENTORY & ASSET MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `56-INVENTORY-ASSET-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Inventory & Asset Management Specification  
**Previous Document:** `55-STAFF-PAYROLL-HR.md`  
**Next Document:** `57-LIBRARY-MANAGEMENT.md`

---

# 1. Purpose

This module manages physical inventory, stock movement, institutional assets, and asset lifecycle.

It covers:

```text
Inventory
Items
Categories
Units
Warehouses
Stock Levels
Stock In
Stock Out
Stock Transfers
Stock Adjustments
Suppliers
Purchase Integration
Low Stock
Asset Management
Asset Categories
Asset Assignment
Asset Locations
Asset Maintenance
Asset Depreciation
Asset Disposal
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

The system must distinguish between:

```text
Consumable Inventory
Fixed Assets
Stock Movement
Asset Assignment
Asset Maintenance
```

For example:

```text
500 Notebooks
→ Inventory

Projector
→ Asset

Whiteboard Marker
→ Inventory

Computer
→ Asset
```

---

# 3. Inventory vs Asset

## Inventory

Items that are consumed, distributed, sold, or regularly replenished.

Examples:

```text
Notebooks
Pens
Markers
Paper
Cleaning Supplies
Study Material
Uniforms
ID Cards
```

## Assets

Longer-lived institutional property.

Examples:

```text
Computers
Projectors
Furniture
Printers
CCTV Equipment
Air Conditioners
Vehicles
```

---

# 4. Inventory Item

Conceptually:

```text id="k8nj1y"
InventoryItem
-------------
id
sku
name
categoryId
unitId
description
minimumStock
reorderLevel
status
```

---

# 5. SKU

Each inventory item may have a unique SKU.

Example:

```text id="c48v1h"
STN-A4-001
```

SKU should remain stable even if the item display name changes.

---

# 6. Item Category

Examples:

```text id="p6j7c9"
Stationery
Cleaning
Teaching Material
Uniform
Books
Office Supplies
Electrical
Computer Accessories
Other
```

Categories should be configurable.

---

# 7. Item Unit

Examples:

```text id="4k5h7m"
Piece
Box
Pack
Kg
Litre
Set
Dozen
```

Units must be configurable.

---

# 8. Warehouse

A warehouse/storage location holds inventory.

Examples:

```text id="2m8f9s"
Main Store
Branch Store
Library Store
Science Lab Store
Office Store
```

---

# 9. Warehouse Entity

Conceptually:

```text id="6x1j9e"
Warehouse
---------
id
branchId
name
code
location
status
```

---

# 10. Branch Inventory

Each branch may have its own stock.

Example:

```text id="q9s2k4"
Branch A
Markers: 100

Branch B
Markers: 35
```

Branch users must only access authorized inventory.

---

# 11. Stock Balance

The system should maintain stock balance by:

```text id="2r4t7w"
Item
Warehouse
```

Conceptually:

```text id="f5d8j1"
Available Stock =
Stock In
−
Stock Out
+
Adjustments
±
Transfers
```

---

# 12. Stock Movement

Every stock change should be represented by a movement.

Types:

```text id="v1n4p7"
RECEIPT
ISSUE
TRANSFER_OUT
TRANSFER_IN
ADJUSTMENT_IN
ADJUSTMENT_OUT
RETURN
```

---

# 13. Stock Movement Entity

Conceptually:

```text id="r3k6m9"
StockMovement
-------------
id
itemId
warehouseId
quantity
movementType
reference
date
createdBy
```

---

# 14. Stock In

Stock enters inventory through:

```text id="b5t8x2"
Purchase
Return
Manual Receipt
Opening Balance
Transfer
```

---

# 15. Stock Receipt

Example:

```text id="z7m1q4"
Markers Received
Quantity: 500
Warehouse: Main Store
```

Stock increases accordingly.

---

# 16. Stock Out

Stock leaves inventory through:

```text id="e2r5k8"
Staff Issue
Department Issue
Student Distribution
Sale
Consumption
Damage
Transfer
```

---

# 17. Stock Issue

Example:

```text id="n6p9v3"
Issue:
50 notebooks

To:
Academic Department
```

---

# 18. Stock Transfer

Inventory can move between warehouses.

Example:

```text id="h4j7l2"
Main Store
   ↓
Branch Store

100 notebooks
```

---

# 19. Transfer Lifecycle

Recommended:

```text id="x8c2m5"
Requested
 ↓
Approved
 ↓
Dispatched
 ↓
Received
```

For simpler configurations, transfer may be immediate.

---

# 20. Transfer Integrity

A transfer must not create or destroy stock.

Example:

```text id="g7w2n9"
Source: -100
Destination: +100
Net: 0
```

---

# 21. Stock Adjustment

Authorized users may adjust stock for:

```text id="j3k8p1"
Damage
Loss
Found Stock
Counting Difference
Opening Balance
Correction
```

Every adjustment must have a reason.

---

# 22. Adjustment Example

```text id="m5r9t2"
System Stock: 100
Physical Count: 96

Adjustment:
-4

Reason:
Damaged items
```

---

# 23. Physical Stock Count

The system may support stock counts.

Workflow:

```text id="v8q4s6"
Create Count
 ↓
Enter Physical Quantity
 ↓
Compare System Quantity
 ↓
Review Variance
 ↓
Approve Adjustment
```

---

# 24. Stock Variance

Example:

```text id="d1f7k3"
System: 500
Physical: 480
Variance: -20
```

The system should not automatically adjust stock until the configured approval process is completed.

---

# 25. Negative Stock

Default behavior:

```text id="w6n2p8"
Do not allow negative stock.
```

If the institution explicitly enables negative inventory, the configuration must be clearly visible and audited.

---

# 26. Low Stock

An item may trigger a low-stock warning when:

```text id="q5m8r1"
Available Quantity
≤
Reorder Level
```

---

# 27. Low Stock Dashboard

Show:

```text id="s7x3k9"
Item
Current Stock
Minimum Stock
Reorder Level
Warehouse
```

---

# 28. Reorder Level

Example:

```text id="a4c8v2"
Current: 20
Reorder Level: 50

Status:
LOW STOCK
```

---

# 29. Inventory Valuation

If inventory accounting is enabled, support configured valuation methods.

Examples may include:

```text id="e9t3m6"
FIFO
Weighted Average
```

The selected method must be institution-configurable and consistently applied.

---

# 30. Inventory Cost

Inventory may store:

```text id="p2k7n4"
Purchase Cost
Average Cost
Last Purchase Cost
```

depending on the accounting model.

---

# 31. Purchase Integration

Inventory purchases may connect to:

```text id="c6r9v1"
Supplier
Purchase Order
Goods Receipt
Vendor Bill
Finance
```

The inventory module should not duplicate vendor accounting logic.

---

# 32. Supplier

A supplier provides inventory items.

Supplier records may be shared with the Finance/Vendor module where appropriate.

Do not create duplicate supplier identities unnecessarily.

---

# 33. Supplier Information

Possible:

```text id="n8w4j6"
Name
Contact
Phone
Email
Address
Tax Information
Status
```

---

# 34. Goods Receipt

When purchased inventory arrives:

```text id="u3m7q9"
Purchase Order
 ↓
Goods Received
 ↓
Stock Increase
 ↓
Vendor Bill
```

The system should support partial receipts.

---

# 35. Partial Receipt

Example:

```text id="f8k2p5"
Ordered: 500
Received: 300
Remaining: 200
```

Purchase order remains partially fulfilled.

---

# 36. Inventory Return

Inventory may be returned to a supplier.

Example:

```text id="j5v1r8"
Received: 100
Returned: 10
Remaining: 90
```

The return must create the correct stock movement.

---

# 37. Item Return

Items issued to departments/staff may sometimes be returned.

Example:

```text id="x4n7b2"
Issued: 10
Returned: 3
Net Issued: 7
```

---

# 38. Consumable Issue

For consumables:

```text id="c9m3s7"
Warehouse
 ↓
Department / Staff
 ↓
Consumed
```

The system should preserve the issue history.

---

# 39. Inventory Issue Recipient

Depending on configuration, stock may be issued to:

```text id="r6t2p8"
Department
Staff
Class
Section
Student
Branch
```

---

# 40. Issue Reference

Each stock issue should have a reference.

Example:

```text id="w1q5k9"
ISS-2026-00125
```

---

# 41. Inventory Search

Search by:

```text id="h3m8v6"
Item Name
SKU
Category
Warehouse
Supplier
Status
```

---

# 42. Inventory Filters

Useful filters:

```text id="p7r2x4"
Branch
Warehouse
Category
Low Stock
Out of Stock
Item Type
Supplier
Status
```

---

# 43. Inventory Dashboard

Possible metrics:

```text id="m9c4s1"
Total Items
Total Stock Units
Low Stock Items
Out of Stock Items
Recent Receipts
Recent Issues
Recent Transfers
Stock Value
```

---

# 44. Inventory Detail

Recommended:

```text id="v2k7n5"
Item Information
 ↓
Current Stock
 ↓
Warehouse Stock
 ↓
Movement History
 ↓
Purchase History
 ↓
Issue History
 ↓
Adjustments
```

---

# 45. Stock Movement History

Display:

```text id="q8f3j6"
Date
Movement Type
Quantity
Warehouse
Reference
User
```

---

# 46. Inventory Audit

Important events:

```text id="t5n9x2"
Item Created
Item Updated
Stock Received
Stock Issued
Stock Transferred
Stock Adjusted
Stock Count Created
Stock Count Approved
Item Archived
```

---

# 47. Asset

An asset represents an identifiable long-lived physical resource.

Examples:

```text id="z3c6m8"
Laptop
Projector
Printer
Desk
Chair
Air Conditioner
Vehicle
CCTV Camera
```

---

# 48. Asset Entity

Conceptually:

```text id="r7p2k5"
Asset
-----
id
assetCode
name
categoryId
serialNumber
purchaseDate
purchaseCost
vendorId
branchId
locationId
status
```

---

# 49. Asset Code

Every asset should have a unique identifier.

Example:

```text id="y4m8q1"
AST-2026-00128
```

---

# 50. Asset Category

Examples:

```text id="n6c3v9"
IT Equipment
Furniture
Electrical
Vehicle
Laboratory Equipment
Audio Visual
Security Equipment
Other
```

Categories should be configurable.

---

# 51. Asset Serial Number

Where the manufacturer provides one, store the serial number.

Serial numbers should be searchable and unique where appropriate.

---

# 52. Asset Purchase Information

Store relevant purchase information:

```text id="k2s7x4"
Purchase Date
Purchase Cost
Vendor
Invoice Reference
Warranty
```

---

# 53. Asset Location

An asset may belong to a physical location.

Examples:

```text id="v9p3m6"
Building
Floor
Room
Lab
Office
Classroom
```

---

# 54. Location Entity

Conceptually:

```text id="c4r8j1"
Location
--------
id
branchId
name
code
parentLocationId
status
```

This supports hierarchical locations.

---

# 55. Location Hierarchy

Example:

```text id="q7m2n5"
Main Building
 ├── First Floor
 │    ├── Room 101
 │    └── Room 102
 └── Second Floor
      └── Lab 201
```

---

# 56. Asset Assignment

An asset may be assigned to:

```text id="f3x8k6"
Staff
Department
Room
Branch
```

depending on configuration.

---

# 57. Asset Assignment History

Do not overwrite assignment history.

Example:

```text id="j9v4p2"
Teacher A
 ↓
IT Department
 ↓
Teacher B
```

The history must remain auditable.

---

# 58. Asset Assignment Entity

Conceptually:

```text id="m6r1t8"
AssetAssignment
---------------
assetId
assignedToType
assignedToId
locationId
startDate
endDate
assignedBy
```

---

# 59. Asset Status

Possible:

```text id="x2c7n9"
ACTIVE
IN_USE
IN_STORAGE
UNDER_MAINTENANCE
DAMAGED
LOST
DISPOSED
RETIRED
```

---

# 60. Asset Lifecycle

Typical:

```text id="b8m3q5"
Purchased
 ↓
Received
 ↓
Assigned
 ↓
In Use
 ↓
Maintenance
 ↓
Returned / Reassigned
 ↓
Disposed / Retired
```

---

# 61. Asset Maintenance

Assets may require maintenance.

Examples:

```text id="v5k9r2"
Laptop Repair
AC Servicing
Projector Maintenance
Vehicle Service
Printer Repair
```

---

# 62. Maintenance Record

Conceptually:

```text id="q3x7m1"
Maintenance
-----------
assetId
date
type
description
vendorId
cost
status
nextDueDate
```

---

# 63. Maintenance Status

Possible:

```text id="n8c4p6"
REQUESTED
SCHEDULED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

# 64. Maintenance Cost

Maintenance costs may integrate with Finance.

Example:

```text id="r2v6k9"
Projector Repair
₹2,500
```

Finance records should remain the source of truth for financial accounting.

---

# 65. Maintenance Schedule

Assets may have recurring maintenance.

Example:

```text id="f7m3x8"
AC Service
Every 6 months
```

---

# 66. Warranty

Assets may have warranty information:

```text id="j4q9c2"
Warranty Start
Warranty End
Provider
Reference
```

---

# 67. Warranty Expiry

The system may notify authorized users before warranty expiry.

Example:

```text id="p8n2v5"
Projector warranty expires in 30 days.
```

---

# 68. Asset Depreciation

If fixed-asset accounting is enabled, assets may support depreciation.

Possible methods:

```text id="c5r7m3"
Straight Line
Declining Balance
```

The institution must configure the applicable accounting method.

---

# 69. Depreciation Record

Conceptually:

```text id="x9k4q1"
Asset
Period
Opening Book Value
Depreciation
Closing Book Value
```

---

# 70. Depreciation Integrity

Depreciation should be calculated using the configured accounting rules.

Do not alter historical depreciation silently.

---

# 71. Asset Disposal

Assets may eventually be disposed of.

Examples:

```text id="m7v2c8"
Sold
Scrapped
Donated
Lost
Retired
```

---

# 72. Disposal Workflow

Recommended:

```text id="q4n8p1"
Disposal Request
 ↓
Approval
 ↓
Disposal
 ↓
Accounting Adjustment
```

where accounting integration is enabled.

---

# 73. Disposal Information

Record:

```text id="f6x3r9"
Disposal Date
Reason
Method
Sale Amount if applicable
Approved By
Reference
```

---

# 74. Lost Asset

If an asset is lost:

```text id="j8m5v2"
Asset
→ LOST
```

Do not delete it.

Record the incident and audit trail.

---

# 75. Damaged Asset

A damaged asset may be:

```text id="n3q7c6"
Under Maintenance
Retained
Written Off
Disposed
```

according to institutional policy.

---

# 76. Asset Inventory Relationship

Purchasing an asset may originate from inventory/procurement.

Example:

```text id="r5k1x8"
Purchase
 ↓
Goods Received
 ↓
Asset Created
 ↓
Asset Assigned
```

The implementation must avoid creating duplicate financial records.

---

# 77. Asset Barcode / QR Code

Assets may support:

```text id="v7m2p4"
Barcode
QR Code
NFC / Other Identifier
```

for physical tracking.

---

# 78. Asset Scanning

If scanning is implemented:

```text id="c8q3n6"
Scan Asset
 ↓
Open Asset Profile
 ↓
Verify Location
 ↓
Verify Assignment
 ↓
Record Audit
```

---

# 79. Asset Verification

Periodic asset verification may compare:

```text id="x4r9m1"
Expected Asset
Expected Location
Expected Assignee
Actual Location
Actual Condition
```

---

# 80. Asset Verification Status

Possible:

```text id="j6p2v8"
VERIFIED
MISSING
MOVED
DAMAGED
UNRESOLVED
```

---

# 81. Asset Verification History

Every verification should preserve:

```text id="q9c5m3"
Date
Asset
Verifier
Location
Condition
Result
Notes
```

---

# 82. Asset Condition

Possible:

```text id="n2x7r4"
NEW
GOOD
FAIR
DAMAGED
CRITICAL
```

---

# 83. Inventory Reports

Useful reports:

```text id="m5v8k2"
Stock Summary
Stock Movement
Low Stock
Out of Stock
Stock Valuation
Purchase History
Issue History
Transfer History
Stock Adjustment
```

---

# 84. Asset Reports

Useful reports:

```text id="p3q9x6"
Asset Register
Asset by Category
Asset by Branch
Asset by Location
Asset by Staff
Maintenance Report
Warranty Report
Depreciation Report
Disposal Report
Missing Asset Report
```

---

# 85. Branch Asset Report

Example:

```text id="r8c4m1"
Branch A
Assets: 520
Active: 490
Maintenance: 20
Missing: 10
```

---

# 86. Inventory Export

Authorized users may export:

```text id="v2n7q5"
Inventory
Stock Movements
Purchase Records
Stock Counts
Adjustments
```

---

# 87. Asset Export

Authorized users may export:

```text id="j4m9x3"
Asset Register
Assignments
Maintenance
Depreciation
Disposals
```

---

# 88. Permission Model

Potential permissions:

```text id="c7p2r8"
inventory.read
inventory.create
inventory.update
inventory.adjust
inventory.transfer
inventory.issue
inventory.receive
inventory.count
inventory.approve
inventory.export

asset.read
asset.create
asset.update
asset.assign
asset.transfer
asset.maintenance
asset.dispose
asset.depreciation
asset.verify
asset.export
```

Use the centralized authorization architecture.

---

# 89. Permission-Aware UI

Example:

```text id="n6v3q9"
No inventory.adjust
→ Hide Adjust Stock

No inventory.issue
→ Hide Issue Stock

No asset.assign
→ Hide Assign

No asset.dispose
→ Hide Dispose

No asset.export
→ Hide Export
```

Backend authorization remains mandatory.

---

# 90. Tenant Isolation

Inventory and assets must always be scoped by:

```text id="r1m8c5"
tenantId
```

and applicable branch permissions.

Tenant A must never access Tenant B's inventory or assets.

---

# 91. Branch Isolation

Branch users should only access:

```text id="x6q2v9"
Authorized Warehouses
Authorized Stock
Authorized Assets
```

---

# 92. Audit Trail

Important events:

```text id="p4n7m3"
Inventory Item Created
Inventory Item Updated
Stock Received
Stock Issued
Stock Transferred
Stock Adjusted
Stock Count Approved
Asset Created
Asset Assigned
Asset Reassigned
Asset Maintenance Created
Asset Maintenance Completed
Asset Disposed
Asset Marked Lost
Asset Verified
```

---

# 93. Transaction Safety

Stock movement operations must be atomic.

For example:

```text id="j8r3v6"
Transfer Out
+
Transfer In
```

must not leave the system with only one side recorded.

---

# 94. Concurrency

Prevent simultaneous operations from producing incorrect stock balances.

Example:

```text id="m2q7x4"
Available Stock: 10

User A issues: 8
User B issues: 5
```

The system must prevent the resulting stock from becoming invalid.

---

# 95. Idempotency

Repeated requests must not create duplicate:

```text id="v5c9n1"
Stock Receipts
Stock Issues
Transfers
Adjustments
Asset Creation
```

when the operation should be unique.

---

# 96. Financial Integration

Inventory may integrate with:

```text id="q3m8r6"
Finance
Vendor Bills
Expenses
Assets
```

but financial accounting must remain centralized.

---

# 97. Asset Accounting Integration

If fixed-asset accounting is enabled:

```text id="n7x2p4"
Asset Purchase
 ↓
Asset Register
 ↓
Depreciation
 ↓
Disposal
```

must integrate with Finance/Accounting.

---

# 98. Empty States

Examples:

```text id="c6v9m2"
No inventory items found.
```

```text id="r4q8x1"
No low-stock items.
```

```text id="p7n3m5"
No assets are assigned to this location.
```

```text id="j2v6c9"
No maintenance records found.
```

---

# 99. Loading States

Provide loading states for:

```text id="x8m4q2"
Inventory Dashboard
Stock List
Stock Movement
Warehouse
Asset Register
Asset Detail
Maintenance
Reports
```

---

# 100. Error Handling

Use actionable messages.

Example:

```text id="n5r9c3"
Cannot issue 50 units. Only 32 units are available in Main Store.
```

instead of:

```text id="q2v7m8"
InsufficientStockException.
```

---

# 101. Data Integrity

The system must maintain:

```text id="f3x8p1"
Stock Balance
Movement History
Asset History
Assignment History
Maintenance History
Financial References
```

as consistent sources of truth.

---

# 102. Historical Integrity

Do not delete historical:

```text id="m9c4v7"
Stock Movements
Asset Assignments
Maintenance Records
Disposals
Adjustments
```

because they are part of the audit trail.

---

# 103. Staff Integration

Assets may be assigned to staff.

Example:

```text id="x2q8n5"
Laptop
 ↓
Employee: EMP-00125
```

Staff identity comes from:

```text id="p6m3r9"
55-STAFF-PAYROLL-HR.md
```

Do not duplicate employee records.

---

# 104. Finance Integration

Purchases, expenses, asset acquisition, and disposal may create financial events.

Finance remains the source of truth for financial accounting.

---

# 105. Procurement Integration

Where procurement exists:

```text id="v4n7c2"
Purchase Request
 ↓
Purchase Order
 ↓
Receipt
 ↓
Inventory / Asset
 ↓
Vendor Bill
 ↓
Payment
```

---

# 106. Definition of Done

The Inventory & Asset module is complete when an authorized institution can:

```text id="j5x9m3"
Create Inventory Items
      ↓
Configure Warehouses
      ↓
Receive Stock
      ↓
Issue Stock
      ↓
Transfer Stock
      ↓
Adjust Stock
      ↓
Perform Stock Counts
      ↓
Track Low Stock
      ↓
Manage Suppliers
      ↓
Create Assets
      ↓
Assign Assets
      ↓
Track Locations
      ↓
Track Maintenance
      ↓
Track Warranty
      ↓
Track Depreciation
      ↓
Verify Assets
      ↓
Dispose / Retire Assets
      ↓
Generate Reports
```

while maintaining:

```text id="q8v2r6"
Tenant Isolation
Branch Isolation
Permission Enforcement
Stock Accuracy
Asset History
Financial Integrity
Auditability
```

---

# 107. Final Principle

> **Inventory represents quantities that move; assets represent identifiable property that has a lifecycle. Every stock movement must have a traceable source and destination, while every asset must retain its identity, location, assignment, condition, maintenance, and disposal history. Never silently modify or delete historical inventory or asset records.**

---

# 108. Next Document

```text id="m3q7x9"
57-LIBRARY-MANAGEMENT.md
```

The next module will define:

```text
Library
Books
Book Copies
ISBN
Authors
Publishers
Categories
Shelves
Locations
Members
Book Issue
Book Return
Renewals
Reservations
Fines
Lost Books
Damaged Books
Library Cards
Library Reports
```

---

# END OF DOCUMENT
# GUARDIAN & PARENT MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `46-GUARDIAN-PARENT-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Guardian & Parent Specification  
**Previous Document:** `45-STUDENT-MANAGEMENT-MODULE.md`  
**Next Document:** `47-STAFF-TEACHER-MANAGEMENT.md`

---

# 1. Purpose

The Guardian & Parent Management module manages people responsible for students.

A guardian is a separate entity from a student.

The system must support:

```text
Guardian
 ↓
Guardian ↔ Student Relationship
 ↓
Student
```

One guardian may be associated with multiple students, and one student may have multiple guardians.

---

# 2. Core Principle

Do not duplicate guardian information inside every student record.

Incorrect:

```text
Student A
 └── Father Name
 └── Father Phone

Student B
 └── Father Name
 └── Father Phone
```

Preferred:

```text
Guardian
   ↓
Relationships
   ↓
Student A
Student B
```

This allows shared family information to remain consistent.

---

# 3. Guardian Entity

Conceptually:

```text
Guardian
---------
id
firstName
middleName
lastName
phone
alternatePhone
email
address
occupation
status
createdAt
updatedAt
```

The final database schema remains authoritative for exact fields.

---

# 4. Guardian Identity

A guardian should have a stable internal identifier.

Example:

```text
GUA-000123
```

The identifier must be unique according to the database architecture.

---

# 5. Guardian Name

Support:

```text
First Name
Middle Name
Last Name
Preferred Name
```

The UI should display the full name consistently.

---

# 6. Contact Information

Guardian contact information may include:

```text
Primary Phone
Secondary Phone
Email
```

The system should clearly identify the primary contact method.

---

# 7. Phone Validation

Phone numbers should be normalized and validated before storage.

The system should avoid creating multiple guardian records simply because the same phone number is formatted differently.

Example:

```text
+91 98765 43210
```

and:

```text
9876543210
```

may represent the same number depending on the application's normalization rules.

---

# 8. Email

If email is provided:

```text
Validate Format
Normalize Where Appropriate
Store Securely
```

Email should be searchable where authorized.

---

# 9. Address

Guardian address may include:

```text
Address Line
Area
City
State
Postal Code
Country
```

If a shared family address exists, it should not need to be duplicated unnecessarily.

---

# 10. Occupation

Occupation may be stored when useful for institutional records.

Example:

```text
Business Owner
Teacher
Engineer
Doctor
Government Employee
Other
```

This field should remain optional unless the institution explicitly requires it.

---

# 11. Guardian Status

Possible states:

```text
ACTIVE
INACTIVE
ARCHIVED
```

The exact status model should follow the broader application conventions.

---

# 12. Guardian Relationship

The relationship between guardian and student must be explicit.

Example:

```text
Guardian
 ↓
Relationship
 ↓
Student
```

Relationship types may include:

```text
Father
Mother
Guardian
Grandparent
Sibling
Relative
Other
```

---

# 13. Guardian Relationship Entity

Conceptually:

```text
GuardianStudentRelationship
---------------------------
id
guardianId
studentId
relationshipType
isPrimary
isEmergencyContact
canReceiveCommunication
canViewStudent
createdAt
updatedAt
```

The exact fields must follow the canonical schema.

---

# 14. Multiple Guardians

The system must support:

```text
Student
 ├── Mother
 ├── Father
 └── Guardian
```

There should be no assumption that every student has exactly one parent.

---

# 15. Multiple Students

A guardian can be connected to multiple students.

Example:

```text
Guardian
 ├── Student A
 ├── Student B
 └── Student C
```

This is important for siblings attending the same institution.

---

# 16. Primary Guardian

One guardian relationship may be designated as primary.

Example:

```text
Student
 ↓
Primary Guardian
```

The primary guardian may be used for:

```text
Routine Communication
Fee Notifications
Academic Notifications
Emergency Contact
```

according to configured rules.

---

# 17. Primary Guardian Constraint

The system should avoid ambiguous state.

If the product requires exactly one primary guardian:

```text
Student
 ↓
Primary Guardian = 1
```

Creating a new primary guardian should automatically remove the previous primary designation or require explicit confirmation.

---

# 18. Emergency Contact

A guardian may be designated as an emergency contact.

Example:

```text
Student
 ├── Primary Guardian
 └── Emergency Contact
```

Emergency-contact status should be independently represented from primary-guardian status.

---

# 19. Communication Permission

A guardian relationship may specify whether the guardian can receive communications.

Example:

```text
canReceiveCommunication = true
```

This prevents every linked guardian from automatically receiving every notification.

---

# 20. Student Access Permission

If guardian portal functionality is supported, the relationship should determine whether the guardian can access the student's information.

Example:

```text
canViewStudent = true
```

The backend must enforce this relationship.

---

# 21. Guardian Portal Preparation

The data model should be compatible with a future guardian portal.

Potential portal capabilities:

```text
View Student Profile
View Attendance
View Fees
View Payments
View Results
View Announcements
Receive Notifications
Download Permitted Documents
```

Do not implement portal functionality unless included in the current product scope.

---

# 22. Guardian Search

Guardian search should support:

```text
Name
Guardian ID
Phone
Email
Student Name
Student Admission Number
```

Search must be:

```text
Tenant-Scoped
Permission-Aware
Fast
```

---

# 23. Guardian List

The guardian list may display:

```text
Guardian Name
Primary Phone
Email
Linked Students
Status
Actions
```

On smaller screens, use responsive cards instead of forcing a wide table.

---

# 24. Guardian Detail Page

The guardian detail page should show:

```text
Guardian Header
 ↓
Contact Information
 ↓
Address
 ↓
Linked Students
 ↓
Relationships
 ↓
Communication History
 ↓
Documents if applicable
 ↓
Activity
```

---

# 25. Linked Students

The guardian profile should provide a clear list of associated students.

Example:

```text
Ahmed Khan
Class 8
Active

Sara Khan
Class 5
Active
```

Each student should be clickable if the current user has student-access permission.

---

# 26. Guardian → Student Navigation

From a guardian profile:

```text
Guardian
 ↓
Student
```

From a student profile:

```text
Student
 ↓
Guardian
```

Both directions should be supported.

---

# 27. Guardian Creation

Recommended flow:

```text
Create Guardian
 ↓
Basic Information
 ↓
Contact Information
 ↓
Relationship
 ↓
Link Student
 ↓
Review
 ↓
Save
```

The UI should support creating a guardian while registering a student.

---

# 28. Create Guardian During Student Registration

Student registration may allow:

```text
Create New Guardian
```

or:

```text
Select Existing Guardian
```

This prevents unnecessary duplicate guardian records.

---

# 29. Existing Guardian Matching

Before creating a new guardian, check likely matches using:

```text
Phone
Email
Name
Existing Student Relationship
```

The system should warn about likely duplicates.

---

# 30. Duplicate Guardian Warning

Example:

```text
A guardian with this phone number already exists.

Rahul Sharma
9876543210
Linked Students: 2
```

Possible actions:

```text
Use Existing Guardian
Create New Guardian
Cancel
```

depending on permissions.

---

# 31. Guardian Merge

If duplicate guardian records are discovered, a future merge workflow may be supported.

Example:

```text
Guardian A
Guardian B
 ↓
Review
 ↓
Merge
 ↓
Canonical Guardian
```

Merge functionality should not be implemented casually because relationships and history must be preserved.

---

# 32. Guardian Editing

Guardian information can be edited according to permissions.

Possible editable fields:

```text
Name
Phone
Email
Address
Occupation
Relationship Attributes
Communication Preferences
```

---

# 33. Relationship Editing

Changing:

```text
Father
```

to:

```text
Guardian
```

should modify the relationship, not create a duplicate guardian.

---

# 34. Guardian Removal

Removing a guardian from a student should remove the relationship.

It should not automatically delete the guardian entity.

Example:

```text
Guardian
 ↓
Relationship Removed
 ↓
Guardian Still Exists
```

if the guardian has other relationships.

---

# 35. Guardian Deletion

Permanent guardian deletion should be highly restricted.

If the guardian has:

```text
Students
Communication History
Documents
Audit References
```

hard deletion may be inappropriate.

Prefer archival or relationship removal.

---

# 36. Guardian Archive

Archiving a guardian should preserve historical relationships where required.

The system must define whether archived guardians remain visible in historical student records.

Recommended:

```text
Historical Relationship → Preserved
Active Selection → Archived Guardian Excluded
```

---

# 37. Guardian Communication

Authorized users may initiate communication with guardians.

Possible channels:

```text
SMS
Email
WhatsApp
In-App Notification
```

Only supported channels should be exposed.

---

# 38. Communication Recipient Resolution

When communicating about a student:

```text
Student
 ↓
Find Eligible Guardians
 ↓
Check Communication Permission
 ↓
Select Recipient
 ↓
Send
```

Do not automatically send to every linked guardian unless product rules say so.

---

# 39. Notification Preference

Future notification preferences may include:

```text
Attendance
Fees
Payments
Results
Announcements
Emergency
General Communication
```

Each guardian may have different preferences.

---

# 40. Opt-Out

If the product supports communication preferences, guardians should be able to opt out of non-essential communication where legally/operationally appropriate.

Emergency or mandatory institutional notifications may follow different rules.

---

# 41. Fee Contact

A guardian may be designated as a financial/billing contact.

Example:

```text
Student
 ↓
Billing Guardian
```

This is useful where one parent handles fees while another handles academics.

---

# 42. Academic Contact

Similarly, the institution may identify a preferred academic contact.

This should not be assumed to be the same as the billing contact.

---

# 43. Emergency Contact Information

Emergency information may include:

```text
Guardian Name
Relationship
Phone
Priority
```

If emergency contacts are modeled separately, follow the canonical contact schema.

---

# 44. Guardian Documents

Documents related to guardians may include:

```text
Identity Proof
Address Proof
Authorization Documents
Other Required Documents
```

Document access must be permission-controlled.

---

# 45. Guardian Privacy

Guardian information must respect:

```text
Tenant Isolation
Branch Scope
Role Permissions
Student Relationship
Portal Permissions
```

A user should not see guardian information merely because they know the guardian's ID.

---

# 46. Branch Scope

If guardians are connected to students in different branches, access must follow the user's authorized scope.

Example:

```text
Guardian
 ├── Student A → Branch A
 └── Student B → Branch B
```

A Branch A manager should not automatically gain access to Student B or Branch B information.

---

# 47. Cross-Branch Guardian

The same guardian may legitimately have students in multiple branches.

The guardian identity should remain shared if appropriate.

Authorization is applied to each linked student/resource.

---

# 48. Teacher Access

Teachers may see guardian information only when necessary for their assigned students.

Typical access:

```text
Assigned Student
 ↓
Authorized Guardian Contact
```

Avoid exposing unrelated family records.

---

# 49. Receptionist Access

Receptionists may require broader guardian access for:

```text
Registration
Phone Calls
Student Lookup
Front Desk Operations
```

but still remain within tenant and branch scope.

---

# 50. Accountant Access

Accountants may require:

```text
Guardian Name
Phone
Billing Contact
Payment Communication Information
```

They should not automatically receive unrelated guardian information.

---

# 51. Guardian Communication History

Where supported, show:

```text
Date
Channel
Recipient
Message Type
Status
Sender
```

This provides operational visibility without exposing unnecessary content.

---

# 52. Guardian Activity

Potential activity events:

```text
Guardian Created
Guardian Updated
Student Linked
Student Unlinked
Primary Status Changed
Communication Preference Changed
Guardian Archived
Guardian Restored
```

---

# 53. Auditability

Important relationship changes should be audited.

Examples:

```text
Primary Guardian Changed
Emergency Contact Changed
Communication Access Changed
Guardian Linked
Guardian Unlinked
Guardian Information Updated
```

---

# 54. Student Registration Relationship Flow

Complete flow:

```text
Student Registration
        ↓
Search Existing Guardian
        ↓
Found?
   ↙          ↘
 YES           NO
 ↓             ↓
Select       Create
Existing     Guardian
   ↓            ↓
   └─────┬──────┘
         ↓
Create Relationship
         ↓
Set Relationship Type
         ↓
Set Primary / Emergency
         ↓
Save
```

---

# 55. Guardian Profile UI

Recommended header:

```text
Guardian Name
Primary Phone
Email
Status
Number of Linked Students
```

Quick actions:

```text
Edit
Call
Message
Add Student
```

Only show actions allowed by permissions.

---

# 56. Student Guardian UI

Inside the student profile:

```text
Guardians
────────────────────
Father
Rahul Sharma
9876543210
Primary ✓

Mother
Priya Sharma
9876543211
```

Each guardian should expose relevant actions.

---

# 57. Mobile Guardian UI

On mobile, use cards:

```text
Guardian Name
Relationship
Phone
Primary Badge
Emergency Badge
```

Actions:

```text
Call
Message
View
```

Avoid overcrowding.

---

# 58. Guardian Filters

Useful filters:

```text
Branch
Relationship
Status
Primary Guardian
Emergency Contact
Communication Enabled
Number of Linked Students
```

Only expose filters that are operationally useful.

---

# 59. Guardian Import

If bulk import is supported:

```text
Upload
 ↓
Parse
 ↓
Validate
 ↓
Match Existing Guardians
 ↓
Preview
 ↓
Confirm
 ↓
Import
```

Guardian/student relationships must be validated before commit.

---

# 60. Guardian Export

Exports may include:

```text
Guardian Name
Phone
Email
Relationship
Linked Student
Branch
```

Sensitive exports require explicit authorization.

---

# 61. API Structure

Conceptual routes:

```text
/guardians
/guardians/:id
/guardians/:id/students

/students/:id/guardians
/students/:id/guardians/:guardianId
```

The exact routing architecture may differ.

---

# 62. Guardian Service

Recommended architecture:

```text
UI
 ↓
API
 ↓
Guardian Service
 ↓
Repository
 ↓
Database
```

Guardian relationship logic should live in the service/domain layer rather than being duplicated across screens.

---

# 63. Relationship Service

Relationship operations should validate:

```text
Guardian Exists
Student Exists
Tenant Match
Branch Rules
Relationship Type
Primary Constraint
Communication Permission
```

---

# 64. Transactional Operations

Operations that modify multiple records should use transactions where required.

Example:

```text
Create Guardian
+
Create Guardian Relationship
+
Set Primary Guardian
+
Audit Event
```

These should not leave inconsistent partial state.

---

# 65. Guardian Search Security

Every search must automatically respect:

```text
Tenant
Branch
Permission
```

Do not allow unrestricted global guardian searches from tenant-facing interfaces.

---

# 66. Performance

Guardian search and relationship lookup should be optimized.

Useful indexes may include:

```text
Phone
Email
Name
Guardian ID
Student ID
Relationship Student ID
Relationship Guardian ID
```

Follow the canonical database schema.

---

# 67. Data Integrity

The system must prevent:

```text
Invalid Guardian ID
Invalid Student ID
Cross-Tenant Relationship
Duplicate Invalid Primary Guardian
Broken Relationship
```

---

# 68. Relationship Constraints

Where applicable:

```text
Guardian must exist
Student must exist
Guardian and Student must belong to compatible tenant context
Relationship type must be valid
```

---

# 69. No Accidental Cascade Deletion

Deleting a student should not automatically delete a guardian.

Deleting a guardian relationship should not automatically delete the student.

Deleting one sibling relationship should not affect another sibling relationship.

---

# 70. Error Handling

Use clear errors.

Example:

```text
This guardian cannot be removed because they are the primary contact for an active student.
```

instead of exposing database constraint errors.

---

# 71. Empty State

Example:

```text
No guardians added yet.
```

Possible action:

```text
+ Add Guardian
```

if the user has permission.

---

# 72. Guardian Module Checklist

Antigravity must verify:

```text
☐ Guardian CRUD
☐ Guardian ID
☐ Contact information
☐ Address
☐ Relationship types
☐ Multiple guardians
☐ Multiple students per guardian
☐ Primary guardian
☐ Emergency contact
☐ Communication permission
☐ Billing contact
☐ Guardian search
☐ Guardian filters
☐ Guardian detail
☐ Student ↔ Guardian navigation
☐ Duplicate detection
☐ Guardian archive
☐ Relationship removal
☐ Communication history
☐ Audit events
☐ Tenant isolation
☐ Branch isolation
☐ Permission checks
☐ Mobile responsive UI
```

---

# 73. Definition of Done

The module is complete when an authorized user can:

```text
Create Guardian
      ↓
Link Guardian to Student
      ↓
Set Relationship
      ↓
Set Primary / Emergency Status
      ↓
Manage Contact Information
      ↓
View Linked Students
      ↓
Communicate With Guardian
      ↓
Maintain Relationship History
      ↓
Archive Safely
```

without compromising:

```text
Tenant Isolation
Branch Isolation
Privacy
Authorization
Data Integrity
Auditability
```

---

# 74. Final Principle

> **Guardians are independent entities connected to students through explicit relationships. The system must support multiple guardians per student and multiple students per guardian without duplicating identity data. Guardian access, communication, and visibility must always respect tenant, branch, role, permission, and relationship scope. Removing a relationship must never accidentally delete the underlying guardian or student.**

---

# 75. Next Document

```text
47-STAFF-TEACHER-MANAGEMENT.md
```

This will define the complete **staff and teacher management system**, including:

```text
Staff Profiles
Teacher Profiles
Employee IDs
Departments
Designations
Employment Status
Branch Assignment
Teacher ↔ Subject
Teacher ↔ Class
Teacher ↔ Batch
Teacher ↔ Students
Attendance Responsibility
Staff Documents
Staff Search
Staff Permissions
Staff Lifecycle
```

---

# END OF DOCUMENT
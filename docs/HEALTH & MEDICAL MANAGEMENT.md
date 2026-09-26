# HEALTH & MEDICAL MANAGEMENT
# School + Coaching Centre ERP SaaS

**Document:** `61-HEALTH-MEDICAL-MANAGEMENT.md`  
**Version:** 1.0  
**Status:** Canonical Health & Medical Management Specification  
**Previous Document:** `60-HOSTEL-MESS-MANAGEMENT.md`  
**Next Document:** `62-LIBRARY-MANAGEMENT.md`

---

# 1. Purpose

This module manages student and institutional health-related operations.

It covers:

```text
Health Profiles
Medical Records
School Clinic
Nurse / Medical Staff
Medical Visits
Appointments
Symptoms
Diagnosis
Treatment
Medication
Prescriptions
First Aid
Emergency Cases
Health Screening
Vaccination Records
Medical Documents
Allergies
Medical Restrictions
Parent / Guardian Notifications
Health Reports
```

This module handles **sensitive health information** and therefore requires stricter privacy and access controls than ordinary ERP modules.

It must support:

```text
School
Coaching Centre
Hostel
Multi-Branch Institution
Multi-Tenant SaaS
```

---

# 2. Core Principle

Health information must have a clear source of truth.

The system must distinguish between:

```text
Student Health Profile
Medical Visit
Medical Record
Diagnosis
Treatment
Medication
Prescription
Emergency
Health Screening
Vaccination
Medical Document
```

Medical information must never be exposed merely because a user can view the student's academic profile.

---

# 3. Health Profile

A student's health profile provides the authorized medical information required for institutional care.

Conceptually:

```text
StudentHealthProfile
--------------------
id
studentId
bloodGroup
height
weight
allergyStatus
specialRequirements
emergencyNotes
status
```

Only authorized users should access this information.

---

# 4. Student Integration

The health module must reference the central Student module.

Do not duplicate:

```text
Student Name
Student ID
Class
Section
Branch
Guardian Identity
```

The Student module remains the source of truth.

---

# 5. Medical Information Sensitivity

Health information may include:

```text
Diagnosis
Medication
Allergy
Medical Condition
Vaccination
Treatment
Emergency Information
Medical Documents
```

These records must be treated as sensitive data.

---

# 6. Access Control

Access must be explicitly permission-based.

Example permissions:

```text
health.read
health.create
health.update
health.delete
health.medical_visit
health.prescription
health.medication
health.emergency
health.screening
health.vaccination
health.documents
health.reports
health.export
```

---

# 7. Role-Based Medical Access

Potential authorized roles:

```text
Doctor
Nurse
Medical Officer
School Administrator
Authorized Counselor
Designated Staff
```

A teacher should not automatically receive complete medical access.

---

# 8. Health Profile Fields

Depending on institution requirements:

```text
Blood Group
Height
Weight
Allergies
Dietary Restrictions
Emergency Medical Notes
Known Conditions
Special Medical Instructions
```

Sensitive fields must be permission controlled.

---

# 9. Blood Group

Possible values:

```text
A+
A-
B+
B-
AB+
AB-
O+
O-
UNKNOWN
```

Do not assume or infer a student's blood group.

---

# 10. Allergy Information

Allergy information may include:

```text
Food Allergy
Medication Allergy
Environmental Allergy
Other
```

Detailed allergy information must only be visible to authorized users.

---

# 11. Allergy Record

Conceptually:

```text
Allergy
-------
id
studentId
type
substance
severity
reaction
notes
status
```

---

# 12. Allergy Severity

Possible:

```text
MILD
MODERATE
SEVERE
CRITICAL
UNKNOWN
```

---

# 13. Allergy Status

Possible:

```text
ACTIVE
INACTIVE
HISTORICAL
```

---

# 14. Medical Condition

A student's known medical condition may be recorded where institutionally necessary.

Conceptually:

```text
MedicalCondition
----------------
id
studentId
condition
status
diagnosedAt
notes
```

Do not unnecessarily collect information that is not required for institutional care.

---

# 15. Condition Status

Possible:

```text
ACTIVE
RESOLVED
HISTORICAL
UNKNOWN
```

---

# 16. Medical Visit

A medical visit represents an interaction between a student and medical staff.

Conceptually:

```text
MedicalVisit
------------
id
studentId
clinicId
visitDate
visitTime
reason
symptoms
diagnosis
treatment
status
recordedBy
```

---

# 17. Visit Reasons

Examples:

```text
Fever
Headache
Injury
Stomach Pain
Routine Check
First Aid
Follow-Up
Emergency
Other
```

The institution may configure the list.

---

# 18. Visit Status

Possible:

```text
OPEN
COMPLETED
CANCELLED
FOLLOW_UP_REQUIRED
```

---

# 19. Clinic

A school or institution may operate one or more clinics.

Conceptually:

```text
Clinic
------
id
branchId
name
location
status
```

---

# 20. Clinic Status

Possible:

```text
ACTIVE
INACTIVE
TEMPORARILY_CLOSED
CLOSED
```

---

# 21. Clinic Operating Hours

Example:

```text
Monday
9:00 AM - 5:00 PM

Tuesday
9:00 AM - 5:00 PM
```

Operating hours should be configurable.

---

# 22. Medical Staff

Medical staff may include:

```text
Doctor
Nurse
Medical Officer
First Aid Staff
Clinic Assistant
```

Where they are institution employees, reference the central Staff module.

---

# 23. Medical Staff Assignment

Conceptually:

```text
MedicalStaffAssignment
----------------------
staffId
clinicId
effectiveFrom
effectiveTo
status
```

---

# 24. Appointment

Students may have scheduled medical appointments.

Conceptually:

```text
MedicalAppointment
------------------
id
studentId
clinicId
providerId
appointmentDate
startTime
endTime
reason
status
```

---

# 25. Appointment Status

Possible:

```text
SCHEDULED
CONFIRMED
COMPLETED
CANCELLED
NO_SHOW
RESCHEDULED
```

---

# 26. Appointment Workflow

```text
Request
 ↓
Schedule
 ↓
Confirm
 ↓
Medical Visit
 ↓
Complete
```

---

# 27. Medical Symptoms

Symptoms may be recorded during a visit.

Examples:

```text
Fever
Cough
Cold
Headache
Vomiting
Pain
Dizziness
Fatigue
Injury
Other
```

---

# 28. Symptom Entity

Conceptually:

```text
MedicalSymptom
--------------
id
visitId
name
severity
notes
```

---

# 29. Symptom Severity

Possible:

```text
MILD
MODERATE
SEVERE
CRITICAL
```

---

# 30. Diagnosis

A medical professional may record a diagnosis where appropriate.

Conceptually:

```text
Diagnosis
---------
id
visitId
name
notes
diagnosedBy
diagnosedAt
```

Diagnosis information is highly sensitive.

---

# 31. Treatment

Treatment records describe care provided during or after the visit.

Conceptually:

```text
Treatment
---------
id
visitId
description
instructions
providedBy
date
```

---

# 32. First Aid

The system must support first-aid records.

Examples:

```text
Minor Injury
Cut
Bruise
Sprain
Headache
Minor Burn
Other
```

---

# 33. First-Aid Record

Conceptually:

```text
FirstAidRecord
--------------
id
studentId
date
incident
treatment
staffId
followUpRequired
notes
```

---

# 34. Emergency Case

An emergency case represents an urgent medical situation.

Examples:

```text
Severe Injury
Unconsciousness
Severe Allergic Reaction
Breathing Difficulty
Major Accident
Other Emergency
```

---

# 35. Emergency Entity

Conceptually:

```text
MedicalEmergency
----------------
id
studentId
date
time
location
description
severity
actionTaken
referredTo
status
recordedBy
```

---

# 36. Emergency Severity

Possible:

```text
HIGH
CRITICAL
```

The institution may configure additional severity levels.

---

# 37. Emergency Workflow

```text
Emergency Detected
 ↓
Immediate Care
 ↓
Guardian Notification
 ↓
External Medical Referral if required
 ↓
Follow-Up
 ↓
Case Closure
```

---

# 38. Emergency Contact Integration

Emergency contacts must come from the central Student/Guardian records.

Do not create duplicate guardian identity records.

---

# 39. Parent / Guardian Notification

Depending on policy, guardians may be notified when:

```text
Emergency Occurs
Student Requires External Treatment
Follow-Up Is Required
Medication Requires Attention
Other Configured Event
```

---

# 40. Notification Record

Conceptually:

```text
MedicalNotification
-------------------
studentId
eventType
recipient
channel
sentAt
status
```

Use the centralized notification system.

---

# 41. External Referral

A student may be referred to an external healthcare provider.

Conceptually:

```text
MedicalReferral
---------------
id
studentId
visitId
providerName
reason
referredAt
status
notes
```

---

# 42. Referral Status

Possible:

```text
RECOMMENDED
REFERRED
COMPLETED
CANCELLED
```

---

# 43. Hospital / Provider

External provider details may include:

```text
Provider Name
Hospital / Clinic
Contact
Address
Referral Date
```

Only authorized users should access this information.

---

# 44. Medication

The system may record medication administered or prescribed under appropriate institutional policy.

Conceptually:

```text
Medication
----------
id
name
strength
form
status
```

---

# 45. Medication Record

A student's medication event may be represented as:

```text
MedicationAdministration
------------------------
id
studentId
visitId
medicationId
dose
route
administeredAt
administeredBy
notes
```

---

# 46. Medication Route

Possible:

```text
ORAL
TOPICAL
INHALATION
INJECTION
OTHER
```

The institution may configure this list.

---

# 47. Prescription

A prescription represents medication instructions from an authorized medical professional.

Conceptually:

```text
Prescription
------------
id
studentId
visitId
prescriberId
date
status
instructions
```

---

# 48. Prescription Item

Conceptually:

```text
PrescriptionItem
----------------
prescriptionId
medicationId
dose
frequency
duration
route
instructions
```

---

# 49. Prescription Status

Possible:

```text
ACTIVE
COMPLETED
CANCELLED
EXPIRED
```

---

# 50. Medication Schedule

Where institutional medication administration is supported:

```text
Morning
Afternoon
Evening
Night
Custom
```

The schedule must respect authorized medical instructions.

---

# 51. Medication Administration

When medication is administered, record:

```text
Student
Medication
Dose
Time
Administered By
Notes
```

This record must not be silently deleted.

---

# 52. Medication Error

If an administration error occurs, record it through an auditable incident workflow.

Never overwrite the original administration event.

---

# 53. Health Screening

The institution may conduct periodic health screenings.

Examples:

```text
Height
Weight
BMI
Vision
Hearing
Dental
General Examination
Other
```

---

# 54. Screening Event

Conceptually:

```text
HealthScreening
---------------
id
studentId
screeningType
date
performedBy
status
notes
```

---

# 55. Screening Results

Results may contain:

```text
Measurement
Result
Observation
Recommendation
Follow-Up Required
```

---

# 56. Height

Store height with an explicit unit.

Example:

```text
Height:
165 cm
```

Avoid storing ambiguous values.

---

# 57. Weight

Store weight with an explicit unit.

Example:

```text
Weight:
58 kg
```

---

# 58. BMI

BMI may be calculated when valid height and weight measurements are available.

Conceptually:

```text
BMI =
Weight in kg
÷
Height in meters²
```

The system should not present medical conclusions from BMI without appropriate context.

---

# 59. Vision Screening

Possible results:

```text
NORMAL
REQUIRES_REVIEW
REFERRED
```

Detailed medical interpretation belongs to qualified medical staff.

---

# 60. Hearing Screening

Possible results:

```text
NORMAL
REQUIRES_REVIEW
REFERRED
```

---

# 61. Dental Screening

Possible results:

```text
NORMAL
REQUIRES_REVIEW
REFERRED
```

---

# 62. Vaccination Record

Where the institution tracks vaccination information:

```text
VaccinationRecord
-----------------
id
studentId
vaccineName
dose
date
provider
notes
```

---

# 63. Vaccination Status

Possible:

```text
COMPLETED
PARTIAL
PENDING
UNKNOWN
```

---

# 64. Vaccination Document

Supporting vaccination documents may be uploaded.

Documents must follow the centralized document/file storage system.

---

# 65. Medical Documents

Examples:

```text
Doctor Note
Prescription
Vaccination Certificate
Medical Report
Referral Letter
Other
```

---

# 66. Document Metadata

Conceptually:

```text
MedicalDocument
---------------
id
studentId
documentType
fileReference
uploadedBy
uploadedAt
status
```

The actual file should use centralized document storage.

---

# 67. Document Access

Medical documents require stronger access restrictions than ordinary student documents.

---

# 68. Document Download

Downloading/exporting medical documents must require appropriate permission.

Where possible, audit:

```text
Who
What
When
```

---

# 69. Follow-Up

A medical visit may require follow-up.

Conceptually:

```text
MedicalFollowUp
---------------
visitId
followUpDate
reason
assignedTo
status
notes
```

---

# 70. Follow-Up Status

Possible:

```text
PENDING
SCHEDULED
COMPLETED
CANCELLED
OVERDUE
```

---

# 71. Medical Restriction

Authorized medical staff may record restrictions relevant to institutional activities.

Examples:

```text
Physical Activity Restriction
Sports Restriction
Food Restriction
Temporary Activity Restriction
```

---

# 72. Restriction Entity

Conceptually:

```text
MedicalRestriction
------------------
id
studentId
type
startDate
endDate
instructions
status
createdBy
```

---

# 73. Restriction Visibility

A restriction may need to be visible to relevant staff without exposing the student's complete medical record.

Example:

```text
Sports:
Temporarily Restricted
```

without exposing unrelated diagnosis details.

---

# 74. Hostel Integration

Where hostel management exists, authorized medical information may affect:

```text
Emergency Handling
Special Accommodation
Medical Restrictions
Meal/Diet Requirements
```

Do not duplicate medical records inside Hostel.

---

# 75. Mess Integration

Where a medical dietary requirement exists, the Mess module may receive the minimum necessary instruction.

Example:

```text
Student requires approved dietary restriction.
```

The Mess module should not automatically receive the student's complete medical history.

---

# 76. Transport Integration

In emergencies or special transport cases, only the minimum required medical information should be shared with authorized transport staff.

---

# 77. Academic Integration

Teachers may only receive medical restrictions or alerts that are necessary for student safety and explicitly authorized.

---

# 78. Attendance Integration

A medical event may optionally generate an approved attendance/leave workflow.

The Health module should not directly rewrite academic attendance without integration with the central Attendance module.

---

# 79. Medical Leave

If medical leave is supported:

```text
Medical Event
 ↓
Leave Recommendation
 ↓
Approval Workflow
 ↓
Attendance Module
```

The central Leave/Attendance module remains the source of truth for attendance.

---

# 80. Health Dashboard

Authorized medical staff may see:

```text
Today's Visits
Open Emergencies
Pending Follow-Ups
Medication Due
Recent First Aid
Upcoming Screenings
Vaccination Pending
Open Referrals
```

---

# 81. Student Medical Dashboard

Authorized users may see:

```text
Health Profile
Recent Visits
Active Restrictions
Active Medications
Allergies
Vaccinations
Pending Follow-Ups
Medical Documents
```

---

# 82. Medical Search

Authorized users may search by:

```text
Student
Student ID
Visit Date
Clinic
Medical Staff
Appointment
Emergency
Screening
```

Search results must respect medical permissions.

---

# 83. Medical Filters

Useful filters:

```text
Date
Clinic
Visit Status
Emergency Status
Follow-Up Status
Screening Type
Vaccination Status
Restriction Status
```

---

# 84. Emergency Dashboard

Show:

```text
Active Emergencies
Recent Emergencies
Pending Referrals
Pending Guardian Notifications
Follow-Up Required
```

---

# 85. Medical Reports

Possible reports:

```text
Medical Visit Report
Emergency Report
First Aid Report
Medication Administration Report
Prescription Report
Health Screening Report
Vaccination Report
Referral Report
Follow-Up Report
Medical Restriction Report
Clinic Activity Report
```

---

# 86. Health Screening Report

Example:

```text
Student
Screening Type
Date
Result
Recommendation
Follow-Up
```

Only authorized medical users should access detailed health results.

---

# 87. Medical Visit Report

Example:

```text
Student
Visit Date
Reason
Provider
Treatment
Follow-Up
Status
```

Sensitive information must be permission controlled.

---

# 88. Emergency Report

Example:

```text
Date
Student
Location
Emergency Type
Action Taken
Referral
Guardian Notification
Status
```

---

# 89. Clinic Utilization

Possible metrics:

```text
Total Visits
Unique Students
Visits by Type
Visits by Day
Average Visits per Day
Emergency Count
Follow-Up Count
```

---

# 90. Health Trend Reports

Aggregated reports may identify operational trends.

Examples:

```text
Common Visit Reasons
Common First-Aid Events
Seasonal Patterns
Screening Completion
Vaccination Completion
```

Individual medical information should not be exposed unnecessarily in aggregate reports.

---

# 91. Data Export

Medical exports require explicit permission.

Possible export formats:

```text
CSV
PDF
```

depending on system capabilities.

Every export should be auditable.

---

# 92. Audit Trail

Important events:

```text
Health Profile Created
Health Profile Updated
Medical Visit Created
Medical Visit Updated
Diagnosis Added
Treatment Added
Prescription Created
Medication Administered
Emergency Created
Emergency Updated
Screening Created
Vaccination Added
Medical Document Uploaded
Medical Document Viewed
Medical Document Downloaded
Restriction Created
Restriction Updated
Referral Created
Follow-Up Created
```

---

# 93. Immutable Medical Events

Historical medical events should generally not be overwritten.

If correction is necessary:

```text
Original Record
 ↓
Correction
 ↓
Audit Trail
```

The system should preserve the original event history.

---

# 94. Sensitive Access Logging

For highly sensitive records, log access events where appropriate:

```text
User
Record
Action
Timestamp
Purpose / Context
```

---

# 95. Tenant Isolation

All health data must be scoped by tenant.

Tenant A must never access Tenant B's:

```text
Medical Records
Health Profiles
Prescriptions
Emergencies
Vaccinations
Medical Documents
```

---

# 96. Branch Isolation

Branch-scoped medical staff must only access authorized branches and students.

---

# 97. Minimum Necessary Access

Users should receive only the medical information necessary for their role.

Example:

```text
Teacher:
Activity Restriction

Nurse:
Relevant Medical Record

Mess Staff:
Approved Dietary Instruction

Administrator:
Operational Information
```

This is preferable to exposing the complete medical profile.

---

# 98. Parent / Guardian Access

Where enabled, guardians may see selected information such as:

```text
Medical Visit Summary
Emergency Notification
Prescription / Instructions
Screening Results
Vaccination Information
```

The institution must control exactly which records are visible.

---

# 99. Student Access

If student self-service is enabled, students may access permitted records such as:

```text
Appointments
Visit History
Selected Health Information
Medical Documents
```

Sensitive information must follow institution policy.

---

# 100. Consent / Authorization

Where legally or institutionally required, medical information workflows may require consent or authorization.

Consent records should be stored in the appropriate consent/compliance system.

---

# 101. Data Retention

Medical records should follow institutional and applicable legal retention policies.

Do not casually delete:

```text
Emergency Records
Medical Visits
Prescriptions
Medication Administration
Vaccination Records
Screenings
Medical Documents
```

---

# 102. Deletion

Deletion of medical records must be heavily restricted.

Where records must be removed, use the appropriate compliant archival/deletion workflow.

---

# 103. Notifications

Possible notifications:

```text
Appointment Reminder
Emergency Alert
Guardian Notification
Follow-Up Reminder
Vaccination Reminder
Screening Reminder
Medication Reminder
Referral Reminder
```

Use the centralized notification system.

---

# 104. Error Handling

Errors must be understandable.

Example:

```text
This student is not available at the selected clinic time.
```

Instead of:

```text
MedicalAppointmentConflictException.
```

Another example:

```text
You do not have permission to access this medical record.
```

---

# 105. Appointment Conflict Prevention

The system must prevent overlapping appointments for the same medical provider where the schedule does not permit concurrency.

---

# 106. Medication Record Integrity

A medication administration record must not be duplicated accidentally.

Example:

```text
Student A
Medication X
10:00 AM
```

A repeated request must not silently create another administration event.

---

# 107. Emergency Concurrency

Multiple authorized users may update an emergency simultaneously.

The system must prevent conflicting updates and preserve audit history.

---

# 108. Date & Time

Use the institution's configured timezone.

Store timestamps for:

```text
Visits
Appointments
Emergencies
Medication Administration
Screenings
Vaccinations
Notifications
Follow-Ups
Documents
```

---

# 109. Privacy by Default

Medical information should be private by default.

Do not expose medical details in:

```text
General Student Search
Teacher Dashboards
Public Reports
General Exports
Standard Student Lists
```

unless specifically authorized.

---

# 110. Empty States

Examples:

```text
No medical visits found.
```

```text
No upcoming appointments.
```

```text
No active medical restrictions.
```

```text
No pending follow-ups.
```

```text
No vaccination records found.
```

---

# 111. Loading States

Provide loading states for:

```text
Medical Dashboard
Student Health Profile
Medical Visits
Appointments
Emergencies
Medication
Screenings
Vaccinations
Documents
Reports
```

---

# 112. Permission-Aware UI

Example:

```text
No health.medical_visit
→ Hide medical visit creation

No health.prescription
→ Hide prescription actions

No health.documents
→ Hide medical documents

No health.export
→ Hide export controls
```

Backend authorization remains mandatory.

---

# 113. Integration Architecture

The Health module integrates with:

```text
Student
Staff
Guardian
Attendance
Leave
Hostel
Mess
Transport
Notifications
Documents
Finance where applicable
```

Each existing module remains the source of truth for its own domain.

---

# 114. Finance Integration

If the institution charges for external medical services or clinic services:

```text
Health
 ↓
Finance
 ↓
Invoice / Charge
 ↓
Payment
```

Health must not create an independent accounting ledger.

---

# 115. Document Storage Integration

Medical documents should use centralized secure document storage.

The Health module stores references and metadata rather than creating an isolated file-storage architecture.

---

# 116. Notification Integration

Medical alerts and reminders must use the centralized notification service.

---

# 117. Definition of Done

The Health & Medical module is complete when authorized users can:

```text
Create Health Profiles
      ↓
Manage Clinics
      ↓
Manage Medical Staff
      ↓
Schedule Appointments
      ↓
Record Medical Visits
      ↓
Record Symptoms
      ↓
Record Diagnosis
      ↓
Record Treatment
      ↓
Manage Medication
      ↓
Create Prescriptions
      ↓
Record First Aid
      ↓
Manage Emergencies
      ↓
Track Referrals
      ↓
Manage Follow-Ups
      ↓
Conduct Health Screenings
      ↓
Track Vaccinations
      ↓
Manage Medical Documents
      ↓
Manage Restrictions
      ↓
Notify Guardians
      ↓
Generate Authorized Reports
```

while preserving:

```text
Strict Privacy
Tenant Isolation
Branch Isolation
Role-Based Access
Minimum Necessary Access
Historical Integrity
Medical Event Auditability
Document Security
Notification Auditability
Financial Integrity
```

---

# 118. Final Principle

> **Health data is sensitive data. The system must treat medical records as a protected domain, expose only the minimum information required for each role, preserve historical medical events, and never allow ordinary student access to become automatic medical access.**

---

# 119. Next Document

```text
62-LIBRARY-MANAGEMENT.md
```

The next module will define:

```text
Library
Branches
Sections
Books
Book Copies
Authors
Publishers
Categories
ISBN
Book Acquisition
Book Issue
Book Return
Renewal
Reservations
Fines
Lost Books
Damaged Books
Digital Resources
Library Members
Library Cards
Circulation
Inventory
Reports
```

---

# END OF DOCUMENT
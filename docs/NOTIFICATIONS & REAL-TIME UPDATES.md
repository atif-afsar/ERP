# NOTIFICATIONS & REAL-TIME UPDATES
# School + Coaching Centre ERP SaaS

**Document:** `26-NOTIFICATIONS-AND-REAL-TIME-UPDATES.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `25-IMPORT-AND-BULK-OPERATIONS.md`  
**Next Document:** `27-INTEGRATIONS-AND-EXTERNAL-SERVICES.md`

---

# 1. Purpose

This document defines the notification and real-time communication architecture for the ERP.

The system should be able to inform users about important events without requiring them to manually refresh every screen.

Supported notification channels may include:

```text
In-App
Email
SMS
WhatsApp
Push Notification
Real-Time UI Updates
```

External communication providers are integration layers and must not become tightly coupled to core ERP business logic.

---

# 2. Core Principle

Business events should generate notifications through a centralized notification system.

```text
Business Event
      ↓
Event / Notification Service
      ↓
Determine Recipients
      ↓
Check Preferences
      ↓
Create Notification
      ↓
Delivery Channel
      ↓
Delivery Status
      ↓
Audit / Logs
```

---

# 3. Notification Types

Notifications should be classified.

```text
SYSTEM
ACADEMIC
ATTENDANCE
FINANCE
ADMISSION
HOMEWORK
EXAM
ANNOUNCEMENT
SECURITY
ADMINISTRATIVE
```

---

# 4. Notification Channels

The platform may support:

```text
IN_APP
EMAIL
SMS
WHATSAPP
PUSH
```

Not every notification needs every channel.

---

# 5. In-App Notifications

In-app notifications are the primary internal notification mechanism.

Example:

```text
🔔 Notifications

2 new notifications

Attendance Alert
Rahul Kumar was marked absent today.

Fee Reminder
3 students have overdue fees.
```

---

# 6. Notification Center

The application should provide a central notification center.

Possible UI:

```text
┌────────────────────────────────────┐
│ Notifications                      │
├────────────────────────────────────┤
│ ● Fee payment received             │
│   5 minutes ago                    │
│                                    │
│ ● New homework assigned            │
│   1 hour ago                       │
│                                    │
│ ○ Exam schedule updated             │
│   Yesterday                        │
├────────────────────────────────────┤
│ Mark all as read                   │
└────────────────────────────────────┘
```

---

# 7. Notification Data Model

Conceptually:

```text
Notification
 ├── id
 ├── tenant_id
 ├── recipient_id
 ├── type
 ├── title
 ├── message
 ├── entity_type
 ├── entity_id
 ├── channel
 ├── status
 ├── read_at
 ├── created_at
 └── expires_at
```

The exact schema must follow the project's canonical data model.

---

# 8. Tenant Isolation

Every notification must belong to the correct tenant.

```text
Tenant A
   ↓
Tenant A Notifications

Tenant B
   ↓
Tenant B Notifications
```

Cross-tenant notification access must never be possible.

---

# 9. Recipient Resolution

When an event occurs:

```text
Event
 ↓
Determine affected user
 ↓
Determine notification recipients
 ↓
Check permissions/preferences
 ↓
Deliver
```

---

# 10. Example: Attendance Event

```text
Teacher Marks Student Absent
          ↓
Attendance Event
          ↓
Determine Parent
          ↓
Create Notification
          ↓
Parent receives notification
```

---

# 11. Example: Fee Payment

```text
Payment Recorded
       ↓
Payment Event
       ↓
Notification Service
       ↓
Relevant Admin/Parent/Student
       ↓
Notification
```

---

# 12. Example: Homework

```text
Teacher Publishes Homework
       ↓
Homework Event
       ↓
Find Students
       ↓
Find Parents where applicable
       ↓
Create Notifications
```

---

# 13. Example: Exam Schedule

```text
Exam Schedule Published
       ↓
Affected Students
       ↓
Affected Parents
       ↓
Notification
```

---

# 14. Notification Preferences

Users should be able to control non-mandatory notifications.

Example:

```text
Notification Preferences

Attendance
☑ In-App
☑ Email
☐ SMS

Homework
☑ In-App
☑ Email

Announcements
☑ In-App
☐ Email
```

---

# 15. Mandatory Notifications

Certain security or legally/business-critical notifications may not be disableable.

Examples may include:

```text
Account Security
Password Reset
Important System Alerts
```

The final list should be configurable by the product.

---

# 16. User Preferences

Conceptually:

```text
NotificationPreference
 ├── user_id
 ├── notification_type
 ├── channel
 └── enabled
```

---

# 17. Default Preferences

New users should receive safe defaults.

Example:

```text
In-App:
Enabled

Email:
Enabled for important notifications

SMS:
Disabled unless required
```

The exact defaults should be determined by product requirements and communication costs.

---

# 18. Role-Based Notifications

Different roles receive different notifications.

Example:

```text
Student
→ Homework
→ Exams
→ Attendance

Parent
→ Attendance
→ Fees
→ Announcements

Teacher
→ Assigned Classes
→ Homework
→ Attendance

Admin
→ Finance
→ Admissions
→ System Alerts
```

---

# 19. Permission-Aware Notifications

Notification creation must not accidentally expose data that the recipient could not normally access.

Before delivery:

```text
Recipient
   ↓
Authorization Scope
   ↓
Notification Data
```

must be evaluated.

---

# 20. Notification Templates

Messages should use reusable templates.

Conceptually:

```text
Template
 ├── type
 ├── channel
 ├── language
 ├── subject
 └── body
```

---

# 21. Example Template

```text
Type:
ATTENDANCE_ABSENCE

Title:
Attendance Alert

Body:
{student_name} was marked absent on {date}.
```

Variables must be safely substituted by the server.

---

# 22. Template Validation

Templates should reject unsupported variables.

Example:

```text
{unknown_variable}
```

must not silently produce broken messages.

---

# 23. Email Notifications

Email should be handled through a dedicated delivery service.

```text
ERP
 ↓
Notification Service
 ↓
Email Provider
 ↓
Recipient
```

The core ERP should not contain provider-specific logic everywhere.

---

# 24. Email Subjects

Examples:

```text
Attendance Alert
Fee Payment Confirmation
New Homework Assigned
Exam Schedule Published
```

---

# 25. Email Failure

If email delivery fails:

```text
Notification
    ↓
Delivery Failed
    ↓
Retry
```

if the failure is transient.

---

# 26. SMS Notifications

SMS should use an external provider.

```text
ERP
 ↓
Notification Service
 ↓
SMS Provider
 ↓
Mobile Number
```

Provider credentials must never be exposed to the frontend.

---

# 27. WhatsApp Notifications

WhatsApp should be implemented through an approved external provider/API.

The ERP should maintain an abstraction:

```text
Notification Service
       ↓
WhatsApp Adapter
       ↓
Provider
```

This allows providers to change without rewriting business logic.

---

# 28. Push Notifications

Where supported:

```text
ERP
 ↓
Push Service
 ↓
Device
```

Device tokens must be securely associated with the authenticated user.

---

# 29. Device Tokens

Conceptually:

```text
UserDevice
 ├── id
 ├── user_id
 ├── platform
 ├── push_token
 ├── last_seen_at
 └── active
```

Expired or invalid tokens should be removed/deactivated.

---

# 30. Multiple Devices

A user may have:

```text
Laptop
Android Phone
iPhone
Tablet
```

Notifications should support multiple active devices where the channel supports it.

---

# 31. Real-Time Updates

Real-time updates allow the UI to change without a full page refresh.

Examples:

```text
New Notification
Payment Updated
Attendance Updated
Import Progress
Export Completed
Announcement Published
```

---

# 32. Real-Time Architecture

```text
Backend Event
      ↓
Event Bus / Realtime Service
      ↓
WebSocket / SSE
      ↓
Connected Client
      ↓
UI Update
```

---

# 33. WebSocket

WebSockets may be used when bidirectional persistent communication is useful.

Possible use cases:

```text
Live Notifications
Live Dashboards
Job Progress
Chat-like Features
```

---

# 34. Server-Sent Events

SSE may be appropriate for primarily server-to-client updates.

Example:

```text
Server
  ↓
Event Stream
  ↓
Browser
```

---

# 35. Polling

Polling is acceptable where real-time infrastructure is unnecessary.

Example:

```text
GET /notifications/unread-count
```

every reasonable interval.

Do not poll excessively.

---

# 36. Real-Time Authorization

A connected client must only receive events belonging to its authorized scope.

Example:

```text
Branch A User
      ↓
Branch A Events
```

not:

```text
Branch B Events
```

---

# 37. Channel Authorization

When establishing a real-time connection:

```text
Authenticate
 ↓
Identify User
 ↓
Determine Tenant
 ↓
Determine Scope
 ↓
Subscribe to Authorized Channels
```

---

# 38. Tenant Channels

Conceptually:

```text
tenant:{tenant_id}
```

but clients must never be trusted to choose an arbitrary tenant ID.

The server must derive tenant scope from authentication.

---

# 39. User Channels

Possible:

```text
user:{user_id}
```

Again, the server must determine the user's identity.

---

# 40. Branch Channels

Where appropriate:

```text
branch:{branch_id}
```

must only deliver events to users authorized for that branch.

---

# 41. Notification Unread Count

The UI should display:

```text
🔔 5
```

The count should come from server-side state.

---

# 42. Mark as Read

Possible API:

```text
POST /notifications/{id}/read
```

The backend must verify the notification belongs to the authenticated user.

---

# 43. Mark All as Read

Possible:

```text
POST /notifications/read-all
```

Only notifications belonging to the authenticated user should be affected.

---

# 44. Notification Pagination

The notification center should be paginated.

Example:

```text
Showing 1–20
```

Do not load thousands of notifications into the browser at once.

---

# 45. Notification Retention

Old notifications should follow a defined retention policy.

Possible lifecycle:

```text
New
 ↓
Read
 ↓
Expired
 ↓
Deleted/Archived
```

The exact policy should be configurable.

---

# 46. Notification Expiration

Some notifications become irrelevant.

Example:

```text
Import completed
```

may remain useful for a limited period.

The system may use:

```text
expires_at
```

where appropriate.

---

# 47. Delivery Status

For external channels:

```text
QUEUED
SENDING
SENT
DELIVERED
FAILED
```

may be tracked depending on provider capabilities.

---

# 48. Retry Strategy

Transient delivery failures should be retried.

Example:

```text
Attempt 1
 ↓
Failure
 ↓
Retry
 ↓
Failure
 ↓
Retry
```

Use bounded retries with appropriate backoff.

---

# 49. Permanent Failures

Examples:

```text
Invalid Email
Invalid Phone
Blocked Recipient
Invalid Template
```

should not be endlessly retried.

---

# 50. Notification Queue

Large notification bursts should use a queue.

```text
Business Event
      ↓
Notification Job
      ↓
Queue
      ↓
Worker
      ↓
Provider
```

---

# 51. Notification Deduplication

The system should avoid sending the same notification repeatedly due to duplicate events.

Example:

```text
Payment Event
Payment Event
Payment Event
```

should not automatically become:

```text
3 identical messages
```

unless intentional.

---

# 52. Idempotency

Notification processing should support idempotency where practical.

Conceptually:

```text
event_id + recipient + channel
```

can help identify duplicate deliveries.

---

# 53. Notification Priority

Notifications may have priority:

```text
LOW
NORMAL
HIGH
CRITICAL
```

Priority can influence delivery order.

---

# 54. Notification Batching

High-volume notifications may be grouped.

Example:

Instead of:

```text
10 individual notifications
```

the system could show:

```text
10 attendance records were updated.
```

where appropriate.

---

# 55. Digest Notifications

Optional digest functionality:

```text
Daily Summary
Weekly Summary
```

Example:

```text
Today's School Summary

12 attendance updates
8 homework items
3 fee payments
```

---

# 56. Scheduled Notifications

Some notifications may be scheduled.

Examples:

```text
Fee Due Reminder
Exam Reminder
Homework Reminder
```

Architecture:

```text
Scheduled Event
 ↓
Scheduler
 ↓
Notification Job
 ↓
Delivery
```

---

# 57. Reminder Rules

Example:

```text
Fee Due Date
   ↓
7 Days Before
   ↓
Notification

Due Date
   ↓
Notification

Overdue
   ↓
Reminder
```

The exact schedule should be configurable.

---

# 58. Timezone Handling

Scheduled notifications must use the relevant tenant/user timezone.

Do not assume UTC is the recipient's local time.

---

# 59. Quiet Hours

Users may optionally define quiet hours for non-critical notifications.

Example:

```text
Quiet Hours:
10:00 PM – 7:00 AM
```

Critical notifications may bypass quiet hours where policy allows.

---

# 60. Localization

Notification templates should support multiple languages if the product requires localization.

Conceptually:

```text
Template
 ↓
User Language
 ↓
Localized Message
```

---

# 61. Notification Language Fallback

If a localized template does not exist:

```text
User Language
 ↓
Fallback Language
```

The fallback should be deterministic.

---

# 62. Notification Deep Links

A notification should optionally open the relevant ERP page.

Example:

```text
Fee Payment Received
        ↓
Click
        ↓
Payment Details
```

---

# 63. Deep-Link Authorization

A deep link must never bypass authorization.

Example:

```text
Notification
 ↓
Student Profile
 ↓
Permission Check
```

If the recipient no longer has access:

```text
Access Denied
```

---

# 64. Notification Payload

Real-time payloads should contain only necessary information.

Example:

```text
{
  "type": "NOTIFICATION_CREATED",
  "notification_id": "..."
}
```

The client may then retrieve authorized details.

---

# 65. Sensitive Data

Avoid placing unnecessary sensitive information in:

```text
Push Payload
Email Subject
Notification Preview
Browser Notifications
```

---

# 66. Security Events

Security-related events may include:

```text
New Login
Password Changed
Password Reset
Role Changed
Account Disabled
```

These should use stricter delivery rules.

---

# 67. Administrative Notifications

Admins may receive:

```text
Import Completed
Export Ready
Payment Failure
System Alert
Integration Failure
```

according to their permissions.

---

# 68. Teacher Notifications

Teachers may receive:

```text
Class Assignment
Homework Reminder
Exam Reminder
Administrative Announcement
```

---

# 69. Student Notifications

Students may receive:

```text
Homework
Exam
Attendance
Announcement
Class Schedule
```

---

# 70. Parent Notifications

Parents may receive:

```text
Attendance
Fees
Homework
Exam
Announcements
```

for linked students only.

---

# 71. Parent-Student Relationship

Notifications about a student must be sent only to authorized parent/guardian accounts linked to that student.

---

# 72. Notification Preferences + Role

Preferences must not grant permissions.

Example:

```text
Parent enables:
Finance notifications
```

This does not grant access to unrelated financial data.

---

# 73. Notification Audit

Sensitive notifications should be auditable.

Example:

```text
notification.created
notification.sent
notification.failed
notification.read
```

Audit level should follow product/security requirements.

---

# 74. Provider Abstraction

External providers should be hidden behind adapters.

```text
Notification Service
        |
   +----+----+----+
   |    |    |    |
 Email SMS WhatsApp Push
 Adapter Adapter Adapter Adapter
```

---

# 75. Provider Switching

The ERP should be able to change providers without changing business-event code.

Bad:

```text
Payment Service
 ↓
Direct WhatsApp API
```

Better:

```text
Payment Service
 ↓
Notification Service
 ↓
WhatsApp Adapter
 ↓
Provider
```

---

# 76. Provider Credentials

Credentials must remain server-side.

Never expose:

```text
API Keys
Secrets
Provider Tokens
```

to the browser.

---

# 77. Provider Failure

If a provider is unavailable:

```text
Provider Down
 ↓
Queue
 ↓
Retry
```

where appropriate.

---

# 78. Fallback Channels

For critical communication, the system may optionally support fallback.

Example:

```text
Push Failed
 ↓
Email
```

Fallback rules must be explicit and must respect user preferences and consent requirements.

---

# 79. Delivery Observability

Administrators may need:

```text
Total Sent
Delivered
Failed
Queued
Retried
```

for operational monitoring.

---

# 80. Notification Dashboard

Optional:

```text
NOTIFICATION HEALTH

Queued       42
Sent         9,820
Failed       21
Retrying     8
```

---

# 81. Rate Limits

External providers may impose rate limits.

The notification system must respect:

```text
Provider Limits
Tenant Limits
System Limits
```

---

# 82. Burst Protection

A single event may affect thousands of users.

Example:

```text
Announcement
 ↓
10,000 students
 ↓
Potentially 20,000+ recipients/channels
```

Use queued/background delivery rather than synchronously sending everything.

---

# 83. Fan-Out Strategy

For large recipient groups:

```text
Event
 ↓
Recipient Resolver
 ↓
Batch Jobs
 ↓
Notification Workers
```

---

# 84. Notification Ordering

Where ordering matters:

```text
Payment Created
 ↓
Payment Confirmed
```

should not be delivered in reverse order.

The implementation should use appropriate event sequencing where necessary.

---

# 85. Notification Race Conditions

Example:

```text
Notification marked read
        +
Notification simultaneously created
```

The backend must preserve a consistent state.

---

# 86. Real-Time Reconnection

WebSocket/SSE clients may disconnect.

On reconnection:

```text
Reconnect
 ↓
Authenticate
 ↓
Resubscribe
 ↓
Synchronize missed state
```

Do not assume the client received every event while disconnected.

---

# 87. Missed Events

The client should be able to recover through:

```text
Notification API
```

or another synchronization mechanism.

---

# 88. Connection Security

Real-time connections must use secure transport and authenticated sessions.

---

# 89. Session Expiration

When authentication expires:

```text
Connection
 ↓
Unauthorized
 ↓
Disconnect / Reauthenticate
```

---

# 90. Real-Time Testing

Test:

```text
Connection
Authentication
Tenant Isolation
Branch Isolation
Notification Delivery
Reconnect
Missed Events
Unread Counts
Mark Read
```

---

# 91. Notification Testing

Test:

```text
Template Rendering
Recipient Resolution
Preferences
Email
SMS
WhatsApp
Push
Retries
Deduplication
Scheduling
Localization
```

---

# 92. Security Testing

Verify:

```text
Tenant A cannot receive Tenant B notifications.
Branch A cannot receive unauthorized Branch B events.
Parent A cannot receive Student B notifications.
User cannot subscribe to another user's channel.
```

---

# 93. Performance Testing

Simulate:

```text
1,000 recipients
10,000 recipients
100,000 notification events
```

depending on expected tenant scale.

Verify:

```text
Queue stability
Worker throughput
Database performance
Provider rate-limit handling
```

---

# 94. Notification Lifecycle

```text
EVENT
 ↓
RECIPIENT RESOLUTION
 ↓
PREFERENCE CHECK
 ↓
CREATE NOTIFICATION
 ↓
QUEUE
 ↓
DELIVERY
 ↓
STATUS UPDATE
 ↓
READ
 ↓
EXPIRY / RETENTION
```

---

# 95. Real-Time Lifecycle

```text
EVENT
 ↓
AUTHORIZED CHANNEL
 ↓
REAL-TIME MESSAGE
 ↓
CLIENT
 ↓
UI UPDATE
```

If disconnected:

```text
CLIENT RECONNECTS
 ↓
SYNC CURRENT STATE
```

---

# 96. Final Architecture

```text
                  ERP BUSINESS EVENT
                         |
                         ↓
                NOTIFICATION SERVICE
                         |
          +--------------+--------------+
          |              |              |
      Recipient       Preferences     Templates
      Resolution                       |
          |              |              |
          +--------------+--------------+
                         |
                         ↓
                    QUEUE / JOB
                         |
          +--------------+--------------+
          |              |              |
        In-App         Email          SMS
          |              |              |
          +--------------+--------------+
                         |
                 WhatsApp / Push
                         |
                         ↓
                   DELIVERY STATUS
                         |
                         ↓
                       AUDIT
```

---

# 97. Final Principle

> **Notifications must be event-driven, permission-aware, tenant-safe, preference-aware, and channel-independent. Real-time updates should improve responsiveness without becoming the source of truth. The database remains authoritative, external providers remain replaceable adapters, and every notification must respect the recipient's actual access scope.**

---

# 98. Next Document

The next specification is:

```text
27-INTEGRATIONS-AND-EXTERNAL-SERVICES.md
```

It will define:

```text
Integration Architecture
Payment Gateways
Email Providers
SMS Providers
WhatsApp
Push Services
Cloud Storage
Authentication Providers
Webhooks
Third-Party APIs
API Keys
OAuth
Provider Adapters
Retries
Rate Limits
External Service Failures
Webhook Security
Integration Logs
Tenant-Level Integrations
Provider Configuration
```

---

# END OF DOCUMENT
# MONITORING, LOGGING & OBSERVABILITY
# School + Coaching Centre ERP SaaS

**Document:** `31-MONITORING-LOGGING-AND-OBSERVABILITY.md`  
**Version:** 1.0  
**Status:** Implementation Specification  
**Previous Document:** `30-DEPLOYMENT-INFRASTRUCTURE-AND-DEVOPS.md`  
**Next Document:** `32-TESTING-AND-QUALITY-ASSURANCE.md`

---

# 1. Purpose

This document defines how the ERP detects, measures, investigates, and responds to operational problems.

The platform must make it possible to answer:

```text id="x1p8kq"
Is the system healthy?
What is failing?
Who is affected?
When did it start?
Why did it happen?
How severe is it?
Has it recovered?
```

---

# 2. Observability Principles

The platform should provide:

```text id="h8x1q3"
Metrics
Logs
Traces
Errors
Alerts
Health Checks
Dashboards
```

These should work together rather than being treated as isolated systems.

---

# 3. Three Pillars

The primary observability model is:

```text id="v2n7ka"
        OBSERVABILITY
        /     |      \
    METRICS  LOGS   TRACES
```

---

# 4. Metrics

Metrics answer:

> "What is happening?"

Examples:

```text id="r9m2fw"
Request Rate
Error Rate
Latency
CPU
Memory
Database Connections
Queue Depth
```

---

# 5. Logs

Logs answer:

> "What happened?"

Examples:

```text id="g6j3w0"
Request Failed
Payment Webhook Received
Background Job Failed
Database Error
Permission Denied
```

---

# 6. Traces

Distributed traces answer:

> "Where did the request spend time or fail?"

Example:

```text id="m2c9hz"
Browser
 ↓
API
 ↓
Service
 ↓
Database
 ↓
External Provider
```

---

# 7. Correlation IDs

Every important request should have a request/correlation ID.

Example:

```text id="j7v4sc"
request_id = "req_123456"
```

The same ID should be propagated through relevant services and logs.

---

# 8. Request Lifecycle

Conceptually:

```text id="n0m2ax"
Request
 ↓
Generate / Receive Request ID
 ↓
API
 ↓
Service
 ↓
Database / Queue / External API
 ↓
Response
```

---

# 9. Structured Logging

Logs should preferably use structured formats such as JSON.

Conceptually:

```text id="1o6s4d"
{
  "timestamp": "...",
  "level": "ERROR",
  "request_id": "...",
  "service": "...",
  "event": "...",
  "duration_ms": 123
}
```

---

# 10. Log Levels

Recommended levels:

```text id="d5q7wa"
DEBUG
INFO
WARN
ERROR
FATAL
```

Production logging should avoid excessive DEBUG output unless temporarily enabled for investigation.

---

# 11. INFO Logs

Use for meaningful operational events.

Examples:

```text id="2f3x7p"
Application Started
Deployment Completed
Job Processed
Webhook Accepted
```

---

# 12. WARN Logs

Use for unusual but non-fatal conditions.

Examples:

```text id="r8z3s2"
Slow External API
Retry Scheduled
Near Capacity
Deprecated API Usage
```

---

# 13. ERROR Logs

Use when an operation fails.

Examples:

```text id="q4x7j9"
Database Query Failed
Payment Sync Failed
Notification Delivery Failed
```

---

# 14. FATAL Logs

Use for conditions where the application cannot safely continue.

Example:

```text id="v5n3w1"
Required Production Configuration Missing
```

---

# 15. Never Log Secrets

Never log:

```text id="g5k8d4"
Passwords
Access Tokens
Refresh Tokens
API Keys
Database Passwords
Encryption Keys
Webhook Secrets
```

---

# 16. Sensitive Personal Data

Avoid logging unnecessary:

```text id="p6w2s8"
Student Personal Information
Parent Information
Financial Details
Private Documents
```

Use identifiers instead of full sensitive values where possible.

---

# 17. Log Redaction

Sensitive fields should be automatically redacted.

Example:

```text id="r3n8q2"
Authorization: [REDACTED]
Password: [REDACTED]
API-Key: [REDACTED]
```

---

# 18. Application Metrics

Track:

```text id="e7j1c9"
Request Count
Request Errors
Request Latency
Successful Operations
Failed Operations
```

---

# 19. HTTP Metrics

Track by:

```text id="f8p4s2"
Method
Route
Status Code
Duration
```

Avoid using raw user-controlled URLs as unbounded metric labels.

---

# 20. Latency

Track:

```text id="m3x7q1"
Average
Median
P95
P99
```

P95/P99 are particularly useful for identifying slow requests affecting a subset of users.

---

# 21. Error Rate

Conceptually:

```text id="4k8m2a"
Error Rate =
Failed Requests / Total Requests
```

Track by service and important endpoint categories.

---

# 22. Availability

Measure whether critical services are reachable and functional.

Example:

```text id="q9r5w1"
Availability =
Successful Valid Requests / Total Valid Requests
```

The exact SLI definition should be finalized with production operations.

---

# 23. SLI

**Service Level Indicator** is the measured signal.

Examples:

```text id="b3x7c5"
API Availability
API Latency
Notification Success Rate
Queue Processing Delay
```

---

# 24. SLO

**Service Level Objective** defines the target.

Example:

```text id="y8k2m6"
99.9% monthly API availability
```

This is an example target, not a guaranteed requirement.

---

# 25. SLA

If commercial contracts provide an SLA, it must be explicitly defined and should be backed by measurable operational data.

Do not claim an SLA simply because an internal SLO exists.

---

# 26. Dashboard

The main operations dashboard should show:

```text id="w4m8z3"
System Status
Request Rate
Error Rate
Latency
Active Instances
Database Health
Queue Health
Storage Health
External Integrations
```

---

# 27. Application Dashboard

Include:

```text id="p3x9h5"
Requests/min
5xx Rate
4xx Rate
P95 Latency
P99 Latency
Active Users
Background Jobs
```

---

# 28. Database Dashboard

Include:

```text id="s6c2k8"
CPU
Memory
Connections
Storage
Query Latency
Slow Queries
Locks
Replication Lag
Backup Status
```

---

# 29. Queue Dashboard

Include:

```text id="z5n7q1"
Queue Depth
Processing Rate
Failed Jobs
Retry Count
Oldest Job Age
Dead Letter Queue
```

---

# 30. Storage Dashboard

Monitor:

```text id="x8m4v2"
Storage Usage
Object Count
Upload Failures
Download Failures
Capacity
Backup Status
```

---

# 31. External Integration Dashboard

Track:

```text id="c7p2n9"
Payment Provider
Email Provider
SMS Provider
WhatsApp Provider
OAuth Provider
Webhook Processing
```

---

# 32. Integration Health

For every critical external integration track:

```text id="m6q3w8"
Availability
Latency
Error Rate
Authentication Status
Rate Limit Status
Last Successful Request
```

---

# 33. Payment Monitoring

Payment operations require dedicated monitoring.

Track:

```text id="h3v7k2"
Payment Attempts
Successful Payments
Failed Payments
Pending Payments
Webhook Failures
Reconciliation Exceptions
```

---

# 34. Notification Monitoring

Track:

```text id="t8m5q4"
Emails Sent
SMS Sent
WhatsApp Messages
Push Notifications
Failures
Retries
Provider Rejections
```

---

# 35. Authentication Monitoring

Monitor:

```text id="b6k9x1"
Successful Logins
Failed Logins
Password Resets
OTP Failures
MFA Failures
Suspicious Authentication Patterns
```

---

# 36. Security Monitoring

Monitor security-sensitive events:

```text id="f5r8z2"
Repeated Login Failures
Privilege Changes
Large Exports
Unexpected Admin Actions
Tenant Access Violations
Suspicious API Activity
```

---

# 37. Audit Logs vs Application Logs

These are different.

```text id="q2v6n8"
Application Log
→ Operational/debugging information

Audit Log
→ Security/business accountability
```

Do not replace formal audit records with ordinary application logs.

---

# 38. Audit Events

Examples:

```text id="x5m7c3"
Role Changed
Student Deleted
Payment Refunded
Fee Modified
Data Exported
Tenant Setting Changed
```

---

# 39. Health Endpoints

At minimum consider:

```text id="w8p2j5"
Liveness
Readiness
```

---

# 40. Liveness Monitoring

If liveness fails:

```text id="j4m9v2"
Instance
 ↓
Unhealthy
 ↓
Restart / Replace
```

---

# 41. Readiness Monitoring

If readiness fails:

```text id="r7c3x8"
Instance
 ↓
Removed From Traffic
 ↓
Recovery
```

---

# 42. Dependency Health

Do not expose detailed internal dependency information publicly.

Internally, monitor critical dependencies such as:

```text id="k6q2m4"
Database
Cache
Queue
Storage
Payment Provider
```

---

# 43. Synthetic Monitoring

Where appropriate, periodically simulate critical user flows.

Example:

```text id="s4x7p2"
Open Application
 ↓
Login
 ↓
Open Dashboard
 ↓
Search Student
 ↓
Logout
```

Use dedicated monitoring accounts, not real user accounts.

---

# 44. Synthetic Payment Monitoring

Do not perform real financial transactions just to test availability unless the payment provider explicitly supports a safe test environment.

---

# 45. Alerting

Alerts should be actionable.

Bad:

```text id="u7x3m9"
CPU = 71%
```

Better:

```text id="z2p6k4"
Application capacity is approaching sustained threshold and request latency is increasing.
```

---

# 46. Alert Severity

Recommended:

```text id="v5m8q1"
INFO
WARNING
HIGH
CRITICAL
```

---

# 47. Critical Alerts

Examples:

```text id="c8n3x5"
Production Completely Unavailable
Database Unavailable
Backup Failure
Tenant Isolation Error
Payment System Failure
Critical Security Incident
```

---

# 48. Warning Alerts

Examples:

```text id="y6q4p8"
Increasing Error Rate
High Queue Age
Low Storage Capacity
Slow API
Repeated Integration Retries
```

---

# 49. Alert Fatigue

Do not create alerts for every minor anomaly.

Too many alerts cause important incidents to be ignored.

---

# 50. Alert Deduplication

Repeated identical failures should be grouped where possible.

Example:

```text id="n3x8v5"
100 identical errors
        ↓
1 incident
+
100 occurrences
```

---

# 51. Alert Routing

Alerts should reach the appropriate team.

Possible routing:

```text id="h5q2m7"
Application → Engineering
Infrastructure → DevOps
Security → Security/Admin
Payments → Finance/Operations
```

---

# 52. Alert Escalation

Critical incidents should escalate if not acknowledged or resolved.

---

# 53. Incident Detection

Incident detection may use:

```text id="p8c4m2"
Metrics
Logs
Synthetic Checks
User Reports
Provider Alerts
Security Monitoring
```

---

# 54. Incident Lifecycle

```text id="f6v3k9"
Detected
 ↓
Acknowledged
 ↓
Investigating
 ↓
Mitigating
 ↓
Recovering
 ↓
Resolved
 ↓
Reviewed
```

---

# 55. Incident Metadata

Record:

```text id="x4m8q7"
Incident ID
Severity
Start Time
Detection Time
Affected Services
Affected Tenants
Current Status
Owner
Resolution Time
```

---

# 56. Mean Time To Detect

Track:

```text id="m2k6v9"
MTTD
```

This measures how quickly incidents are detected.

---

# 57. Mean Time To Recover

Track:

```text id="q8v4x1"
MTTR
```

This measures how quickly service is restored.

---

# 58. Error Tracking

Centralized error tracking should capture:

```text id="c3n7m5"
Exception Type
Message
Stack Trace
Request ID
Service
Version
Environment
```

---

# 59. Error Grouping

Identical errors should be grouped rather than generating thousands of separate incidents.

---

# 60. Error Context

Useful context:

```text id="y5p2k8"
Application Version
Route
Operation
Tenant Identifier
User Identifier where appropriate
Request ID
```

Never include unnecessary sensitive information.

---

# 61. Deployment Correlation

Errors should be correlated with deployments.

Example:

```text id="g7x3n1"
Error Rate Normal
        ↓
Deployment
        ↓
Error Rate Increased
```

This makes regressions easier to identify.

---

# 62. Version Tagging

Every log/error/metric event should identify the application version where practical.

---

# 63. Database Monitoring

Monitor database:

```text id="b4k8p6"
Availability
Latency
Connections
CPU
Memory
Storage
Locks
Deadlocks
Slow Queries
```

---

# 64. Slow Query Monitoring

Identify queries that exceed defined thresholds.

---

# 65. Queue Monitoring

Alert when:

```text id="m8q5v2"
Queue Depth Grows
Oldest Job Becomes Too Old
Failure Rate Increases
Retries Increase
```

---

# 66. Worker Monitoring

Track:

```text id="z6x3c7"
Worker Count
Jobs Processed
Jobs Failed
Processing Time
Worker Restarts
```

---

# 67. Storage Monitoring

Alert before storage reaches critical capacity.

---

# 68. Disk Monitoring

For infrastructure using persistent disks:

```text id="p4m9x2"
Disk Usage
IOPS
Latency
Errors
```

should be monitored.

---

# 69. Memory Monitoring

Memory exhaustion can cause crashes and cascading failures.

Monitor:

```text id="v7c5n3"
Usage
Pressure
OOM Events
```

---

# 70. CPU Monitoring

CPU should be evaluated alongside latency and throughput.

High CPU alone does not necessarily indicate a user-visible problem.

---

# 71. Network Monitoring

Where relevant:

```text id="k3q8m5"
Bandwidth
Latency
Packet Loss
Connection Errors
```

---

# 72. External Provider Monitoring

Provider outages should be distinguished from internal application failures.

Example:

```text id="h9x4c2"
Payment Provider
      ↓
Timeout
      ↓
Provider Failure
```

rather than incorrectly classifying it as an internal database failure.

---

# 73. Retry Monitoring

Track retry counts.

Excessive retries can create a cascading failure.

---

# 74. Circuit Breaker Monitoring

If circuit breakers are implemented, monitor:

```text id="r5m7k3"
Open
Half-Open
Closed
```

states.

---

# 75. Rate Limit Monitoring

Monitor external provider rate limits.

Examples:

```text id="x2v8n4"
API Quota
429 Responses
Remaining Capacity
```

---

# 76. Security Alert Integration

Security events should be connected to the security incident workflow.

---

# 77. Log Retention

Define retention separately for:

```text id="j8c3m6"
Application Logs
Security Logs
Audit Logs
Metrics
Traces
```

Retention should balance operational needs, privacy, and cost.

---

# 78. Log Storage

Logs should be stored centrally where possible.

Avoid relying solely on local application-server logs.

---

# 79. Log Search

Operators should be able to search by:

```text id="m5q8x1"
Request ID
Timestamp
Service
Error
Version
Tenant
```

subject to access controls.

---

# 80. Tenant Data in Observability

Observability systems must not become a side channel for unauthorized tenant data access.

Access to logs and traces should be controlled.

---

# 81. Production Debugging

Never solve production debugging by permanently enabling highly verbose sensitive logging.

Use temporary, controlled diagnostic logging when required.

---

# 82. Debug Mode

Production debug mode should normally be disabled.

---

# 83. Trace Sampling

Distributed tracing can generate significant volume.

Use appropriate sampling strategies rather than tracing every request indefinitely.

---

# 84. Trace Privacy

Do not place:

```text id="e7m4x2"
Passwords
Tokens
Full Student Documents
Payment Secrets
```

inside traces.

---

# 85. Observability Cost

Monitor the cost of:

```text id="q6x8p3"
Logs
Metrics
Traces
Storage
Retention
```

High-cardinality metrics and excessive logs can become expensive and difficult to operate.

---

# 86. High Cardinality

Avoid metric labels such as unrestricted:

```text id="s2k9m5"
user_id
request_id
raw_url
```

because they can create huge metric cardinality.

Use these identifiers primarily in logs/traces.

---

# 87. Dashboard Organization

Recommended dashboards:

```text id="c5x7m8"
1. Executive System Health
2. Application
3. Database
4. Queue / Workers
5. Storage
6. Integrations
7. Security
8. Deployment
```

---

# 88. Executive Health

High-level view:

```text id="v8m4q1"
System Status
Availability
Major Incidents
Error Rate
Latency
Active Tenants
```

---

# 89. Deployment Dashboard

Show:

```text id="f3x9k6"
Current Version
Previous Version
Deployment Status
Recent Deployments
Rollback Status
Error Rate After Deployment
```

---

# 90. Tenant Health

Where appropriate, operators may view tenant-level operational health.

Do not expose one tenant's operational data to another tenant.

---

# 91. Tenant-Level Metrics

Possible:

```text id="m6q2v8"
API Usage
Errors
Storage
Active Users
Background Jobs
```

---

# 92. Usage Monitoring

Usage metrics can help identify:

```text id="p7x4n3"
Growth
Capacity Requirements
Abuse
Unexpected Traffic
```

---

# 93. Capacity Planning

Use historical metrics to estimate future:

```text id="z5c8m2"
CPU
Database
Storage
Bandwidth
Queue
```

requirements.

---

# 94. Capacity Thresholds

Define warning and critical thresholds.

Example:

```text id="k2m7x4"
WARNING → sustained high utilization
CRITICAL → risk of service degradation
```

Exact thresholds should be based on actual performance characteristics.

---

# 95. Automated Recovery

Where safe, infrastructure may automatically recover from:

```text id="v3q9m5"
Instance Crash
Worker Crash
Temporary Connection Failure
```

Automated recovery should not hide persistent failures.

---

# 96. Restart Loops

Monitor repeated restarts.

```text id="r8x2c6"
Crash
 ↓
Restart
 ↓
Crash
 ↓
Restart
```

This is an incident, not successful recovery.

---

# 97. Dependency Failure

The system should distinguish:

```text id="n6m4q8"
Application Failure
Database Failure
Cache Failure
Queue Failure
Provider Failure
```

---

# 98. Graceful Degradation

Where appropriate:

```text id="c7x5p2"
Optional Service Fails
        ↓
Core ERP Continues
```

Example:

```text id="y8m3q6"
Analytics Service Down
        ↓
Student Management Still Works
```

---

# 99. Critical Dependency Failure

For critical dependencies:

```text id="j4q7x1"
Database Down
 ↓
Application Cannot Safely Perform Writes
 ↓
Fail Safely
```

Do not silently accept data that cannot be persisted reliably.

---

# 100. Monitoring Checklist

```text id="x9c4m7"
☐ Application metrics
☐ Infrastructure metrics
☐ Database monitoring
☐ Queue monitoring
☐ Storage monitoring
☐ External provider monitoring
☐ Error tracking
☐ Structured logs
☐ Request IDs
☐ Health checks
☐ Alerts
☐ Dashboards
☐ Backup monitoring
☐ Deployment monitoring
☐ Security monitoring
```

---

# 101. Production Alert Checklist

```text id="w5m8q3"
☐ Application unavailable
☐ Database unavailable
☐ High error rate
☐ High latency
☐ Backup failure
☐ Storage capacity warning
☐ Queue backlog
☐ Worker failures
☐ Payment provider failure
☐ Critical security event
```

---

# 102. Observability Architecture

```text id="a7q3m9"
                    USERS
                      |
                   FRONTEND
                      |
                    API
                      |
          +-----------+-----------+
          |           |           |
       SERVICES    DATABASE     QUEUE
          |           |           |
          +-----------+-----------+
                      |
                 OBSERVABILITY
              /        |        \
          METRICS     LOGS     TRACES
              \        |        /
                   DASHBOARDS
                       |
                    ALERTS
                       |
                INCIDENT RESPONSE
```

---

# 103. Final Principle

> **If the team cannot quickly determine whether the ERP is healthy, what failed, who is affected, and what changed, the platform is not sufficiently observable. Metrics show what is happening, logs explain what happened, traces show where time and failures occurred, alerts surface actionable problems, and dashboards turn operational data into decisions.**

---

# 104. Next Document

```text id="k8m4p2"
32-TESTING-AND-QUALITY-ASSURANCE.md
```

This document will define:

```text
Testing Strategy
Unit Tests
Integration Tests
API Tests
Frontend Tests
E2E Tests
Authorization Tests
Tenant Isolation Tests
Security Tests
Performance Tests
Load Tests
Regression Testing
Test Data
Mocking
CI Testing
Release Gates
Quality Gates
Bug Management
Acceptance Testing
Production Validation
```

---

# END OF DOCUMENT
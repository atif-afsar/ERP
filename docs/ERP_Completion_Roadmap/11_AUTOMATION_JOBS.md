# Phase 11 — Automation and Scheduled Jobs

## Objective

Move time-based business rules from browser code to reliable server-side jobs.

## Candidate jobs

- late fee calculation
- fee reminders
- attendance alerts
- payroll period processing
- pending approval reminders
- scheduled announcements
- notification retries
- report generation
- cleanup/retention tasks

## Architecture

```text
Scheduler
   ↓
Job
   ↓
Validated service
   ↓
Database transaction
   ↓
Audit/event
   ↓
Notification if needed
```

## Idempotency

Every job must be safe to run twice.

Example:

```text
late_fee_applied_for(invoice_id, rule_id, date)
```

should have a uniqueness constraint preventing duplicate charges.

## Observability

Store:

- job name
- started_at
- finished_at
- status
- affected records
- error
- retry count

## Exit criteria

Critical recurring business rules run server-side without requiring a user to keep the browser open.

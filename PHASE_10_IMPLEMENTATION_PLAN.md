# Phase 10 Implementation Plan — Communication & Notifications

## Repository audit

Phases 1–9 already provide PostgreSQL transactions, JWT authentication, tenant-scoped memberships and permissions, durable audit logs, secure hashed onboarding invitations, parent-to-student mappings, attendance records, fee proof verification, examination publication, and SaaS subscription events. These are reused.

The repository also contained a prototype `notifications` table, a legacy delivery table, a localStorage-based header dropdown, and an announcements screen. The unfinished Phase 10 draft was not safe to apply: it used parent/student entity IDs as user IDs, joined email from `profiles` instead of `users`, allowed duplicate global templates, caught database errors inside business transactions, and held database locks while sending email. Migration 14 was pending, so it can be corrected without changing migration history.

## Architecture

Business modules enqueue a logical notification, recipients, and channel jobs in the same PostgreSQL transaction as the business change. No email provider is called from an HTTP request. A separate worker claims jobs in a short `FOR UPDATE SKIP LOCKED` transaction, commits the claim, calls the provider, and records the attempt and final state afterward.

`notifications` stores one tenant-scoped business event and a minimal render payload. `notification_recipients` stores server-resolved ERP user IDs or invitation-only external addresses. `notification_jobs` is the durable outbox. The existing `notification_deliveries` table becomes the append-only attempt ledger. Templates support a global system default and one tenant override per code/channel.

## Events, recipients, and idempotency

Stable event types cover owner, teacher, and parent invitations; absence; fee proof approval/rejection; fee reminders; published results; password changes; and SaaS subscription status. Invitations reuse existing one-time tokens. Parent recipients are resolved through `parent_students -> parents.user_id`, filtered by tenant and notification consent. Exam notifications use enrollments and linked parents. SaaS notifications resolve active tenant administrators.

A unique logical key `(tenant_id,event_type,source_type,source_id)`, unique recipient keys, and one job per recipient/channel make retries and repeated business requests idempotent. Correcting ABSENT to PRESENT cancels queued absence jobs; already-sent messages remain in delivery history.

## Templates and preferences

Rendering accepts only `{{name}}` placeholders and HTML-escapes every value. Unknown placeholders cause the job to fail safely. Tenant overrides can change subject/body for approved codes and channels; global system rows are immutable through tenant APIs. Preferences are per event/channel. OPTIONAL events honor opt-outs. TRANSACTIONAL and SECURITY events are mandatory.

## Email and worker

The provider interface has a safe `LOG` delivery mode and a production `RESEND` HTTPS adapter, avoiding a new runtime dependency. Strict environment validation requires a verified sender and API key before live delivery. Tests inject a mock provider and never make an external request.

The worker atomically claims due jobs, recovers stale claims, uses deterministic exponential delays (1, 5, 30 minutes), stops at four attempts, writes every attempt, supports graceful shutdown, and emits structured JSON logs without message bodies or invitation URLs.

## APIs and RBAC

Authenticated users can list only their own notifications, get unread count, mark one/all read, and update their own optional preferences. Tenant communication administrators can inspect aggregate health, safe template metadata/overrides, and tenant delivery history. Authorized administrators/accountants can explicitly send a deduplicated fee reminder. Template changes, reminders, and retries are audited.

Permissions: `notifications.view_own`, `communications.view`, `communications.templates.manage`, `communications.send`, and `communications.delivery.view`. Teachers only receive their own inbox permission and trigger attendance events through their existing attendance authority. Parents/students have no administration permission.

## Frontend and validation

The header reads the backend inbox, shows unread count, and marks opened items read. The communication workspace replaces local demo data with overview, templates, delivery history, preferences, and explicit fee reminders. It renders text only.

Validation includes schema/static tests, service/worker unit tests with an injected provider, PostgreSQL integration coverage when the configured database is available, all existing backend tests, backend and frontend TypeScript builds, production frontend build, migration status/checksum verification, `git diff --check`, and `git status`.

# Phase 9 — Communication, Notifications and Documents

## Objective

Move communication from UI/deep-link demos to reliable notification infrastructure.

## Channels

Prioritize:

1. in-app notifications
2. email
3. WhatsApp/SMS only after provider requirements are finalized

## Notification architecture

```text
ERP event
 ↓
Notification service
 ↓
Queue/outbox
 ↓
Provider
 ↓
Delivery status
```

Do not send important notifications directly inside a fragile React click handler.

## Events

Examples:

- student absent
- fee due
- fee paid
- exam published
- homework posted
- announcement created
- admission status changed

## Templates

Create reusable templates with:

- event type
- channel
- language
- variables
- active status

## Delivery tracking

Store:

- recipient
- provider
- provider message ID
- sent_at
- delivered_at if available
- failed_at
- error

## Documents

For uploaded documents:

- store files in object storage;
- store metadata in DB;
- enforce tenant/user access;
- validate file type and size;
- use signed/private URLs where appropriate.

## Exit criteria

At least one critical notification (e.g. fee receipt or absence alert) works end-to-end in staging.

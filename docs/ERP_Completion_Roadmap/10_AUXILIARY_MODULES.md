# Phase 10 — Auxiliary ERP Modules

## Objective

Productionize the remaining modules without destabilizing the core system.

## Recommended sequence

### Inventory
- items
- categories
- stock
- stock movements
- vendors
- purchase/issue/adjustment
- low-stock reporting

### Library
- books
- copies
- members
- issue/return
- fines
- availability

### Transport
- routes
- vehicles
- stops
- assignments
- transport fees if applicable

### Hostel
- buildings/rooms/beds
- allocations
- check-in/out
- gate passes

### Mess
- meal plans
- attendance/usage
- menu
- costs where supported

### Health
- student medical records
- visits
- notes/documents
- strict permissions

## Important

Do not force every module into the same database pattern if the domain needs different transaction semantics.

Sensitive health and personal data needs especially strict authorization and audit logging.

## Exit criteria

Each module used in production has:

- database persistence
- RLS
- permissions
- validation
- error/loading states
- audit for sensitive actions
- tests for critical mutations

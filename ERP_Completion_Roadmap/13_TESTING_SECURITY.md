# Phase 13 — Testing and Security Hardening

## Objective

Prove that the ERP is reliable before real customer data is introduced.

## Test layers

### Unit tests
Test:

- fee calculations
- grade calculations
- permission evaluation
- validation
- date logic
- payroll calculations

### Integration tests
Test:

- authentication
- database services
- RLS
- payment webhook
- notification service

### E2E tests
Critical flows:

1. login
2. create student
3. mark attendance
4. create fee
5. payment
6. exam/result
7. parent access
8. tenant isolation

## Security checklist

- no secrets in frontend
- no service-role key in client
- RLS enabled
- RLS tested
- server validation
- input validation
- secure file access
- rate limiting where needed
- audit logging
- safe error messages
- dependency audit
- XSS protection
- CSRF considerations for relevant endpoints
- secure cookies/session handling where applicable

## Backup/recovery

Test:

- database backup
- restoration
- point-in-time recovery if available
- accidental deletion recovery

A backup that has never been restored is not a proven recovery plan.

## Performance

Measure:

- initial load
- dashboard query count
- student list pagination
- report generation
- database indexes
- slow queries

## Exit criteria

All critical workflows pass automated tests and a security review finds no known critical tenant-isolation issue.

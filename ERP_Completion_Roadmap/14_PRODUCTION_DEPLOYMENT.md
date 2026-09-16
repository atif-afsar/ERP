# Phase 14 — Production Deployment and SaaS Operations

## Objective

Deploy the ERP as a real SaaS product with staging, production and operational safeguards.

## Environments

Maintain:

```text
local
staging
production
```

Never test payment/webhook changes directly against production first.

## Deployment

Frontend:

- production build
- environment variables configured per environment
- HTTPS
- custom domain if desired
- correct SPA routing

Backend:

- Supabase project/config
- migrations
- Edge Functions/server endpoints
- secrets
- webhook endpoints

## Monitoring

Set up:

- frontend error monitoring
- backend/function logs
- database monitoring
- uptime monitoring
- payment webhook monitoring

## SaaS operations

Implement the minimum required for:

- tenant creation
- tenant onboarding
- institution settings
- subscription state if billing is offered
- feature flags
- user invitations
- tenant suspension/reactivation
- support/admin access with audit trail

## Launch checklist

### Data
- [ ] Database migrated
- [ ] Seed data separated from production
- [ ] Backups verified

### Security
- [ ] RLS tested
- [ ] Secrets rotated
- [ ] Auth tested
- [ ] Roles tested

### Payments
- [ ] Webhook verified
- [ ] Duplicate events tested
- [ ] Refund tested

### Application
- [ ] Critical E2E tests passing
- [ ] Error states checked
- [ ] Mobile responsive
- [ ] Performance acceptable

### Operations
- [ ] Monitoring enabled
- [ ] Logs accessible
- [ ] Support process defined
- [ ] Recovery procedure documented

## Final milestone

A real pilot institution can be onboarded and use the ERP for:

- students
- staff
- attendance
- fees
- payments
- exams/results
- communication

without relying on demo/localStorage data.

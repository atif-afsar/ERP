# Bug Log — EduNexus Multi-Tenant ERP

This document logs all identified bugs, defects, vulnerabilities, and glitches discovered during QA execution, along with the file, line number, and applied fix.

| Bug ID | Component | Severity | Description | File : Line | Status | Fix Summary |
|---|---|---|---|---|---|---|
| BUG-AUTH-001 | Backend Auth | Critical | Email string containing 'superadmin' granted Super Admin privileges, and absence of role defaulted to SUPER_ADMIN | `backend/src/routes/auth.ts:72-74` | Fixed | Strict check on `role === 'SUPER_ADMIN'`, default non-privileged role to 'TEACHER' |
| BUG-AUTH-002 | Backend Auth | High | Public `/signup` allowed arbitrary client-supplied `role: "SUPER_ADMIN"` or `TENANT_ADMIN` | `backend/src/routes/auth.ts:106-160` | Fixed | Sanitized `safeRole`, blocking elevation to `SUPER_ADMIN` or `TENANT_ADMIN` on public signup |
| BUG-AUTH-003 | Backend Auth | Low | `createToken` ignored `config.jwtExpiresIn` and hardcoded 7-day expiration | `backend/src/routes/auth.ts:35` | Fixed | Parameterized with `JWT_EXPIRES_IN || '7d'` |
| BUG-TEN-001 | Backend Tenants | High | Any authenticated user could create or patch arbitrary tenants without Super Admin privileges | `backend/src/routes/tenants.ts:45,73` | Fixed | Required `isSuperAdmin` for POST, and `isSuperAdmin` or self-tenant match for PATCH |

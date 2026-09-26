# AUTH & SECURITY FLOW
## Tenant Isolation Logic
The `tenantContext` middleware is the heart of the system:
1. Extract `X-Tenant-ID` from headers/body/query.
2. Validate `user.tenantId` against the requested `tenantId`.
3. If `isSuperAdmin` is true, allow cross-tenant access.
4. If membership check fails, return `403 CROSS_TENANT_ACCESS_DENIED`.

## RBAC Personas
- `SUPER_ADMIN`: Full system access.
- `TENANT_ADMIN`: Principal/Owner (Manage staff, fees, tenants).
- `TEACHER`: Academic access (Attendance, Marks, Homework).
- `ACCOUNTANT`: Financial access (Fees, Receipts, Ledgers).
- `STAFF`: Operations (Library, Transport, Hostel).
- `PARENT/STUDENT`: Read-only access to their specific records.

## JWT Lifecycle
- **Issuance:** Signed with `jwtSecret` on `/auth/signin`.
- **Expiry:** 7 days.
- **Validation:** Performed by `requireAuth` middleware on every protected request.

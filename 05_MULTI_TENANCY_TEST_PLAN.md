# 05 — Multi-Tenancy Isolation Test Plan

> Verifies strict tenant data isolation: every query filters by `tenant_id`, `X-Tenant-ID` resolution, cross-tenant denial, super-admin bypass, and tenant switching.
>
> **Test ID:** `MT-<NNN>`. Pre-req: two tenants — `TENANT_A` (demo "Delhi Public Academy", `a1b2c3d4-...`) and `TENANT_B` (created in API-TEN-005).

---

## 1. X-Tenant-ID Resolution (tenantContext middleware)

### `MT-001` — Authenticated user, matching X-Tenant-ID
- Tenant-admin A token + `X-Tenant-ID: TENANT_A`.
- **Expect:** `req.tenantId = TENANT_A`; data returned for A only.

### `MT-002` — Authenticated user, no X-Tenant-ID → uses JWT tenantId
- Omit header. **Expect:** `req.tenantId = user.tenantId` (from JWT claim).

### `MT-003` — Cross-tenant denial (no membership)
- Tenant-admin A token + `X-Tenant-ID: TENANT_B` (A has no active membership in B).
- **Expect:** 403 `CROSS_TENANT_ACCESS_DENIED` (memberships check returns 0 rows).

### `MT-004` — Cross-tenant allowed (multi-membership)
- Add A as active member of B (`memberships` row). Now `X-Tenant-ID: TENANT_B` with A token.
- **Expect:** 200; returns B's data.

### `MT-005` — Super-admin specifies any tenant
- Super-admin token + `X-Tenant-ID: TENANT_B`.
- **Expect:** `req.tenantId = TENANT_B`; full access; bypasses membership check.

### `MT-006` — Super-admin no header → default tenant
- Super-admin token, no header. **Expect:** falls back to JWT tenantId or demo tenant `a1b2c3d4-...`.

### `MT-007` — query.tenantId fallback
- `GET /students?tenantId=TENANT_A` (no header). **Expect:** resolves from query (when no user). Verify precedence: header > query > body.

### `MT-008` — body.tenantId fallback
- `POST` with `body.tenantId`. **Expect:** resolved when no header/query (unauthenticated demo path).

### `MT-009` — requireTenant=true with no resolvable tenant
- No header/query/body, no user. **Expect:** 400 `TENANT_REQUIRED`.

---

## 2. Data Isolation Across Every Endpoint

> Run each against TENANT_A and TENANT_B; verify **zero leakage**.

### `MT-010` — Students
- Create student in A; list with B header → not present. List A → present.

### `MT-011` — Staff`
### `MT-012` — Attendance`
### `MT-013` — Fee structures + assignments`
### `MT-014` — Payments`
### `MT-015` — Finance expenses + payroll`
### `MT-016` — Exams + results`
### `MT-017` — Homework`
### `MT-018` — Timetable`
### `MT-019` — Announcements + notifications`
### `MT-020` — Inventory, library, hostel, mess, transport, health-records`
### `MT-021` — Audit logs (tenant-scoped)`

For each: insert in A, fetch via B token+header → must be empty; fetch via A → present. **Critical:** verify the SQL `WHERE tenant_id = $1` is present in every query (grep `backend/src/routes` for missing tenant filters — **flag any**).

---

## 3. Unique Constraints (tenant-scoped)

### `MT-022` — admission_no unique per tenant
- `ADM-001` in A and `ADM-001` in B → both succeed (unique is `(tenant_id, admission_no)`).

### `MT-023` — employee_id unique per staff tenant`
### `MT-024` — attendance unique (tenant+student+date)`
### `MT-025` — receipt_no unique per tenant (payments)`
### `MT-026` — results unique (tenant+exam+student)`

---

## 4. Cascade & Referential Integrity

### `MT-027` — Delete tenant cascades all
- Delete a tenant row → all `tenant_id`-scoped tables lose rows (ON DELETE CASCADE). **Verify** (carefully, on a throwaway tenant).

### `MT-028` — Delete class cascades sections + timetable_entries
### `MT-029` — Delete student sets FKs to null (enrollments) / cascade (attendance via student_id ON DELETE CASCADE)
- Verify behavior matches schema FK definitions.

### `MT-030` — Student→user_id ON DELETE SET NULL`
- Delete a user; their student row's `user_id` becomes NULL (not the student deleted).

---

## 5. Tenant Switching (frontend)

### `MT-031` — switchTenant updates context + localStorage
- Super-admin switches to Tenant B. **Expect:** `TenantContext.currentTenant` = B; `localStorage.edunexus_active_tenant_id` updated; data refetches for B.

### `MT-032` — Non-super user switching blocked
- Tenant-admin A cannot switch to B (UI hides switcher or denies). Verify `switchTenant` only offered to super-admin.

### `MT-033` — Tenant change re-resolves user
- Non-super user in A; switch to B (if forced). **Expect:** user re-resolved to a B member or fallback.

### `MT-034` — Feature flags differ per tenant
- Tenant A: `attendance` enabled; Tenant B: disabled. Switch → sidebar/modules reflect.

### `MT-035` — Labels differ per tenant (school vs coaching)
- `getLabel('groupPlural')` → "Classes/Batches" (school) vs "Batches" (coaching) when labels set.

---

## 6. Branch Scoping (TenantContext)

### `MT-036` — Branch switcher
- If branches exist, switch branch → `currentBranch` updates; branch-scoped data filters.

### `MT-037` — Tenant switch resets branch
- Switch tenant → main branch of new tenant auto-selected.

---

## 7. RLS Policies (DB layer)

### `MT-038` — RLS enabled
- Check `sql/migrations/rls_policies.sql` is applied; `SELECT rowsecurity FROM pg_tables WHERE tablename='students'` → true (if RLS used).
- Note: the app uses app-level tenant filtering (every query has `tenant_id`), not necessarily RLS enforcement at DB role. **Verify** whether a DB role is enforced; if RLS policies exist but no `SET ROLE`, they may be inert. Document finding.

### `MT-039` — tenant_features / tenant_settings / tenant_labels isolation
- These config tables are tenant-scoped; switching tenant reads correct settings.

---

## 8. Super-Admin Platform View

### `MT-040` — GET /tenants returns all for super-admin
- **Expect:** full list; non-super → only own (`WHERE id=$1`).

### `MT-041` — Super-admin cannot read another tenant's data without header
- No X-Tenant-ID → defaults to demo tenant; to audit B must pass `X-Tenant-ID: B`. Verify intentional.

### `MT-042` — Feature flag control per tenant
- Super-admin toggles feature off for tenant A; A's users lose the module. Verify end-to-end.

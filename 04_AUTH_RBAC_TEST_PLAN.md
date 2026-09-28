# 04 — Auth & RBAC Test Plan

> Verifies the 9-role permission system end-to-end: JWT issuance, session lifecycle, role checks, route guards, frontend hiding, password flows, and anti-enumeration.
>
> **Test ID:** `RBAC-<NNN>`.

---

## 1. JWT Lifecycle

### `RBAC-001` — bcrypt password hash + verify
- Hash "TestSecurePassword@2026"; `bcrypt.compare` true; wrong → false. (Covered by `api.test.mjs`.)

### `RBAC-002` — JWT sign with full claims
- Token payload `{id,email,role,tenantId,isSuperAdmin}`; `jwt.verify` returns all claims + `exp`.

### `RBAC-003` — Expired JWT rejected
- Sign with `expiresIn:'0s'`; verify throws `TokenExpiredError`. Backend maps → 401 `TOKEN_EXPIRED`.

### `RBAC-004` — Tampered JWT rejected
- Modify payload char → `jwt.verify` throws → 401 `INVALID_TOKEN`.

### `RBAC-005` — JWT secret empty in production
- `NODE_ENV=production`, no `JWT_SECRET`. **Expect:** startup warning `[SECURITY ALERT]`; verify server refuses to sign with empty secret or fails closed (audit config.ts behavior — flag gap if it proceeds with `''`).

### `RBAC-006` — 7-day expiry hardcoded
- `createToken` uses `expiresIn:'7d'` ignoring `config.jwtExpiresIn`. **Verify** token `exp` = now+7d regardless of env. Document as known behavior.

---

## 2. Session Restoration (frontend)

### `RBAC-007` — Restore from stored token
- `localStorage.edunexus_auth_token` set; reload. `authService.restoreSession()` → `GET /auth/me` → rehydrates user; authState `AUTHENTICATED`.

### `RBAC-008` — Restore with dead token
- Token expired server-side. **Expect:** live `/me` 401 → falls back to local `edunexus_active_user_id`; if session flag true → stays authenticated (offline) or redirects to login.

### `RBAC-009` — No token, no saved session
- Clear storage. **Expect:** authState `UNAUTHENTICATED` → LoginView.

### `RBAC-010` — Zero-flicker init
- authState starts `UNKNOWN` → "Initializing…" spinner → resolves without flashing login.

---

## 3. Role Login Matrix (all 9 roles)

> Use the LoginView 1-click personas (seeded local users) AND the real VPS `signin` if admins provisioned.

### `RBAC-011` — SUPER_ADMIN login
- Sees super-admin sidebar (4 navs); `isSuperAdmin:true`; can access `#/super-admin`; tenant switcher.

### `RBAC-012` — TENANT_ADMIN login
- Sees full tenant sidebar; can access settings/staff/finance; cannot see `superadmin-*` routes (UnauthorizedCard).

### `RBAC-013` — BRANCH_MANAGER login
- Sees student/staff/attendance/fees/exams/communication; no settings.view (per matrix).

### `RBAC-014` — TEACHER login
- Sidebar: dashboard, my students, my groups, attendance, exams, timetable, homework, communication. No fees/finance/settings.

### `RBAC-015` — ACCOUNTANT login
- Sidebar: dashboard, students (view), fees, finance, staff (HR), inventory, reports. No attendance/exams/timetable/homework/communication.

### `RBAC-016` — RECEPTIONIST login
- Students (view+create+update), attendance view, fees view, payments record, communication send.

### `RBAC-017` — STAFF login
- Students, attendance mark, fees view, payments record, communication, announcements view.

### `RBAC-018` — PARENT login
- Dashboard = "Children Overview"; child selector; sees attendance/fees/exams/homework/timetable/transport/hostel/mess/health of children (read-only). No create/edit actions.

### `RBAC-019` — STUDENT login
- Dashboard = "Student Dashboard"; sees own attendance %, report card, timetable, homework, fee invoices, digital ID. No admin actions.

---

## 4. Permission Enforcement (can())

### `RBAC-020` — Route→permission guard
- For each route in `ROUTE_PERMISSIONS`, log in as a role that lacks the permission; navigate; **Expect:** `UnauthorizedCard` with correct `permission` label + "Return to Dashboard".

### `RBAC-021` — PermissionGuard component (inline)
- Wrap a sensitive button with `<PermissionGuard permission="payments.refund">`. Log in as ACCOUNTANT (has it) vs TEACHER (lacks). **Expect:** shown vs hidden/fallback.

### `RBAC-022` — Super-admin bypass
- `requireRole('TENANT_ADMIN')` middleware; super-admin token. **Expect:** `req.user.isSuperAdmin` → `next()` bypass (no 403).

### `RBAC-023` — hasRole helper
- `hasRole(['TEACHER','STAFF'])` for a TEACHER → true; for ACCOUNTANT → false (unless super-admin → always true).

---

## 5. Password Flows

### `RBAC-024` — Change password (frontend + backend)
- Old correct, new ≥8 chars (frontend) / ≥6 (backend). **Expect:** success; can sign in with new; old fails.

### `RBAC-025` — Change password wrong old
- **Expect:** `INCORRECT_PASSWORD` (backend) / inline error (frontend).

### `RBAC-026` — Forgot password anti-enumeration
- Submit existing email and non-existent email. **Expect:** identical generic success message for both.

### `RBAC-027` — Audit log on auth events
- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, SESSION_EXPIRED, PASSWORD_RESET_REQUEST, PASSWORD_CHANGED, USER_INVITED all written to audit storage. Verify entries.

---

## 6. Rate Limiting & Lockout (frontend)

### `RBAC-028` — Failed-attempt lockout
- 5 failed logins for email X. **Expect:** `RATE_LIMITED` with countdown seconds.

### `RBAC-029` — Lockout clears on success
- Successful login clears `failedAttempts` for that email.

### `RBAC-030` — Lockout expires
- Wait for countdown; login allowed again.

---

## 7. User & Invitation Management

### `RBAC-031` — Invite user
- `inviteUser(email,name,role)`. **Expect:** invitation with token `INV-XXXXXX`, status PENDING, 7-day expiry; saved to storage; audit logged.

### `RBAC-032` — Switch user (demo)
- `switchUser(id)` updates active user id + session flag.

### `RBAC-033` — Switch role (demo)
- `switchRole('TEACHER')` finds a tenant teacher and switches (for quick testing).

### `RBAC-034` — Logout all devices
- `logoutAllDevices()` revokes sessions + logs out.

---

## 8. Backend requireRole checks

> Note: most data routes use `optionalAuth` + `tenantContext`, NOT `requireRole`. `requireRole` exists for stricter endpoints. Verify which endpoints enforce roles vs rely on tenant scoping. Document any route that should require a specific role but doesn't (audit finding).

### `RBAC-035` — requireAuth on /auth/me, /auth/password, /tenants POST/PATCH
- No token → 401 `UNAUTHENTICATED`.

### `RBAC-036` — optionalAuth allows anonymous with X-Tenant-ID
- `GET /students` no Authorization but `X-Tenant-ID: <demo>`. **Expect:** 200 returns data (demo-mode design). **Flag** if this is unintended data exposure in production.

---

## 9. Tenant-Suspended Behavior

### `RBAC-037` — Suspended tenant blocks non-super
- Tenant status `suspended`. Non-super user. **Expect:** `authState='TENANT_SUSPENDED'` → `SuspendedTenantView`.

### `RBAC-038` — Super-admin unaffected by suspension
- Super admin can still enter suspended tenant to audit.

---

## 10. Cross-Role Data Scoping Summary

| Action | Min role (frontend can) | Backend enforcer |
|--------|--------------------------|------------------|
| View students | all roles | tenantContext (tenant_id filter) |
| Create student | SUPER/TENANT_ADMIN/BRANCH_MGR/RECEPTIONIST/STAFF | (none beyond tenant) — **audit** |
| Mark attendance | SUPER/TENANT_ADMIN/BRANCH_MGR/TEACHER/STAFF | tenantContext |
| Record payment | SUPER/TENANT_ADMIN/BRANCH_MGR/ACCOUNTANT/RECEPTIONIST/STAFF/PARENT | tenantContext + audit_logs write |
| Enter results | SUPER/TENANT_ADMIN/BRANCH_MGR/TEACHER | tenantContext |
| Manage tenants | SUPER_ADMIN | requireAuth + isSuperAdmin bypass |
| Manage roles | SUPER/TENANT_ADMIN | (frontend can()) — backend route? verify |

> **Audit finding to verify:** backend data routes do not call `requireRole`, so RBAC is enforced primarily at the frontend + tenant scoping. Confirm this matches the security model; if stricter server-side role checks are required, flag as a hardening task.

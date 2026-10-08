# Student account onboarding repair — 2026-10-08

## Database migration
native_0021_student_account_onboarding.sql adds user_invitations.student_id with a composite student/tenant foreign key, enforces one student identity per user per tenant, and permits one pending invitation per student. Applied using the normal migration runner only to the existing local QA database. Other environments must run npm run db:migrate in backend before deploying this code. Legacy records and columns retained.

## APIs
POST /api/v1/students/:id/invitation — requires student_lifecycle.manage and users.invite; issues a hashed seven-day token through existing invitations and notification delivery.
POST /api/v1/students/:id/account-link — requires student_lifecycle.manage and users.manage; explicitly links an existing ACTIVE user with an active STUDENT membership in the same institute. Does not create/change roles, passwords or account memberships. Rejects already-linked users and identities; revokes pending student invitations.
POST /api/v1/auth/onboarding/accept — existing flow extended to link the invitation's student identity atomically. Used tokens remain invalid. Student invitations cannot silently attach staff by matching email.
GET /api/v1/students/self/id-card — existing restricted endpoint now verified against actual linked students; directory remains forbidden.

## Frontend
Open a student record in Students. Student login account displays account status and email input, permission-gated Invite student account / Link existing Student account actions and a private setup link for new invitations. Existing-account link requires explicit confirmation. No parallel login system.

## Files
backend/sql/migrations/native_0021_student_account_onboarding.sql
backend/src/services/studentAccountService.ts
backend/src/routes/studentLifecycle.ts
backend/src/routes/auth.ts
frontend/src/services/studentLifecycleService.ts
frontend/src/modules/students/StudentLifecycleModule.tsx
qa/student-onboarding-check.mjs

## Tests
Backend TypeScript and frontend TypeScript/Vite builds PASS; existing CSS/bundle warnings remain.
Five live API/browser regression groups PASS:
- Teacher invite denied and foreign student scope denied.
- Invitation acceptance, login, identity/enrollment parity, used-token rejection and student directory/action denial.
- Linked identity/account conflicts and non-Student/foreign membership rejection.
- Explicit linking of an existing unlinked Student account without password changes.
- Digital ID parity after reload and at 390px mobile width.
Runner uses newly created fictional students/accounts, preserving previous account relationships. Evidence and fictional credentials saved only under ignored qa/artifacts/student-onboarding/.

## Remaining scope
Original shared QA Student account remains unlinked; it was not silently attached to an arbitrary student. Use a newly linked fictional account or explicitly link a verified identity through the admin action.
Real student document file storage, downloadable failed CSV rows, QR verification and full dashboard metrics are separate unfinished work.
Student invitations reuse the existing invitation notification template; local delivery uses LOG, not real email. Admin invitation UI actions compile but were exercised through their APIs rather than a separate admin button-click regression. High-volume/concurrent onboarding stress testing remains separate.

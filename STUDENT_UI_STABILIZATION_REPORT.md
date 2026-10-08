# Student UI stabilization — 2026-10-08

## Repairs
- Student directory requests 25 records per page and exposes Previous/Next controls using API metadata. Search resets to page one, zero matches are explicit, load errors clear stale rows, and obsolete responses are ignored.
- Digital ID removes hardcoded class, roll and admission numbers and reads identity/current enrollment through GET /api/v1/students/self/id-card. Authentication is provided by the mounted API router, with STUDENT role and same-tenant user_id ownership required. The endpoint accepts no requested student ID and does not grant directory permissions. Missing or ambiguous links produce explicit errors.
- Legacy student placement/parent columns retained. No database migration.

## Files
frontend/src/modules/students/StudentLifecycleModule.tsx
frontend/src/modules/dashboard/DashboardModule.tsx
backend/src/routes/studentLifecycle.ts
qa/student-stabilization-check.mjs

## Verification
- Backend build PASS, frontend build PASS (existing CSS/chunk warnings).
- Five live browser/API checks PASS: unlinked self-ID returns expected error and restricted access denied; page two changes rows; page five reaches beyond 100; search resets page and shows empty state; unlinked ID card displays error without invented placement.
- Current QA student account has no students.user_id link. It was not changed. Successful linked-student card comparison requires an authorized linked test account and remains unverified in this pass.
- Early harness attempts were corrected for existing modal markup, which has no role=dialog. Initial frontend field mapping compile issue fixed before successful build.
- Evidence: qa/artifacts/student-stabilization/results.json (ignored).
- No student business records altered by browser/API regression. Backend restarted and new route active.

## Remaining
- Establish and verify a legitimate student account identity link; no automatic email-based linking was added.
- Digital ID's legacy decorative QR/verification claims remain unsupported; genuine QR functionality is separate unfinished scope.
- Full document upload/download, parent onboarding, CSV failed-row retry and admission duplicate-click tests remain outside this repair.
- Audit legacy column dependencies before schema cleanup.

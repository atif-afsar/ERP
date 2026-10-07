# Core flow stabilization — 7 October 2026

Scope: institute owner → teacher account/profile → academic setup → enrollment → attendance. No QR system or payment/subscription development. No database reset, new migration or changes to ABC Institute business records. Verification adds only separate fictional QA records.

## UI changes

- Fetch real authenticated institute profile for name/contact/type instead of retaining the placeholder institution name.
- Display backend validation field details in API errors.
- Academic-year name explains its minimum length and gives a session example.
- Attendance clears old rows/marks when year/class/section/date changes. In-flight roster responses are ignored after scope changes.
- Clear explanation when no enrolled students match the chosen scope/date, with a loading state.
- Sidebar says Attendance rather than promising an unimplemented QR integration.

## Backend changes

- Validate roster UUIDs and calendar date before SQL.
- Reject repeated enrollment IDs in one bulk submission rather than silently overwriting them.
- Teaching-assignment creation verifies institute references and section/class relationship before inserting.
- Existing tenant, permission and teaching scope checks retained.

## Verification

- Backend TypeScript build: PASS.
- Frontend TypeScript/Vite build: PASS; existing CSS syntax and chunk-size warnings remain.
- 6 new behavior tests for valid/malformed/missing scope, impossible dates, repeated enrollment IDs, empty/oversized records and status validation: PASS.
- 5 existing academic schema/architecture checks: PASS (static checks; not a substitute for runtime authorization testing).
- Real API/browser core flow: PASS after Docker/PostgreSQL recovered. Normal APIs created separate fictional institutes, onboarded Owner/Teacher and enrolled a student. Chromium saved LATE attendance and confirmed it after refresh. Malformed scope/duplicate records were rejected, unassigned class and foreign-tenant requests denied, institute names displayed correctly, and stale/empty roster behavior verified. Earlier interrupted attempts created separate partial QA fixtures; they were retained, not reset. One browser selector was corrected in the test harness; no product workaround was used.
- Runner qa/core-flow-check.mjs is prepared to create separate fictional local QA records, test authorized and forbidden scope, save via browser, reload and check persistence, and verify stale/empty roster handling. It writes fictional credentials/evidence only under Git-ignored qa/artifacts/training/core-flow/.

## Remaining work

1. Docker engine and preserved edunexus-pg container recovered; core-flow-check.mjs completed. Keep these local services running while practicing.
2. Live institute-name and authorization checks passed. Detailed results: qa/artifacts/training/core-flow/results.json (Git-ignored).
3. Dashboard metrics still need review against current backend data; this pass does not implement dashboard aggregates.
4. Direct Teacher invitations through Users & Access need a clearly guided profile/assignment linkage journey; use Staff & Teachers profile invitation for the prepared flow.
5. Student listing pagination/admission errors/import retry UX deserve their own focused stabilization pass.
6. QR scanning is not implemented. Real SaaS provider creation/cancellation and plan/module enforcement remain incomplete. They are separate scope.

## Practice after the engine recovers

Owner sets year/class/section/subject, creates and invites Teacher via Staff & Teachers, assigns the class/year, and admits a student to that placement. Teacher signs in, selects matching year/class/section/date, loads roster, reviews marks and saves. Refresh and reload the same scope to verify saved status. Changing date must clear previous roster; an empty list must explain why. Sign-in still depends on PostgreSQL being available.

# Dashboard repair report — 2026-10-12

## Changes
Added authenticated GET /api/v1/dashboard/summary, registered in the existing business-access policy. Non-platform users require tenant context. Metrics are read in one repeatable-read, read-only transaction.
- Platform: real total institutions, active institutions and global student count. No invented MRR.
- Institute: active student count, active staff count, attendance and fees only when the authenticated membership has the corresponding permissions. Accountant/Staff do not gain directory permissions just to display dashboard cards.
- Teacher: distinct assigned classes and own valid academic-year timetable sessions on the selected date; no invented homework submissions.
- Parent: only linked children and their enrollment, attendance and fees.
- Student: only their linked identity and enrollment, attendance and fees.
- Fees include completed payments only. Percentage is completed collection / assigned total. Scope explicitly covers all academic years.
- Attendance percentage uses recorded entries: PRESENT/LATE count one, HALF_DAY counts half, EXCUSED is excluded; no records displays Not recorded.

The dashboard no longer reads mock browser storage. It shows loading and explicit errors with Retry, clears stale values on identity/date changes, and ignores obsolete requests. Unsupported AI/report-card/QR claims and fictional metrics removed. Quick actions are gated by module access; admission also requires lifecycle manage. Student ID remains available with actual data or an honest unlinked state. SuperAdminModule now uses the same live overview rather than storage-derived prototype totals.

## Files
backend/src/routes/dashboard.ts (new)
backend/src/server.ts
backend/src/middleware/businessAccess.ts
frontend/src/modules/dashboard/DashboardModule.tsx
frontend/src/modules/superadmin/SuperAdminModule.tsx
qa/dashboard-repair-check.mjs (new)

No database migration and no business-data mutations required.

## Verification
Backend TypeScript and frontend TypeScript/Vite builds passed. Existing CSS syntax and bundle-size warnings remain.
Nine live regression groups passed: owner student/staff parity, fees and percentage parity, attendance parity, parent child collection parity, platform parity, restricted-role/tenant isolation, teacher assignment parity, network failure/retry, and seven roles at 1440/768/390px without dashboard forbidden requests.
Existing student stabilization runner: five checks passed, including directory beyond 100 and honest unlinked ID state.
Existing linked Student account: browser card retains actual admission number and roll 37 in repaired dashboard.
Tests use read-only database queries and browser/API access; no new student/payment records created. Evidence: qa/artifacts/dashboard-repair/results.json (ignored).
Early attempts were blocked by stopped Docker/PostgreSQL and then by missing default-deny policy registration; both resolved before successful checks. Existing Docker container/data restored and QA frontend/backend running.

## Limits and next actions
- Retest full dashboard action inventory with Antigravity; supported destinations were retained but every click was not individually replayed in this pass.
- No branch/year filters added: displayed metrics explicitly state institute-wide/all-year scope, rather than claiming current-session totals.
- Historical missing journals are unchanged. Collections are payment-based and do not certify ledger completeness.
- Parent/Student result portal, genuine QR, homework workflow and actual platform subscription MRR remain separate unfinished features.
- Full session-switch/stress tests and exhaustive custom-role combinations remain separate; tests checked separate sessions across canonical roles and foreign scope.
- Only local QA was restarted. No production deployment performed.

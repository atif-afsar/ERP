# Exam scheduling conflict repair — 2026-10-12

## Scope
Repairs scheduling duplicates and overlaps. Does not add draft edit/delete, parent/student results or bulk PDF export.

## Migration
backend/sql/migrations/native_0022_exam_schedule_conflicts.sql applied with the standard migration runner only to local QA.
- Tenant/date lookup index.
- Insert/update database trigger serializes schedule writes within an institute using transaction advisory locks.
- Duplicate subject in the same exam rejected.
- Overlapping intervals for the same class/year and intersecting sections rejected across exams. NULL section means whole class.
- Nonblank rooms compared case-insensitively after trimming; simultaneous use across classes/exams rejected within the institute.
- End equals next start is permitted; disjoint sections may run together in different rooms.
- Published schedules cannot be inserted/changed; dates/times/scope validated.
- Existing records retained; migration does not delete or rewrite historical conflicts.

## Backend / frontend
New examScheduleService creates schedule and audit atomically, locks institute scheduling before fetching current exam state, validates subject tenant, and maps database conflicts to useful HTTP 409 codes. Existing permission middleware retained.
Frontend explains rules and keeps conflict errors visible; a rejected submission no longer triggers a misleading schedule-load success message.

## Files
backend/sql/migrations/native_0022_exam_schedule_conflicts.sql
backend/src/services/examScheduleService.ts
backend/src/routes/examinationOperations.ts
frontend/src/modules/examinations/ExaminationAssessmentModule.tsx
qa/exam-schedule-conflict-check.mjs

## Verification
- Backend and frontend builds passed; existing CSS syntax/bundle warnings remain.
- Twelve live API/database/browser groups passed: subject duplicate, class overlap/consecutive slots, separate sections/room normalization, whole-class conflict, cross-exam class conflict, same-subject HTTP race, room HTTP race, teacher/foreign/date rejection, direct duplicate insert, concurrent direct room inserts, published exam block, browser error display.
- Six existing examination tests passed (structural checks plus result calculation tests).
- Separate fictional classes, sections, subjects and exams created through APIs. Additional direct DB inserts confined to those new test exams. Prior exams/marks preserved. Initial fixture subject-code casing validation failure corrected before successful runs.
- Evidence: qa/artifacts/exam-schedule-repair/results.json (ignored).

## Historical findings / remaining
Read-only scan: zero duplicate subject groups, but 530 pre-existing overlapping schedule pairs. This is a count of conflicting pairs, not 530 distinct exams. Full schedule IDs are in ignored results.json. No automatic cleanup performed because exam intent/marks must be reviewed before changes.
Future draft exam editing must revalidate schedules if class/section/year/date changes. No edit/delete API currently added.
Time collision rules use interval boundaries [start,end), room names rather than a room master table, and exam-subject schedule rows. Cross-tenant schedules never conflict. Broad tenant serialization favors correctness; high-volume load testing remains pending.
Production/non-QA databases must run backend npm run db:migrate before using the new API. Backend QA is restarted and running.
Next: Antigravity reruns scheduling and core exam flow; then implement safe draft lifecycle editing, followed by scoped published-result access if authorized.

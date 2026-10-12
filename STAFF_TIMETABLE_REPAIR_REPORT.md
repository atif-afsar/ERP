# Staff and timetable repair — 2026-10-12

## Fixed
1. Timetable partial intervals now conflict when tenant, academic year and weekday match and teacher, section or normalized room is shared. Both create and PATCH use one transaction, serialize timetable writes with an institute advisory lock, validate active teacher assignments and write durable audit events. Database trigger independently guards inserts/updates, including direct SQL concurrent requests. Consecutive slots and other days remain valid.
2. Both existing teacher invitation paths now ensure a teacher_profiles record in the onboarding transaction. Teacher identity must resolve to exactly one linked staff row. Existing profile fields are not overwritten.
3. Related staff API mapping repaired: teacherProfile presence is determined by joined profile ID, not whether optional qualification/specialization/bio fields are populated. This restores blank-profile teachers in assignment dropdowns.

## Migration
native_0023_timetable_teacher_profiles.sql applied only to the local QA database using the existing migration runner. Adds interval trigger/index and backfills only missing profiles for staff explicitly linked to TEACHER memberships, with TEACHER_PROFILE_BACKFILLED audit events. Does not change user links, roles or existing profile fields. Other databases require backend npm run db:migrate before deploying.

## Files
backend/sql/migrations/native_0023_timetable_teacher_profiles.sql
backend/src/services/timetableSchedulingService.ts
backend/src/routes/timetableOperations.ts
backend/src/routes/auth.ts
backend/src/routes/academicOperations.ts
frontend/src/modules/academicOperations/AcademicOperationsModule.tsx
backend/tests/academic-operations-schema.test.mjs
qa/staff-timetable-repair-check.mjs

## Verification
- Twelve live API/PostgreSQL groups passed: both onboarding paths, assignment eligibility, partial teacher/section/room conflict, adjacent/day exceptions, PATCH rollback/success, HTTP race, authorization, profile preservation/audit, direct SQL duplicate and race protection, zero remaining linked-teacher profile gaps.
- Browser confirms organizational Teachers with empty qualifications appear in assignment dropdown.
- Backend and frontend builds passed, retaining existing CSS syntax and bundle warnings.
- Five academic architecture checks passed after updating the source-location assertion to the extracted scheduling service. These are structural checks, separate from live regression evidence.
- Initial test fixture used user_id instead of staff API userId; corrected before successful run. This investigation also exposed the genuine blank-profile detection bug described above.
- Fictional QA staff, accounts, classes and schedules retained; no existing links/schedules deleted. Results: qa/artifacts/staff-timetable-repair/results.json (ignored).

## Remaining
Two pre-existing timetable overlap pairs remain preserved. Review and reschedule separately rather than automatically deleting entries.
Room conflict policy uses trimmed case-insensitive free-text names within tenant/year/day; no room master or capacity allocation introduced. Distinct academic years remain independent recurring schedules.
High-volume load tests, all custom-role combinations and complete UI re-audit remain separate. Existing Teacher users without any linked staff row cannot be safely inferred by the backfill and need explicit operator review. No production deployment performed.

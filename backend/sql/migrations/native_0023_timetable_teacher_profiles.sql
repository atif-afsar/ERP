-- Enforce interval conflicts on new/changed rows without rewriting legacy slots.
CREATE INDEX IF NOT EXISTS idx_timetable_conflict_lookup ON timetable_entries(tenant_id,academic_year_id,day_of_week);
CREATE OR REPLACE FUNCTION guard_timetable_interval_conflicts() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('timetable:'||NEW.tenant_id::text,0));
 NEW.room:=NULLIF(btrim(NEW.room),'');
 IF EXISTS(SELECT 1 FROM timetable_entries t WHERE t.id<>NEW.id AND t.tenant_id=NEW.tenant_id AND t.academic_year_id=NEW.academic_year_id AND t.day_of_week=NEW.day_of_week AND t.start_time<NEW.end_time AND t.end_time>NEW.start_time AND (t.teacher_id=NEW.teacher_id OR t.section_id=NEW.section_id OR (NEW.room IS NOT NULL AND lower(btrim(t.room))=lower(NEW.room)))) THEN
  RAISE EXCEPTION USING ERRCODE='23P01',CONSTRAINT='timetable_interval_conflict',MESSAGE='Teacher, section or room is already booked during this time.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER timetable_interval_conflict_guard BEFORE INSERT OR UPDATE OF tenant_id,academic_year_id,teacher_id,class_id,section_id,day_of_week,start_time,end_time,room ON timetable_entries FOR EACH ROW EXECUTE FUNCTION guard_timetable_interval_conflicts();

-- Repair only missing profiles of explicitly linked teacher members.
-- Existing qualifications, identities and memberships are never overwritten.
WITH repaired AS (
 INSERT INTO teacher_profiles(staff_id,tenant_id)
 SELECT s.id,s.tenant_id FROM staff s WHERE s.user_id IS NOT NULL
 AND EXISTS(SELECT 1 FROM memberships m JOIN roles r ON r.id=m.role_id WHERE m.user_id=s.user_id AND m.tenant_id=s.tenant_id AND r.key='TEACHER')
 ON CONFLICT(staff_id) DO NOTHING RETURNING staff_id,tenant_id
)
INSERT INTO audit_logs(tenant_id,action,module,entity_id,details,event_status)
SELECT tenant_id,'TEACHER_PROFILE_BACKFILLED','staff',staff_id,jsonb_build_object('migration','native_0023_timetable_teacher_profiles.sql'),'SUCCESS' FROM repaired;

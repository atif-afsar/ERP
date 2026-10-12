-- Preserve historical schedules; enforce conflicts on future inserts/changes.
CREATE INDEX IF NOT EXISTS idx_exam_schedule_tenant_date ON exam_subjects(tenant_id,exam_date);
CREATE OR REPLACE FUNCTION guard_exam_schedule_conflicts() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target exams%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('exam-schedules:'||NEW.tenant_id::text,0));
  SELECT * INTO target FROM exams WHERE id=NEW.exam_id AND tenant_id=NEW.tenant_id FOR SHARE;
  IF NOT FOUND OR target.class_id IS DISTINCT FROM NEW.class_id THEN
    RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='exam_schedule_scope',MESSAGE='Exam schedule scope is invalid.';
  END IF;
  IF target.status='PUBLISHED' THEN
    RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='exam_schedule_locked',MESSAGE='Published exam schedules are locked.';
  END IF;
  IF NEW.exam_date<target.start_date OR NEW.exam_date>target.end_date OR NEW.start_time IS NULL OR NEW.end_time IS NULL OR NEW.end_time<=NEW.start_time THEN
    RAISE EXCEPTION USING ERRCODE='23514',CONSTRAINT='exam_schedule_range',MESSAGE='Invalid schedule date or time range.';
  END IF;
  NEW.room := NULLIF(btrim(NEW.room),'');
  IF EXISTS(SELECT 1 FROM exam_subjects s WHERE s.tenant_id=NEW.tenant_id AND s.exam_id=NEW.exam_id AND s.subject_id=NEW.subject_id AND s.id<>NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE='23505',CONSTRAINT='exam_schedule_duplicate_subject',MESSAGE='This subject already has a schedule in this exam.';
  END IF;
  IF EXISTS(SELECT 1 FROM exam_subjects s JOIN exams e ON e.id=s.exam_id AND e.tenant_id=s.tenant_id WHERE s.tenant_id=NEW.tenant_id AND s.id<>NEW.id AND s.exam_date=NEW.exam_date AND s.start_time<NEW.end_time AND s.end_time>NEW.start_time AND e.class_id=target.class_id AND e.academic_year_id=target.academic_year_id AND (e.section_id IS NULL OR target.section_id IS NULL OR e.section_id=target.section_id)) THEN
    RAISE EXCEPTION USING ERRCODE='23P01',CONSTRAINT='exam_schedule_class_overlap',MESSAGE='This class or section already has an exam during that time.';
  END IF;
  IF NEW.room IS NOT NULL AND EXISTS(SELECT 1 FROM exam_subjects s WHERE s.tenant_id=NEW.tenant_id AND s.id<>NEW.id AND s.exam_date=NEW.exam_date AND s.start_time<NEW.end_time AND s.end_time>NEW.start_time AND lower(btrim(s.room))=lower(NEW.room)) THEN
    RAISE EXCEPTION USING ERRCODE='23P01',CONSTRAINT='exam_schedule_room_overlap',MESSAGE='This room already has an exam during that time.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER exam_schedule_conflict_guard BEFORE INSERT OR UPDATE OF tenant_id,exam_id,subject_id,class_id,exam_date,start_time,end_time,room
ON exam_subjects FOR EACH ROW EXECUTE FUNCTION guard_exam_schedule_conflicts();

-- Preserve recoverable legacy snapshots while preventing any new use of them.
CREATE OR REPLACE FUNCTION guard_student_identity_snapshots() RETURNS trigger AS $$
BEGIN
  IF TG_OP='INSERT' AND (NEW.class_id IS NOT NULL OR NEW.section_id IS NOT NULL OR NEW.roll_no IS NOT NULL
    OR NEW.parent_name IS NOT NULL OR NEW.parent_phone IS NOT NULL OR NEW.parent_email IS NOT NULL) THEN
    RAISE EXCEPTION 'Student placement and guardian snapshots are deprecated; use enrollments and parent_students';
  END IF;
  IF TG_OP='UPDATE' AND (NEW.class_id IS DISTINCT FROM OLD.class_id OR NEW.section_id IS DISTINCT FROM OLD.section_id
    OR NEW.roll_no IS DISTINCT FROM OLD.roll_no OR NEW.parent_name IS DISTINCT FROM OLD.parent_name
    OR NEW.parent_phone IS DISTINCT FROM OLD.parent_phone OR NEW.parent_email IS DISTINCT FROM OLD.parent_email) THEN
    RAISE EXCEPTION 'Student placement and guardian snapshots are immutable; use normalized lifecycle tables';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS students_identity_snapshot_guard ON students;
CREATE TRIGGER students_identity_snapshot_guard BEFORE INSERT OR UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION guard_student_identity_snapshots();

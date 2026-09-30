-- Phase 5: tenant-isolated staff, teaching operations, timetable, and enrollment attendance.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type VARCHAR(30) NOT NULL DEFAULT 'FULL_TIME'
  CHECK (employment_type IN ('FULL_TIME','PART_TIME','CONTRACT','TEMPORARY'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE staff DROP CONSTRAINT IF EXISTS fk_staff_branch_tenant;
ALTER TABLE staff ADD CONSTRAINT fk_staff_branch_tenant
  FOREIGN KEY(branch_id,tenant_id) REFERENCES branches(id,tenant_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_tenant_user ON staff(tenant_id,user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS teacher_profiles (
  staff_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  qualification TEXT,
  specialization TEXT,
  experience_years INT NOT NULL DEFAULT 0 CHECK(experience_years >= 0),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id) ON DELETE CASCADE,
  UNIQUE(staff_id,tenant_id)
);

ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS fk_user_invitations_staff_tenant;
ALTER TABLE user_invitations ADD CONSTRAINT fk_user_invitations_staff_tenant
  FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_staff_invitation ON user_invitations(tenant_id,staff_id)
  WHERE status='pending' AND staff_id IS NOT NULL;

ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE teacher_subject_assignments DROP CONSTRAINT IF EXISTS fk_teacher_assignment_section_class_tenant;
ALTER TABLE teacher_subject_assignments ADD CONSTRAINT fk_teacher_assignment_section_class_tenant
  FOREIGN KEY(section_id,class_id,tenant_id) REFERENCES sections(id,class_id,tenant_id) ON DELETE CASCADE;
DROP INDEX IF EXISTS uq_teacher_subject_scope;
CREATE UNIQUE INDEX uq_teacher_subject_scope ON teacher_subject_assignments(
  tenant_id,teacher_id,subject_id,
  COALESCE(class_id,'00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(section_id,'00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(academic_year_id,'00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_access
  ON teacher_subject_assignments(tenant_id,teacher_id,academic_year_id,class_id,section_id);

ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE timetable_entries t SET academic_year_id=c.academic_year_id
FROM classes c WHERE c.id=t.class_id AND c.tenant_id=t.tenant_id AND t.academic_year_id IS NULL;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM timetable_entries WHERE academic_year_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate timetable entries without an academic year';
  END IF;
END $$;
ALTER TABLE timetable_entries ALTER COLUMN academic_year_id SET NOT NULL;
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_class_id_fkey;
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_section_id_fkey;
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_subject_id_fkey;
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_teacher_id_fkey;
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS fk_timetable_year_tenant;
ALTER TABLE timetable_entries ADD CONSTRAINT fk_timetable_year_tenant
  FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE timetable_entries ADD CONSTRAINT fk_timetable_class_tenant
  FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE CASCADE;
ALTER TABLE timetable_entries ADD CONSTRAINT fk_timetable_section_class_tenant
  FOREIGN KEY(section_id,class_id,tenant_id) REFERENCES sections(id,class_id,tenant_id) ON DELETE CASCADE;
ALTER TABLE timetable_entries ADD CONSTRAINT fk_timetable_subject_tenant
  FOREIGN KEY(subject_id,tenant_id) REFERENCES subjects(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE timetable_entries ADD CONSTRAINT fk_timetable_teacher_tenant
  FOREIGN KEY(teacher_id,tenant_id) REFERENCES staff(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE timetable_entries DROP CONSTRAINT IF EXISTS ck_timetable_time_order;
ALTER TABLE timetable_entries ADD CONSTRAINT ck_timetable_time_order CHECK(end_time > start_time);
CREATE UNIQUE INDEX IF NOT EXISTS uq_timetable_section_slot
  ON timetable_entries(tenant_id,academic_year_id,section_id,day_of_week,start_time);
CREATE UNIQUE INDEX IF NOT EXISTS uq_timetable_teacher_slot
  ON timetable_entries(tenant_id,academic_year_id,teacher_id,day_of_week,start_time) WHERE teacher_id IS NOT NULL;

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS enrollment_id UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
WITH matching_enrollment AS (
  SELECT DISTINCT ON (a.id) a.id AS attendance_id,en.id AS enrollment_id,en.academic_year_id,en.section_id
  FROM attendance_records a JOIN enrollments en
    ON en.tenant_id=a.tenant_id AND en.student_id=a.student_id
   AND en.start_date <= a.attendance_date AND (en.end_date IS NULL OR en.end_date >= a.attendance_date)
  WHERE a.enrollment_id IS NULL
  ORDER BY a.id,en.start_date DESC
)
UPDATE attendance_records a
SET enrollment_id=m.enrollment_id,academic_year_id=m.academic_year_id,section_id=m.section_id
FROM matching_enrollment m WHERE m.attendance_id=a.id;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM attendance_records WHERE enrollment_id IS NULL OR academic_year_id IS NULL OR section_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate attendance without a matching enrollment, academic year, and section';
  END IF;
END $$;
ALTER TABLE attendance_records ALTER COLUMN enrollment_id SET NOT NULL;
ALTER TABLE attendance_records ALTER COLUMN academic_year_id SET NOT NULL;
ALTER TABLE attendance_records ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_id_fkey;
ALTER TABLE attendance_records ADD CONSTRAINT fk_attendance_student_tenant
  FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE CASCADE;
ALTER TABLE attendance_records ADD CONSTRAINT fk_attendance_enrollment_tenant
  FOREIGN KEY(enrollment_id,tenant_id) REFERENCES enrollments(id,tenant_id) ON DELETE CASCADE;
ALTER TABLE attendance_records ADD CONSTRAINT fk_attendance_year_tenant
  FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE attendance_records ADD CONSTRAINT fk_attendance_section_tenant
  FOREIGN KEY(section_id,tenant_id) REFERENCES sections(id,tenant_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_enrollment_date
  ON attendance_records(tenant_id,enrollment_id,attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_roster
  ON attendance_records(tenant_id,academic_year_id,section_id,attendance_date);

INSERT INTO permissions(key,name,description,module) VALUES
 ('staff.view','View staff','View tenant staff and teacher profiles','staff'),
 ('staff.manage','Manage staff','Create and update tenant staff and teacher profiles','staff'),
 ('teacher_accounts.manage','Manage teacher accounts','Invite a teacher to activate a linked user account','staff'),
 ('teaching_assignments.view','View teaching assignments','View teacher subject and class assignments','academics'),
 ('teaching_assignments.manage','Manage teaching assignments','Create and remove teacher subject and class assignments','academics'),
 ('timetable.view','View timetable','View timetable entries in permitted classes','timetable'),
 ('timetable.manage','Manage timetable','Create, update, and remove timetable entries','timetable'),
 ('attendance.view','View attendance','View enrollment-linked attendance in permitted classes','attendance'),
 ('attendance.manage','Manage attendance','Record enrollment-linked attendance in permitted classes','attendance')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key IN (
  'staff.view','staff.manage','teacher_accounts.manage','teaching_assignments.view','teaching_assignments.manage',
  'timetable.view','timetable.manage','attendance.view','attendance.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key='TEACHER' AND p.key IN ('teaching_assignments.view','timetable.view','attendance.view','attendance.manage')
ON CONFLICT DO NOTHING;

-- Phase 6: normalized examination schedules and enrollment-linked raw marks.
-- Derived totals, percentages, grades, and report cards are calculated by services and are not persisted.

CREATE TABLE IF NOT EXISTS grade_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, description TEXT, is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id,tenant_id), UNIQUE(tenant_id,name)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_grade_scales_default ON grade_scales(tenant_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS grade_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grade_scale_id UUID NOT NULL, grade VARCHAR(10) NOT NULL, min_percentage NUMERIC(5,2) NOT NULL,
  max_percentage NUMERIC(5,2) NOT NULL, grade_point NUMERIC(4,2), remarks VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(min_percentage>=0 AND max_percentage<=100 AND min_percentage<=max_percentage),
  FOREIGN KEY(grade_scale_id,tenant_id) REFERENCES grade_scales(id,tenant_id) ON DELETE CASCADE,
  UNIQUE(grade_scale_id,grade), UNIQUE(grade_scale_id,min_percentage,max_percentage)
);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year_id UUID;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS grade_scale_id UUID;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exams_id_tenant ON exams(id,tenant_id);
UPDATE exams e SET academic_year_id=(
  SELECT ay.id FROM academic_years ay WHERE ay.tenant_id=e.tenant_id
    AND (ay.name=e.academic_session OR ay.is_current) ORDER BY (ay.name=e.academic_session) DESC,ay.start_date DESC LIMIT 1
) WHERE e.academic_year_id IS NULL;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS fk_exams_year_tenant;
ALTER TABLE exams ADD CONSTRAINT fk_exams_year_tenant FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS fk_exams_class_tenant;
ALTER TABLE exams ADD CONSTRAINT fk_exams_class_tenant FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS fk_exams_section_class_tenant;
ALTER TABLE exams ADD CONSTRAINT fk_exams_section_class_tenant FOREIGN KEY(section_id,class_id,tenant_id) REFERENCES sections(id,class_id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS fk_exams_grade_scale_tenant;
ALTER TABLE exams ADD CONSTRAINT fk_exams_grade_scale_tenant FOREIGN KEY(grade_scale_id,tenant_id) REFERENCES grade_scales(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS ck_exams_date_order;
ALTER TABLE exams ADD CONSTRAINT ck_exams_date_order CHECK(end_date>=start_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_exams_scope_name ON exams(tenant_id,academic_year_id,class_id,COALESCE(section_id,'00000000-0000-0000-0000-000000000000'::uuid),name);

ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS room VARCHAR(50);
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE exam_subjects es SET tenant_id=e.tenant_id FROM exams e WHERE e.id=es.exam_id AND es.tenant_id IS NULL;
ALTER TABLE exam_subjects ALTER COLUMN tenant_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_subjects_id_tenant ON exam_subjects(id,tenant_id);
ALTER TABLE exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_exam_id_fkey;
ALTER TABLE exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_subject_id_fkey;
ALTER TABLE exam_subjects DROP CONSTRAINT IF EXISTS exam_subjects_class_id_fkey;
ALTER TABLE exam_subjects ADD CONSTRAINT fk_exam_subject_exam_tenant FOREIGN KEY(exam_id,tenant_id) REFERENCES exams(id,tenant_id) ON DELETE CASCADE;
ALTER TABLE exam_subjects ADD CONSTRAINT fk_exam_subject_subject_tenant FOREIGN KEY(subject_id,tenant_id) REFERENCES subjects(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE exam_subjects ADD CONSTRAINT fk_exam_subject_class_tenant FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE exam_subjects DROP CONSTRAINT IF EXISTS ck_exam_subject_marks;
ALTER TABLE exam_subjects ADD CONSTRAINT ck_exam_subject_marks CHECK(max_marks>0 AND pass_marks>=0 AND pass_marks<=max_marks);
ALTER TABLE exam_subjects DROP CONSTRAINT IF EXISTS ck_exam_subject_time_order;
ALTER TABLE exam_subjects ADD CONSTRAINT ck_exam_subject_time_order CHECK(end_time IS NULL OR start_time IS NULL OR end_time>start_time);

CREATE TABLE IF NOT EXISTS exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exam_subject_id UUID NOT NULL, enrollment_id UUID NOT NULL, marks_obtained NUMERIC(7,2),
  is_absent BOOLEAN NOT NULL DEFAULT false, remarks TEXT, entered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(exam_subject_id,tenant_id) REFERENCES exam_subjects(id,tenant_id) ON DELETE CASCADE,
  FOREIGN KEY(enrollment_id,tenant_id) REFERENCES enrollments(id,tenant_id) ON DELETE CASCADE,
  CHECK((is_absent AND marks_obtained IS NULL) OR (NOT is_absent AND marks_obtained IS NOT NULL AND marks_obtained>=0)),
  UNIQUE(tenant_id,exam_subject_id,enrollment_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_marks_enrollment ON exam_marks(tenant_id,enrollment_id,exam_subject_id);

COMMENT ON TABLE results IS 'DEPRECATED Phase 6: denormalized derived results retained for legacy recovery only; Phase 6 APIs calculate results from exam_marks';

INSERT INTO permissions(key,name,description,module) VALUES
 ('examinations.view','View examinations','View exams and schedules in permitted academic scopes','exams'),
 ('examinations.manage','Manage examinations','Create and update exams and schedules','exams'),
 ('exam_marks.view','View exam marks','View subject marks in permitted teaching scopes','exams'),
 ('exam_marks.manage','Manage exam marks','Enter subject marks for assigned teaching scopes','exams'),
 ('exam_results.publish','Publish exam results','Publish or withdraw calculated exam results','exams'),
 ('report_cards.view','View report cards','Generate calculated enrollment report cards','exams'),
 ('grade_scales.manage','Manage grade scales','Configure percentage-based grade bands','exams')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN')
AND p.key IN ('examinations.view','examinations.manage','exam_marks.view','exam_marks.manage','exam_results.publish','report_cards.view','grade_scales.manage') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key='TEACHER'
AND p.key IN ('examinations.view','exam_marks.view','exam_marks.manage','report_cards.view') ON CONFLICT DO NOTHING;

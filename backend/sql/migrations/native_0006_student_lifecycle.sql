-- Phase 4: permanent student identity with normalized guardians and yearly enrollment history.
-- Legacy snapshot columns remain nullable for recoverable migration, but Phase 4 APIs never read or write them.
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Indian';
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_id_tenant ON students(id,tenant_id);

ALTER TABLE parents ADD COLUMN IF NOT EXISTS occupation VARCHAR(150);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE parents ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_parents_id_tenant ON parents(id,tenant_id);
CREATE INDEX IF NOT EXISTS idx_parents_tenant_phone ON parents(tenant_id,phone);

ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(30) NOT NULL DEFAULT 'GUARDIAN';
ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS can_pickup BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS receives_notifications BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE parent_students DROP CONSTRAINT IF EXISTS fk_parent_students_parent_tenant;
ALTER TABLE parent_students ADD CONSTRAINT fk_parent_students_parent_tenant FOREIGN KEY(parent_id,tenant_id) REFERENCES parents(id,tenant_id) ON DELETE CASCADE;
ALTER TABLE parent_students DROP CONSTRAINT IF EXISTS fk_parent_students_student_tenant;
ALTER TABLE parent_students ADD CONSTRAINT fk_parent_students_student_tenant FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE CASCADE;

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS roll_no VARCHAR(50);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS remarks TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_id_tenant ON enrollments(id,tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_student_year ON enrollments(tenant_id,student_id,academic_year_id) WHERE academic_year_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sections_id_class_tenant ON sections(id,class_id,tenant_id);
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_student_tenant;
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_student_tenant FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE CASCADE;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_year_tenant;
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_year_tenant FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_class_tenant;
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_class_tenant FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS fk_enrollments_section_class_tenant;
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_section_class_tenant FOREIGN KEY(section_id,class_id,tenant_id) REFERENCES sections(id,class_id,tenant_id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL, document_type VARCHAR(50) NOT NULL, file_name VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL, mime_type VARCHAR(100) NOT NULL, size_bytes BIGINT NOT NULL CHECK(size_bytes>=0),
  notes TEXT, uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE CASCADE,
  UNIQUE(tenant_id,storage_key)
);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents(tenant_id,student_id,created_at DESC);

INSERT INTO enrollments(tenant_id,student_id,academic_year_id,class_id,section_id,roll_no,status,start_date)
SELECT s.tenant_id,s.id,y.id,s.class_id,s.section_id,s.roll_no,'enrolled',s.admission_date
FROM students s JOIN sections sec ON sec.id=s.section_id AND sec.class_id=s.class_id AND sec.tenant_id=s.tenant_id
JOIN LATERAL (SELECT id FROM academic_years y WHERE y.tenant_id=s.tenant_id ORDER BY y.is_current DESC,y.start_date DESC LIMIT 1) y ON true
WHERE s.class_id IS NOT NULL AND s.section_id IS NOT NULL ON CONFLICT DO NOTHING;

COMMENT ON COLUMN students.class_id IS 'DEPRECATED: historical import snapshot; current placement is derived from enrollments';
COMMENT ON COLUMN students.section_id IS 'DEPRECATED: historical import snapshot; current placement is derived from enrollments';
COMMENT ON COLUMN students.roll_no IS 'DEPRECATED: historical import snapshot; yearly roll number is stored on enrollments';

INSERT INTO permissions(key,name,description,module) VALUES
 ('student_lifecycle.view','View student lifecycle','Search and view students, guardians, enrollments, and documents','students'),
 ('student_lifecycle.manage','Manage student lifecycle','Admit and update students, guardians, relationships, and enrollments','students'),
 ('student_documents.manage','Manage student documents','Create and remove student document metadata','students')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN')
AND p.key IN ('student_lifecycle.view','student_lifecycle.manage','student_documents.manage') ON CONFLICT DO NOTHING;

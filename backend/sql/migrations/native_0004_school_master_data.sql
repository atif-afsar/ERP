-- Phase 3: tenant-isolated school master data.

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  email VARCHAR(255), phone VARCHAR(50),
  address_line_1 TEXT, city VARCHAR(100), state VARCHAR(100), postal_code VARCHAR(20),
  is_main BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code), UNIQUE(id, tenant_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_one_main ON branches(tenant_id) WHERE is_main;

ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
  CHECK (status IN ('upcoming','active','closed','archived'));
UPDATE academic_years SET status='active' WHERE is_current=true AND status='upcoming';
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_tenant_name ON academic_years(tenant_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_one_current ON academic_years(tenant_id) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_id_tenant ON academic_years(id, tenant_id);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS uq_classes_id_tenant ON classes(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_classes_scope_name ON classes(tenant_id, COALESCE(branch_id,'00000000-0000-0000-0000-000000000000'::uuid), COALESCE(academic_year_id,'00000000-0000-0000-0000-000000000000'::uuid), name, stream);
ALTER TABLE classes DROP CONSTRAINT IF EXISTS fk_classes_branch_tenant;
ALTER TABLE classes ADD CONSTRAINT fk_classes_branch_tenant FOREIGN KEY(branch_id,tenant_id) REFERENCES branches(id,tenant_id) ON DELETE RESTRICT;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS fk_classes_year_tenant;
ALTER TABLE classes ADD CONSTRAINT fk_classes_year_tenant FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sections_id_tenant ON sections(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sections_class_name ON sections(tenant_id,class_id,name);
ALTER TABLE sections DROP CONSTRAINT IF EXISTS fk_sections_class_tenant;
ALTER TABLE sections ADD CONSTRAINT fk_sections_class_tenant FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE CASCADE;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS weekly_periods INT NOT NULL DEFAULT 1 CHECK (weekly_periods BETWEEN 1 AND 20);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS passing_marks NUMERIC(6,2) NOT NULL DEFAULT 33 CHECK (passing_marks >= 0);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS max_marks NUMERIC(6,2) NOT NULL DEFAULT 100 CHECK (max_marks > 0 AND passing_marks <= max_marks);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_id_tenant ON subjects(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_tenant_code ON subjects(tenant_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_id_tenant ON staff(id, tenant_id);
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL, subject_id UUID NOT NULL, class_id UUID, academic_year_id UUID,
  is_primary BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(teacher_id,tenant_id) REFERENCES staff(id,tenant_id) ON DELETE CASCADE,
  FOREIGN KEY(subject_id,tenant_id) REFERENCES subjects(id,tenant_id) ON DELETE CASCADE,
  FOREIGN KEY(class_id,tenant_id) REFERENCES classes(id,tenant_id) ON DELETE CASCADE,
  FOREIGN KEY(academic_year_id,tenant_id) REFERENCES academic_years(id,tenant_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_subject_scope ON teacher_subject_assignments(
  tenant_id,teacher_id,subject_id,COALESCE(class_id,'00000000-0000-0000-0000-000000000000'::uuid),COALESCE(academic_year_id,'00000000-0000-0000-0000-000000000000'::uuid));

INSERT INTO permissions(key,name,description,module) VALUES
 ('master_data.view','View school master data','View school profile, years, branches, classes, sections, subjects, and teacher assignments','master-data'),
 ('master_data.manage','Manage school master data','Create and update school master data','master-data')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key IN ('master_data.view','master_data.manage')
ON CONFLICT DO NOTHING;

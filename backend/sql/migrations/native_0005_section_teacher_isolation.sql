-- Enforce tenant isolation for optional section class-teacher references.
ALTER TABLE sections DROP CONSTRAINT IF EXISTS fk_sections_teacher_tenant;
ALTER TABLE sections ADD CONSTRAINT fk_sections_teacher_tenant
  FOREIGN KEY(class_teacher_id,tenant_id) REFERENCES staff(id,tenant_id) ON DELETE SET NULL (class_teacher_id);

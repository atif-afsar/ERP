ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE user_invitations ADD CONSTRAINT fk_invitation_student_tenant
  FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX uq_students_tenant_user ON students(tenant_id,user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_student_pending_invitation ON user_invitations(tenant_id,student_id)
  WHERE student_id IS NOT NULL AND status='pending';

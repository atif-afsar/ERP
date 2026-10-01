-- Phase 7.1: parent identity onboarding and canonical verified-payment fee states.
ALTER TABLE user_invitations ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS fk_user_invitations_parent_tenant;
ALTER TABLE user_invitations ADD CONSTRAINT fk_user_invitations_parent_tenant
  FOREIGN KEY(parent_id,tenant_id) REFERENCES parents(id,tenant_id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_parent_invitation ON user_invitations(tenant_id,parent_id)
  WHERE status='pending' AND parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_parents_tenant_user ON parents(tenant_id,user_id) WHERE user_id IS NOT NULL;

UPDATE fee_assignments SET status='DUE' WHERE status='UNPAID';
UPDATE fee_assignments SET status='PARTIAL' WHERE status='PARTIALLY_PAID';
ALTER TABLE fee_assignments DROP CONSTRAINT IF EXISTS fee_assignments_status_check;
ALTER TABLE fee_assignments ALTER COLUMN status SET DEFAULT 'DUE';
ALTER TABLE fee_assignments ADD CONSTRAINT fee_assignments_status_check
  CHECK(status IN ('DUE','PARTIAL','PAID','OVERDUE','WAIVED'));

INSERT INTO permissions(key,name,description,module) VALUES
 ('parent_accounts.view','View parent accounts','View parent identities and linked student access','users'),
 ('parent_accounts.invite','Invite parent accounts','Link or invite ERP parent user accounts','users')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key IN ('parent_accounts.view','parent_accounts.invite')
ON CONFLICT DO NOTHING;

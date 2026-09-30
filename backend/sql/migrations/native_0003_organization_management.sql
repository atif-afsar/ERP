-- Phase 2: multi-tenant organization management, onboarding, RBAC, and durable audit.

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_global_key ON roles(key) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_tenant_key ON roles(tenant_id, key) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant ON user_invitations(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_invitations_pending ON user_invitations(tenant_id, lower(email)) WHERE status='pending';

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS';

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

INSERT INTO roles (name, key, description, is_system_role)
VALUES
 ('Super Administrator', 'SUPER_ADMIN', 'Platform administrator', true),
 ('School Owner', 'TENANT_ADMIN', 'Institution owner and administrator', true),
 ('Teacher', 'TEACHER', 'Teaching staff', true),
 ('Accountant', 'ACCOUNTANT', 'Finance staff', true),
 ('Staff', 'STAFF', 'General institution staff', true),
 ('Parent', 'PARENT', 'Parent portal user', true),
 ('Student', 'STUDENT', 'Student portal user', true)
ON CONFLICT DO NOTHING;

INSERT INTO permissions (key, name, description, module)
VALUES
 ('organization.view', 'View organization', 'View institution profile and members', 'organization'),
 ('organization.update', 'Update organization', 'Update institution profile', 'organization'),
 ('users.view', 'View users', 'View institution users and invitations', 'users'),
 ('users.invite', 'Invite users', 'Create institution user invitations', 'users'),
 ('users.manage', 'Manage users', 'Change membership role and status', 'users'),
 ('roles.view', 'View roles', 'View roles and permission assignments', 'roles'),
 ('roles.manage', 'Manage roles', 'Create tenant roles and assign permissions', 'roles'),
 ('audit.view', 'View audit log', 'View durable organization audit events', 'audit')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, module = EXCLUDED.module;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN', 'TENANT_ADMIN')
ON CONFLICT DO NOTHING;

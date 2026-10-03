-- Phase 10: centralized, tenant-safe communication and durable notification outbox.

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  category VARCHAR(20) NOT NULL CHECK (category IN ('OPTIONAL','TRANSACTIONAL','SECURITY')),
  subject_template TEXT,
  body_template TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (channel <> 'EMAIL' OR subject_template IS NOT NULL)
);
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS category VARCHAR(20);
UPDATE notification_templates SET category=CASE WHEN code IN ('OWNER_INVITATION','TEACHER_INVITATION','PARENT_INVITATION','PASSWORD_CHANGED') THEN 'SECURITY' WHEN code='FEE_DUE_REMINDER' THEN 'OPTIONAL' ELSE 'TRANSACTIONAL' END WHERE category IS NULL;
ALTER TABLE notification_templates ALTER COLUMN category SET NOT NULL;
ALTER TABLE notification_templates ALTER COLUMN is_system SET NOT NULL;
ALTER TABLE notification_templates ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE notification_templates DROP CONSTRAINT IF EXISTS notification_templates_category_check;
ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_category_check CHECK(category IN ('OPTIONAL','TRANSACTIONAL','SECURITY'));
CREATE UNIQUE INDEX uq_notification_templates_global ON notification_templates(code,channel) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX uq_notification_templates_tenant ON notification_templates(tenant_id,code,channel) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,user_id,event_type,channel)
);
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_preferences' AND column_name='category') THEN EXECUTE 'UPDATE notification_preferences SET event_type=COALESCE(event_type,''LEGACY_''||category) WHERE event_type IS NULL'; END IF; END $$;
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_category_check;
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_tenant_id_user_id_category_channel_key;
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS category;
ALTER TABLE notification_preferences ALTER COLUMN event_type SET NOT NULL;
ALTER TABLE notification_preferences ALTER COLUMN is_enabled SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_preferences_event ON notification_preferences(tenant_id,user_id,event_type,channel);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS template_code VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_id VARCHAR(200);
ALTER TABLE notifications ALTER COLUMN source_id TYPE VARCHAR(200);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE notifications ALTER COLUMN priority SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN payload SET NOT NULL;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT'));
DROP INDEX IF EXISTS idx_notification_idempotency;
CREATE UNIQUE INDEX uq_notifications_business_event
  ON notifications(tenant_id,event_type,source_type,source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  external_email VARCHAR(320),
  recipient_type VARCHAR(30) NOT NULL DEFAULT 'USER' CHECK (recipient_type IN ('USER','EXTERNAL_EMAIL')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','READY','PARTIAL','DELIVERED','FAILED','SKIPPED')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL)::int + (external_email IS NOT NULL)::int = 1),
  CHECK ((recipient_type='USER' AND user_id IS NOT NULL) OR (recipient_type='EXTERNAL_EMAIL' AND external_email IS NOT NULL))
);
ALTER TABLE notification_recipients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notification_recipients ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notification_recipients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE notification_recipients r SET tenant_id=n.tenant_id FROM notifications n WHERE n.id=r.notification_id AND r.tenant_id IS NULL;
ALTER TABLE notification_recipients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notification_recipients ALTER COLUMN recipient_type SET NOT NULL;
ALTER TABLE notification_recipients ALTER COLUMN status SET NOT NULL;
ALTER TABLE notification_recipients DROP CONSTRAINT IF EXISTS notification_recipients_identity_check;
ALTER TABLE notification_recipients ADD CONSTRAINT notification_recipients_identity_check CHECK((user_id IS NOT NULL)::int+(external_email IS NOT NULL)::int=1);
ALTER TABLE notification_recipients DROP CONSTRAINT IF EXISTS notification_recipients_type_check;
ALTER TABLE notification_recipients ADD CONSTRAINT notification_recipients_type_check CHECK((recipient_type='USER' AND user_id IS NOT NULL) OR (recipient_type='EXTERNAL_EMAIL' AND external_email IS NOT NULL));
CREATE UNIQUE INDEX uq_notification_recipient_user ON notification_recipients(notification_id,user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_notification_recipient_email ON notification_recipients(notification_id,lower(external_email)) WHERE external_email IS NOT NULL;
CREATE INDEX idx_notification_recipients_user ON notification_recipients(tenant_id,user_id,read_at,created_at DESC);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','SENT','DELIVERED','FAILED','SKIPPED','CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 4 CHECK (max_attempts BETWEEN 1 AND 10),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(100),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipient_id,channel)
);
ALTER TABLE notification_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_jobs' AND column_name='next_retry_at') THEN EXECUTE 'UPDATE notification_jobs SET next_attempt_at=COALESCE(next_attempt_at,next_retry_at,NOW())'; ELSE UPDATE notification_jobs SET next_attempt_at=COALESCE(next_attempt_at,NOW()); END IF; END $$;
ALTER TABLE notification_jobs DROP COLUMN IF EXISTS next_retry_at;
ALTER TABLE notification_jobs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE notification_jobs ADD COLUMN IF NOT EXISTS locked_by VARCHAR(100);
ALTER TABLE notification_jobs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
UPDATE notification_jobs SET tenant_id=n.tenant_id FROM notifications n WHERE n.id=notification_jobs.notification_id AND notification_jobs.tenant_id IS NULL;
ALTER TABLE notification_jobs DROP CONSTRAINT IF EXISTS notification_jobs_status_check;
UPDATE notification_jobs SET status='SENT' WHERE status='COMPLETED';
ALTER TABLE notification_jobs DROP CONSTRAINT IF EXISTS notification_jobs_status_check;
ALTER TABLE notification_jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notification_jobs ALTER COLUMN status SET DEFAULT 'QUEUED';
ALTER TABLE notification_jobs ALTER COLUMN status SET NOT NULL;
ALTER TABLE notification_jobs ALTER COLUMN attempts SET DEFAULT 0;
ALTER TABLE notification_jobs ALTER COLUMN attempts SET NOT NULL;
ALTER TABLE notification_jobs ALTER COLUMN max_attempts SET DEFAULT 4;
ALTER TABLE notification_jobs ALTER COLUMN max_attempts SET NOT NULL;
ALTER TABLE notification_jobs ALTER COLUMN next_attempt_at SET DEFAULT NOW();
ALTER TABLE notification_jobs ALTER COLUMN next_attempt_at SET NOT NULL;
ALTER TABLE notification_jobs ADD CONSTRAINT notification_jobs_status_check CHECK(status IN ('QUEUED','PROCESSING','SENT','DELIVERED','FAILED','SKIPPED','CANCELLED'));
CREATE INDEX idx_notification_jobs_claim ON notification_jobs(status,next_attempt_at,created_at)
  WHERE status IN ('QUEUED','PROCESSING');

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES notification_recipients(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  recipient VARCHAR(320) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('IN_APP','EMAIL')),
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('QUEUED','PROCESSING','SENT','DELIVERED','FAILED','SKIPPED')),
  attempt_count INTEGER NOT NULL CHECK (attempt_count > 0),
  provider_message_id VARCHAR(255),
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_notification_delivery_attempt ON notification_deliveries(job_id,attempt_count) WHERE job_id IS NOT NULL;

INSERT INTO permissions(key,name,description,module) VALUES
 ('notifications.view_own','View own notifications','View and update the authenticated user notification inbox','communications'),
 ('communications.view','View communication administration','View tenant communication templates and health','communications'),
 ('communications.templates.manage','Manage communication templates','Create tenant overrides for safe notification templates','communications'),
 ('communications.send','Send transactional reminders','Trigger authorized tenant communication events','communications'),
 ('communications.delivery.view','View communication deliveries','Inspect tenant delivery metadata and failures','communications')
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key LIKE 'communications.%'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN','TEACHER','ACCOUNTANT','STAFF','PARENT','STUDENT') AND p.key='notifications.view_own'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.key='ACCOUNTANT' AND p.key IN ('communications.view','communications.send','communications.delivery.view')
ON CONFLICT DO NOTHING;

INSERT INTO notification_templates(code,name,channel,category,subject_template,body_template,is_system) VALUES
 ('OWNER_INVITATION','School owner invitation','EMAIL','SECURITY','Your EduNexus school invitation','Hello {{name}},<p>You have been invited to manage {{school_name}}.</p><p><a href="{{setup_url}}">Activate your account</a></p>',true),
 ('TEACHER_INVITATION','Teacher invitation','EMAIL','SECURITY','Invitation to join {{school_name}}','Hello {{name}},<p>You have been invited to join {{school_name}}.</p><p><a href="{{setup_url}}">Activate your account</a></p>',true),
 ('PARENT_INVITATION','Parent invitation','EMAIL','SECURITY','Parent portal access for {{school_name}}','Hello {{name}},<p>Your parent portal access for {{student_name}} is ready.</p><p><a href="{{setup_url}}">Activate your account</a></p>',true),
 ('ATTENDANCE_ABSENT','Absence alert','IN_APP','TRANSACTIONAL',NULL,'{{student_name}} was marked absent on {{date}}.',true),
 ('ATTENDANCE_ABSENT','Absence alert','EMAIL','TRANSACTIONAL','Absence alert for {{student_name}}','<p>{{student_name}} was marked absent on {{date}}.</p><p>Sign in to the parent portal for details.</p>',true),
 ('FEE_PROOF_APPROVED','Payment proof approved','IN_APP','TRANSACTIONAL',NULL,'Payment of ₹{{amount}} for {{student_name}} was approved. Receipt {{receipt_number}}.',true),
 ('FEE_PROOF_APPROVED','Payment proof approved','EMAIL','TRANSACTIONAL','Payment approved — receipt {{receipt_number}}','<p>Payment of ₹{{amount}} for {{student_name}} was approved.</p><p>Receipt: {{receipt_number}}</p>',true),
 ('FEE_PROOF_REJECTED','Payment proof rejected','IN_APP','TRANSACTIONAL',NULL,'Payment proof of ₹{{amount}} for {{student_name}} was rejected: {{remarks}}',true),
 ('FEE_PROOF_REJECTED','Payment proof rejected','EMAIL','TRANSACTIONAL','Payment proof needs attention','<p>Payment proof of ₹{{amount}} for {{student_name}} was rejected.</p><p>Reason: {{remarks}}</p>',true),
 ('FEE_DUE_REMINDER','Fee due reminder','IN_APP','OPTIONAL',NULL,'{{status_label}} fee of ₹{{amount}} is due for {{student_name}} on {{due_date}}.',true),
 ('FEE_DUE_REMINDER','Fee due reminder','EMAIL','OPTIONAL','Fee reminder for {{student_name}}','<p>{{status_label}} fee of ₹{{amount}} is due for {{student_name}} on {{due_date}}.</p>',true),
 ('EXAM_RESULT_PUBLISHED','Exam result published','IN_APP','TRANSACTIONAL',NULL,'{{exam_name}} results are available for {{student_name}}.',true),
 ('EXAM_RESULT_PUBLISHED','Exam result published','EMAIL','TRANSACTIONAL','{{exam_name}} results are available','<p>{{exam_name}} results are now available for {{student_name}}. Sign in to view the report card.</p>',true),
 ('PASSWORD_CHANGED','Password changed','EMAIL','SECURITY','Your EduNexus password was changed','<p>Your EduNexus password was changed. Contact your administrator immediately if this was not you.</p>',true),
 ('SAAS_SUBSCRIPTION_STATUS','Subscription status updated','IN_APP','TRANSACTIONAL',NULL,'Your EduNexus subscription status changed to {{status}}.',true),
 ('SAAS_SUBSCRIPTION_STATUS','Subscription status updated','EMAIL','TRANSACTIONAL','EduNexus subscription status: {{status}}','<p>Your EduNexus subscription status changed to {{status}}.</p>',true)
ON CONFLICT DO NOTHING;

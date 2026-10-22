CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(240) NOT NULL,
  source_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL' CHECK (source_type IN ('SYSTEM','MANUAL','PROJECT_DOC')),
  source_path VARCHAR(600),
  visibility VARCHAR(20) NOT NULL DEFAULT 'TENANT' CHECK (visibility IN ('PLATFORM','TENANT')),
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['ALL']::TEXT[],
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  content_hash VARCHAR(64) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((visibility = 'PLATFORM' AND tenant_id IS NULL) OR (visibility = 'TENANT' AND tenant_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_documents_platform_hash
  ON ai_knowledge_documents(content_hash) WHERE tenant_id IS NULL AND status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_documents_tenant_hash
  ON ai_knowledge_documents(tenant_id, content_hash) WHERE tenant_id IS NOT NULL AND status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ai_knowledge_documents(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  heading VARCHAR(300),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 20 AND 12000),
  token_estimate INTEGER NOT NULL CHECK (token_estimate > 0),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(heading, '')), 'A') ||
    setweight(to_tsvector('english', content), 'B')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_search ON ai_knowledge_chunks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_tenant ON ai_knowledge_chunks(tenant_id, document_id);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_owner ON ai_conversations(tenant_id, user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(12) NOT NULL CHECK (role IN ('USER','ASSISTANT')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 20000),
  citations JSONB NOT NULL DEFAULT '[]'::JSONB,
  model VARCHAR(100),
  grounded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS ai_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

WITH seeded(title, source_path, content) AS (VALUES
  ('Student lifecycle', 'verified-feature-manifest/students', 'EduNexus supports permanent student identity records, parent records, student-parent relationships, yearly enrollment history, student documents, search, listing and admissions. The current class belongs to the enrollment record rather than the student identity. Authorized staff can open Students to admit or search for a student.'),
  ('Academic structure', 'verified-feature-manifest/master-data', 'EduNexus supports school profile, academic years, branches, classes, sections, subjects and teacher-subject assignments. Configure an academic year, class and section before enrollment, timetable or attendance workflows.'),
  ('Attendance and QR', 'verified-feature-manifest/attendance', 'EduNexus supports manual enrollment attendance and time-limited QR attendance sessions. A teacher can access only assigned teaching scope. To load a roster, choose academic year, class, section and date. Face recognition, biometric hardware and RFID turnstiles are not supported.'),
  ('Fees and manual payments', 'verified-feature-manifest/fees', 'EduNexus supports fee structures, enrollment-based fee assignments, installments, school bank or UPI settings, parent payment-proof upload, administrator verification, partial payments, balances and receipts. The supported flow is fee due, bank or UPI payment outside EduNexus, proof upload, administrator approval, receipt. Student Razorpay payment is not supported.'),
  ('Examinations and results', 'verified-feature-manifest/exams', 'EduNexus supports exams linked to academic years, subject schedules, teacher-scoped marks entry, service-based result and grade calculation, publishing and report-card views. Published marks are locked. Linked parents and students can view published results for their own records.'),
  ('Staff and timetable', 'verified-feature-manifest/staff', 'EduNexus supports staff profiles, teacher profiles, teacher account invitations, teaching assignments and timetable scheduling. Timetable conflict checks protect teachers and sections from overlapping slots. Teachers see only assigned academic scope.'),
  ('Library operations', 'verified-feature-manifest/library', 'EduNexus supports titles, ISBN validation, physical copies, active borrower validation, issue, return, renewal policy, overdue state, lost copies, damage assessment, repair and withdrawal. Active loans block unsafe title archival.'),
  ('Subscription onboarding', 'verified-feature-manifest/subscription', 'An institute chooses a subscription plan, enters institution and owner information, pays using the displayed platform bank or UPI account, uploads payment proof and waits for Super Admin verification. Subscription access begins only after approval.'),
  ('Access and tenant security', 'verified-feature-manifest/security', 'EduNexus uses backend JWT authentication, active tenant membership, role permissions, tenant-scoped database queries, relationship checks and durable audit logs. A user must never receive another institution data. Parents access linked children and teachers access assigned teaching scope.'),
  ('Operations modules', 'verified-feature-manifest/operations', 'EduNexus includes inventory and fixed assets, transport and fleet, hostel, mess, HR leave, communications, notifications, reports and audit workflows. Capabilities must be described only when supported by verified application sources; do not invent GPS hardware, biometric devices, external gateways or regulatory certifications.')
)
INSERT INTO ai_knowledge_documents(title, source_type, source_path, visibility, allowed_roles, status, content_hash)
SELECT title, 'SYSTEM', source_path, 'PLATFORM', ARRAY['ALL']::TEXT[], 'ACTIVE', md5(content) FROM seeded
ON CONFLICT DO NOTHING;

WITH seeded(title, content) AS (VALUES
  ('Student lifecycle', 'EduNexus supports permanent student identity records, parent records, student-parent relationships, yearly enrollment history, student documents, search, listing and admissions. The current class belongs to the enrollment record rather than the student identity. Authorized staff can open Students to admit or search for a student.'),
  ('Academic structure', 'EduNexus supports school profile, academic years, branches, classes, sections, subjects and teacher-subject assignments. Configure an academic year, class and section before enrollment, timetable or attendance workflows.'),
  ('Attendance and QR', 'EduNexus supports manual enrollment attendance and time-limited QR attendance sessions. A teacher can access only assigned teaching scope. To load a roster, choose academic year, class, section and date. Face recognition, biometric hardware and RFID turnstiles are not supported.'),
  ('Fees and manual payments', 'EduNexus supports fee structures, enrollment-based fee assignments, installments, school bank or UPI settings, parent payment-proof upload, administrator verification, partial payments, balances and receipts. The supported flow is fee due, bank or UPI payment outside EduNexus, proof upload, administrator approval, receipt. Student Razorpay payment is not supported.'),
  ('Examinations and results', 'EduNexus supports exams linked to academic years, subject schedules, teacher-scoped marks entry, service-based result and grade calculation, publishing and report-card views. Published marks are locked. Linked parents and students can view published results for their own records.'),
  ('Staff and timetable', 'EduNexus supports staff profiles, teacher profiles, teacher account invitations, teaching assignments and timetable scheduling. Timetable conflict checks protect teachers and sections from overlapping slots. Teachers see only assigned academic scope.'),
  ('Library operations', 'EduNexus supports titles, ISBN validation, physical copies, active borrower validation, issue, return, renewal policy, overdue state, lost copies, damage assessment, repair and withdrawal. Active loans block unsafe title archival.'),
  ('Subscription onboarding', 'An institute chooses a subscription plan, enters institution and owner information, pays using the displayed platform bank or UPI account, uploads payment proof and waits for Super Admin verification. Subscription access begins only after approval.'),
  ('Access and tenant security', 'EduNexus uses backend JWT authentication, active tenant membership, role permissions, tenant-scoped database queries, relationship checks and durable audit logs. A user must never receive another institution data. Parents access linked children and teachers access assigned teaching scope.'),
  ('Operations modules', 'EduNexus includes inventory and fixed assets, transport and fleet, hostel, mess, HR leave, communications, notifications, reports and audit workflows. Capabilities must be described only when supported by verified application sources; do not invent GPS hardware, biometric devices, external gateways or regulatory certifications.')
)
INSERT INTO ai_knowledge_chunks(document_id, tenant_id, chunk_index, heading, content, token_estimate)
SELECT d.id, NULL, 0, d.title, s.content, GREATEST(1, CEIL(char_length(s.content) / 4.0)::INTEGER)
FROM seeded s JOIN ai_knowledge_documents d ON d.title=s.title AND d.tenant_id IS NULL AND d.status='ACTIVE'
ON CONFLICT(document_id, chunk_index) DO NOTHING;

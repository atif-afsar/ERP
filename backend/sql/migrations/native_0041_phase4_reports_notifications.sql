-- Native migration 0041: Phase 4 Reports & Notifications
-- 1. Ensure PASSWORD_RESET template is registered with SECURITY category
INSERT INTO notification_templates(code, name, channel, category, subject_template, body_template, is_system)
VALUES
  ('PASSWORD_RESET', 'Password reset request', 'EMAIL', 'SECURITY', 'Reset your EduNexus password', 'Hello {{name}},<p>You requested to reset your EduNexus password.</p><p><a href="{{reset_url}}">Reset Password</a></p><p>If you did not make this request, you can safely ignore this email.</p>', true)
ON CONFLICT DO NOTHING;

-- 2. Indexes to ensure bounded, highly responsive reporting queries under tenant isolation
CREATE INDEX IF NOT EXISTS idx_fee_assignments_tenant_year_created
  ON fee_assignments(tenant_id, academic_year_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_assignment_status
  ON payments(tenant_id, fee_assignment_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_date
  ON attendance_records(tenant_id, attendance_date, status);

CREATE INDEX IF NOT EXISTS idx_exam_marks_tenant_schedule
  ON exam_marks(tenant_id, exam_subject_id, enrollment_id);

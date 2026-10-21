-- Native migration 0045: Production-grade Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_ip VARCHAR(45),
  user_agent TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_active ON password_reset_tokens(user_id, expires_at) WHERE used_at IS NULL;

INSERT INTO notification_templates(code, name, channel, category, subject_template, body_template, is_system)
VALUES ('PASSWORD_RESET', 'Password Reset Request', 'EMAIL', 'SECURITY', 'Reset your EduNexus password', 'Hello {{user_name}},<p>We received a request to reset your EduNexus password.</p><p><a href="{{reset_url}}">Click here to reset your password</a></p><p>This link expires in {{expires_minutes}} minutes.</p>', true)
ON CONFLICT DO NOTHING;


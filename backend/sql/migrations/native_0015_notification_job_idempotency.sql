-- Phase 10 correction for databases upgraded from the pre-migration draft tables.
-- Fresh databases receive this uniqueness from native_0014's table definition;
-- upgraded draft databases need the equivalent explicit index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_jobs_recipient_channel
  ON notification_jobs(recipient_id,channel);

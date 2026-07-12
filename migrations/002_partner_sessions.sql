ALTER TABLE app_intimacy_jar__partner_config ADD COLUMN session_id TEXT;
ALTER TABLE app_intimacy_jar__jar_items ADD COLUMN session_id TEXT;

CREATE INDEX IF NOT EXISTS app_intimacy_jar__idx_items_session_created
  ON app_intimacy_jar__jar_items (session_id, created_at DESC);

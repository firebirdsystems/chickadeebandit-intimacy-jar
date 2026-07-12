CREATE TABLE IF NOT EXISTS app_intimacy_jar__partner_config (
  member_id    TEXT NOT NULL,
  partner_id   TEXT NOT NULL,
  PRIMARY KEY (member_id)
);

CREATE TABLE IF NOT EXISTS app_intimacy_jar__jar_items (
  id           TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100),
  created_by   TEXT NOT NULL,
  title        TEXT NOT NULL,
  notes        TEXT,
  category     TEXT NOT NULL DEFAULT 'other'
               CHECK (category IN ('romantic', 'playful', 'adventurous', 'intimate', 'other')),
  tried_at     TEXT,
  rating       INT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  tried_note   TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS app_intimacy_jar__idx_items_creator_created
  ON app_intimacy_jar__jar_items (created_by, created_at DESC);

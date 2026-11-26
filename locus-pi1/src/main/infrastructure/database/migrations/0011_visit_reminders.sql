CREATE TABLE IF NOT EXISTS visit_reminders (
  id TEXT PRIMARY KEY NOT NULL,
  visit_id TEXT NOT NULL REFERENCES property_visits(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  triggered_at INTEGER NOT NULL,
  dismissed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS visit_reminders_visit_stage_idx ON visit_reminders(visit_id, stage);
CREATE INDEX IF NOT EXISTS visit_reminders_visit_idx ON visit_reminders(visit_id);

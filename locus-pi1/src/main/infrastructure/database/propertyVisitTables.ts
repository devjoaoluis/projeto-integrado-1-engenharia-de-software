export const propertyVisitTables = `
CREATE TABLE IF NOT EXISTS property_visits (
  id TEXT PRIMARY KEY NOT NULL,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  scheduled_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'REALIZADA', 'CANCELADA')),
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS property_visits_property_idx ON property_visits(property_id);
CREATE INDEX IF NOT EXISTS property_visits_client_idx ON property_visits(client_id);
CREATE INDEX IF NOT EXISTS property_visits_scheduled_idx ON property_visits(scheduled_at);

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
`;

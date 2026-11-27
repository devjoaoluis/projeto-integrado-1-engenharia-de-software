export const notificationTables = `
CREATE TABLE IF NOT EXISTS app_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('VISIT', 'OVERDUE', 'SYSTEM')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target TEXT NOT NULL,
  entity_id TEXT,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS app_notifications_created_at_idx ON app_notifications(created_at);
CREATE INDEX IF NOT EXISTS app_notifications_read_at_idx ON app_notifications(read_at);
CREATE TRIGGER IF NOT EXISTS app_notifications_delete_rental
AFTER DELETE ON rentals
BEGIN
  DELETE FROM app_notifications
  WHERE category = 'OVERDUE' AND entity_id = OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS app_notifications_delete_client
AFTER DELETE ON clients
BEGIN
  DELETE FROM app_notifications
  WHERE category = 'OVERDUE'
    AND json_extract(data_json, '$.tenantId') = OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS app_notifications_delete_visit
AFTER DELETE ON property_visits
BEGIN
  DELETE FROM app_notifications
  WHERE category = 'VISIT' AND entity_id = OLD.id;
END;
`;

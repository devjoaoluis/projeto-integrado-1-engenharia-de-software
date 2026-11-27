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

CREATE INDEX IF NOT EXISTS app_notifications_created_at_idx
  ON app_notifications(created_at);
CREATE INDEX IF NOT EXISTS app_notifications_read_at_idx
  ON app_notifications(read_at);

INSERT OR IGNORE INTO app_notifications
  (id, category, title, message, target, entity_id, data_json, created_at, read_at)
SELECT
  'legacy-overdue:' || id,
  'OVERDUE',
  'Locatário em atraso',
  message,
  '/pagamentos?tenantId=' || tenant_id,
  rental_id,
  json_object(
    'id', id,
    'rentalId', rental_id,
    'contractId', contract_id,
    'tenantId', tenant_id,
    'referenceMonth', reference_month,
    'dueDate', due_date,
    'daysOverdue', days_overdue,
    'originalAmount', original_amount,
    'interestAmount', interest_amount,
    'fineAmount', fine_amount,
    'totalAmount', total_amount,
    'message', message,
    'channel', channel,
    'createdAt', created_at
  ),
  created_at,
  created_at
FROM overdue_notifications;

DELETE FROM app_notifications
WHERE id NOT IN (
  SELECT id FROM app_notifications
  ORDER BY created_at DESC
  LIMIT 100
);

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

CREATE TABLE IF NOT EXISTS overdue_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  rental_id TEXT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  contract_id TEXT REFERENCES property_contracts(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  due_date INTEGER NOT NULL,
  days_overdue INTEGER NOT NULL,
  original_amount REAL NOT NULL,
  interest_amount REAL NOT NULL,
  fine_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'SYSTEM',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS overdue_notifications_rental_idx ON overdue_notifications(rental_id);
CREATE INDEX IF NOT EXISTS overdue_notifications_tenant_idx ON overdue_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS overdue_notifications_due_date_idx ON overdue_notifications(due_date);
CREATE INDEX IF NOT EXISTS overdue_notifications_ref_idx ON overdue_notifications(rental_id, reference_month);


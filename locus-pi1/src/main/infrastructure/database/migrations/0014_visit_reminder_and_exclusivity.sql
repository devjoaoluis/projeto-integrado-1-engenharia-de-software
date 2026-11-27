ALTER TABLE property_visits ADD COLUMN reminder_lead_minutes INTEGER DEFAULT 30;
ALTER TABLE property_visits ADD COLUMN notification_sent INTEGER NOT NULL DEFAULT 0 CHECK (notification_sent IN (0, 1));

CREATE TRIGGER property_visits_no_schedule_conflict_insert
BEFORE INSERT ON property_visits
WHEN NEW.status = 'AGENDADA' AND EXISTS (
  SELECT 1 FROM property_visits
  WHERE status = 'AGENDADA' AND scheduled_at = NEW.scheduled_at
)
BEGIN
  SELECT RAISE(ABORT, 'VISIT_TIME_CONFLICT');
END;

CREATE TRIGGER property_visits_no_schedule_conflict_update
BEFORE UPDATE OF scheduled_at, status ON property_visits
WHEN NEW.status = 'AGENDADA' AND EXISTS (
  SELECT 1 FROM property_visits
  WHERE status = 'AGENDADA' AND scheduled_at = NEW.scheduled_at AND id <> NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'VISIT_TIME_CONFLICT');
END;

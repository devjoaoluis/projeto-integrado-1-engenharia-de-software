ALTER TABLE property_payments ADD COLUMN reference_month TEXT;
ALTER TABLE property_payments ADD COLUMN due_date INTEGER;
ALTER TABLE property_payments ADD COLUMN receipt_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS property_payments_contract_reference_unique
ON property_payments (contract_id, reference_month);

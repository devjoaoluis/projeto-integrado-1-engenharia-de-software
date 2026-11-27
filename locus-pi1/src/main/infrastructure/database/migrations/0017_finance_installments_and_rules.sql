ALTER TABLE property_payments ADD COLUMN amount_cents INTEGER;
ALTER TABLE property_payments ADD COLUMN principal_amount_cents INTEGER;
ALTER TABLE property_payments ADD COLUMN rent_amount_cents INTEGER;
ALTER TABLE property_payments ADD COLUMN expenses_amount_cents INTEGER;
ALTER TABLE property_payments ADD COLUMN fine_amount_cents INTEGER;
ALTER TABLE property_payments ADD COLUMN interest_amount_cents INTEGER;
ALTER TABLE property_payments ADD COLUMN created_by TEXT;
ALTER TABLE property_payments ADD COLUMN reversed_at INTEGER;
ALTER TABLE property_payments ADD COLUMN reversed_by TEXT;
ALTER TABLE property_payments ADD COLUMN reversal_reason TEXT;

UPDATE property_payments
SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER)
WHERE amount_cents IS NULL;

DROP INDEX IF EXISTS property_payments_contract_reference_unique;
CREATE INDEX IF NOT EXISTS property_payments_contract_reference_idx
  ON property_payments (contract_id, reference_month);

CREATE TABLE IF NOT EXISTS financial_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  grace_days INTEGER NOT NULL DEFAULT 3 CHECK (grace_days >= 0),
  fine_rate_basis_points INTEGER NOT NULL DEFAULT 1000
    CHECK (fine_rate_basis_points BETWEEN 0 AND 10000),
  monthly_interest_basis_points INTEGER NOT NULL DEFAULT 100
    CHECK (monthly_interest_basis_points BETWEEN 0 AND 10000),
  admin_fee_basis_points INTEGER NOT NULL DEFAULT 1000
    CHECK (admin_fee_basis_points BETWEEN 0 AND 10000),
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);

INSERT OR IGNORE INTO financial_settings
  (id, grace_days, fine_rate_basis_points, monthly_interest_basis_points, admin_fee_basis_points, updated_at)
VALUES (1, 3, 1000, 100, 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000);

CREATE TABLE IF NOT EXISTS contract_financial_settings (
  contract_id TEXT PRIMARY KEY NOT NULL
    REFERENCES property_contracts(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  use_own_rules INTEGER NOT NULL DEFAULT 0 CHECK (use_own_rules IN (0, 1)),
  grace_days INTEGER NOT NULL DEFAULT 3 CHECK (grace_days >= 0),
  fine_rate_basis_points INTEGER NOT NULL DEFAULT 1000
    CHECK (fine_rate_basis_points BETWEEN 0 AND 10000),
  monthly_interest_basis_points INTEGER NOT NULL DEFAULT 100
    CHECK (monthly_interest_basis_points BETWEEN 0 AND 10000),
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS rental_installment_items (
  id TEXT PRIMARY KEY NOT NULL,
  contract_id TEXT NOT NULL
    REFERENCES property_contracts(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  property_id TEXT NOT NULL
    REFERENCES properties(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
  reference_month TEXT NOT NULL
    CHECK (length(reference_month) = 7
      AND substr(reference_month, 1, 2) BETWEEN '01' AND '12'
      AND substr(reference_month, 3, 1) = '/'
      AND substr(reference_month, 4, 4) GLOB '[0-9][0-9][0-9][0-9]'),
  category TEXT NOT NULL CHECK (category IN ('IPTU', 'CONDOMINIO', 'AGUA', 'LUZ', 'OUTRO')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at INTEGER NOT NULL,
  created_by TEXT,
  voided_at INTEGER,
  voided_by TEXT
);

CREATE INDEX IF NOT EXISTS rental_installment_items_contract_reference_idx
  ON rental_installment_items (contract_id, reference_month);

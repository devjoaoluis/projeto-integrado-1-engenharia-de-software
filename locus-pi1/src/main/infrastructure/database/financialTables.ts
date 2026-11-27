export const financialTables = `
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
`;

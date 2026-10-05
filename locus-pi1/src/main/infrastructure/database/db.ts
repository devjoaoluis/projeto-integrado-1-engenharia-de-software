import { app } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";

const databasePath = path.join(app.getPath("userData"), "database.db");

const sqlite = new Database(databasePath);
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    status TEXT DEFAULT 'CADASTRADO' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS property_media (
    id TEXT PRIMARY KEY NOT NULL,
    property_id TEXT NOT NULL,
    type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON UPDATE NO ACTION ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    cpf_cnpj TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    email TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY NOT NULL,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  monthly_rent REAL NOT NULL CHECK (monthly_rent > 0),
  start_date INTEGER NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  parent_rental_id TEXT REFERENCES rentals(id) ON DELETE RESTRICT,
  formal_consent TEXT,
  contract_signed INTEGER NOT NULL DEFAULT 0 CHECK (contract_signed IN (0, 1)),
  signatures_notarized INTEGER NOT NULL DEFAULT 0 CHECK (signatures_notarized IN (0, 1)),
  initial_payments_paid INTEGER NOT NULL DEFAULT 0 CHECK (initial_payments_paid IN (0, 1)),
  keys_released_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (parent_rental_id IS NULL OR length(trim(formal_consent)) > 0 AND formal_consent IS NOT NULL),
  CHECK (keys_released_at IS NULL OR (contract_signed = 1 AND signatures_notarized = 1 AND initial_payments_paid = 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS rentals_property_primary_unique ON rentals(property_id) WHERE parent_rental_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rentals_property_tenant_unique ON rentals(property_id, tenant_id);
`);

export const db = drizzle(sqlite);

import { initializeContacts } from "./initializeContacts";
import { propertyHistoryTables } from "./propertyHistoryTables";
import { Client } from "@libsql/client";

export async function initializeDatabase(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.executeMultiple(`
  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    neighborhood TEXT,
    bedrooms INTEGER,
    description TEXT,
    price REAL NOT NULL,
    status TEXT DEFAULT 'CADASTRADO' NOT NULL,
    search_normalized TEXT,
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
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" integer NOT NULL,
	"expires_at" integer NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"pergunta_seguranca" text,
	"resposta_hash" text,
	"criado_em" integer NOT NULL,
	"atualizado_em" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");
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
  // Legacy accounts keep their password and have no recovery question until configured.
  const userColumns = await client.execute("PRAGMA table_info(users)");
  const columnNames = new Set(userColumns.rows.map((column) => String(column.name)));
  for (const column of ["pergunta_seguranca", "resposta_hash"]) {
    if (!columnNames.has(column)) {
      await client.execute(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
    }
  }
  await client.executeMultiple(propertyHistoryTables);
  await initializeContacts(client);

  const tableInfo = await client.execute("PRAGMA table_info(properties)");
  const columns = tableInfo.rows.map((row) => row.name);
  
  if (!columns.includes("neighborhood")) {
    await client.execute("ALTER TABLE properties ADD COLUMN neighborhood TEXT");
  }
  if (!columns.includes("bedrooms")) {
    await client.execute("ALTER TABLE properties ADD COLUMN bedrooms INTEGER");
  }
  if (!columns.includes("search_normalized")) {
    await client.execute("ALTER TABLE properties ADD COLUMN search_normalized TEXT");

  }

  // Also repair databases where the migration already added the column.
  const result = await client.execute("SELECT id, title, address, neighborhood FROM properties WHERE search_normalized IS NULL");
  for (const row of result.rows) {
    const searchNormalized = `${row.title} ${row.address} ${row.neighborhood || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    await client.execute({
      sql: "UPDATE properties SET search_normalized = ? WHERE id = ?",
      args: [searchNormalized, row.id]
    });
  }

  await client.execute("CREATE INDEX IF NOT EXISTS idx_status_neighborhood ON properties (status, neighborhood)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_price ON properties (price)");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_bedrooms ON properties (bedrooms)");
}

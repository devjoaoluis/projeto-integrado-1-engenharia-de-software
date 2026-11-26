import { Client } from "@libsql/client";

export async function initializeContacts(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = OFF");
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS "guarantors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cpf_cnpj" text,
	"phone" text,
	"email" text,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "guarantors_cpf_cnpj_unique" ON "guarantors" ("cpf_cnpj");
CREATE TABLE IF NOT EXISTS "owners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cpf_cnpj" text,
	"phone" text,
	"email" text,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "owners_cpf_cnpj_unique" ON "owners" ("cpf_cnpj");
`);
  for (const table of ["owners", "guarantors"]) {
    const info = await client.execute(`PRAGMA table_info(${table})`);
    const required = info.rows.filter((row) => (String(row.name) === "cpf_cnpj" || String(row.name) === "phone") && Number(row.notnull) === 1);
    if (required.length) {
      await client.executeMultiple(`
        CREATE TABLE "${table}_optional" (
          "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "cpf_cnpj" text,
          "phone" text, "email" text, "created_at" integer NOT NULL, "updated_at" integer NOT NULL
        );
        INSERT INTO "${table}_optional" SELECT id, name, cpf_cnpj, phone, email, created_at, updated_at FROM "${table}";
        DROP TABLE "${table}";
        ALTER TABLE "${table}_optional" RENAME TO "${table}";
        CREATE UNIQUE INDEX IF NOT EXISTS "${table}_cpf_cnpj_unique" ON "${table}" ("cpf_cnpj");
      `);
    }
  }
  const columns = new Set((await client.execute("PRAGMA table_info(clients)")).rows.map(row => row.name));
  if (!columns.has("type")) await client.execute("ALTER TABLE clients ADD COLUMN type TEXT NOT NULL DEFAULT 'TENANT'");
  await client.execute("UPDATE clients SET type = 'TENANT' WHERE type IS NULL OR type = 'INTERESTED'");
  if (!columns.has("guarantor_id")) await client.execute("ALTER TABLE clients ADD COLUMN guarantor_id TEXT REFERENCES guarantors(id) ON DELETE RESTRICT");
  const clientInfo = await client.execute("PRAGMA table_info(clients)");
  if (clientInfo.rows.some((row) => (String(row.name) === "cpf_cnpj" || String(row.name) === "phone") && Number(row.notnull) === 1)) {
    await client.executeMultiple(`
      CREATE TABLE "clients_optional" (
        "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "cpf_cnpj" text,
        "phone" text, "email" text, "created_at" integer NOT NULL, "updated_at" integer NOT NULL,
        "type" text NOT NULL DEFAULT 'TENANT', "guarantor_id" text REFERENCES guarantors(id) ON DELETE RESTRICT
      );
      INSERT INTO clients_optional SELECT id, name, cpf_cnpj, phone, email, created_at, updated_at, type, guarantor_id FROM clients;
      DROP TABLE clients;
      ALTER TABLE clients_optional RENAME TO clients;
      CREATE UNIQUE INDEX IF NOT EXISTS clients_cpf_cnpj_unique ON clients (cpf_cnpj);
    `);
  }
  await client.execute("UPDATE clients SET cpf_cnpj = replace(replace(replace(replace(trim(cpf_cnpj), '.', ''), '-', ''), '/', ''), ' ', '');");
  await client.execute("PRAGMA foreign_keys = ON");
}

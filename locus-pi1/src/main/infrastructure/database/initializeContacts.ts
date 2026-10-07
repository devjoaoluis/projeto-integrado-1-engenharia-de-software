import { Client } from "@libsql/client";

export async function initializeContacts(client: Client): Promise<void> {
  await client.executeMultiple(`
CREATE TABLE IF NOT EXISTS "guarantors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cpf_cnpj" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "guarantors_cpf_cnpj_unique" ON "guarantors" ("cpf_cnpj");
CREATE TABLE IF NOT EXISTS "owners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cpf_cnpj" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "owners_cpf_cnpj_unique" ON "owners" ("cpf_cnpj");
`);
  const columns = new Set((await client.execute("PRAGMA table_info(clients)")).rows.map(row => row.name));
  if (!columns.has("type")) await client.execute("ALTER TABLE clients ADD COLUMN type TEXT NOT NULL DEFAULT 'INTERESTED'");
  if (!columns.has("guarantor_id")) await client.execute("ALTER TABLE clients ADD COLUMN guarantor_id TEXT REFERENCES guarantors(id) ON DELETE RESTRICT");
  await client.execute("UPDATE clients SET cpf_cnpj = replace(replace(replace(replace(trim(cpf_cnpj), '.', ''), '-', ''), '/', ''), ' ', '');");
}

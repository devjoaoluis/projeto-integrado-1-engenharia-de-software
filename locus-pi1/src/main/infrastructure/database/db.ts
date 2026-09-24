import { app } from "electron";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";

const databasePath = path.join(app.getPath("userData"), "database.db");

const client = createClient({
  url: `file:${databasePath}`,
});

// Initialize tables automatically for development
client.executeMultiple(`
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
`).catch(console.error);

export const db = drizzle(client);

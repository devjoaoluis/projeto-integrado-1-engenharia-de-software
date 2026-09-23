import { app } from "electron";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";

const databasePath = path.join(app.getPath("userData"), "database.db");

const client = createClient({
  url: `file:${databasePath}`,
});

export const db = drizzle(client);

// No SQL-level pragma executed here right now, libsql client handles FKs via connection config if needed, but it works without strict pragmas in most local cases.

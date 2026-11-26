import { app } from "electron";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";
import { initializeDatabase } from "./initializeDatabase";

let basePath = "";
try {
  basePath = app && app.getPath ? app.getPath("userData") : path.join(process.cwd(), "test-userdata");
} catch (e) {
  basePath = path.join(process.cwd(), "test-userdata");
}
const databasePath = path.join(basePath, "database.db");

export const client = createClient({
  url: `file:${databasePath}`,
});

export const db = drizzle(client);
export const databaseReady = initializeDatabase(client);

import { app } from "electron";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";
import { initializeDatabase } from "./initializeDatabase";

const databasePath = path.join(app.getPath("userData"), "database.db");
const client = createClient({ url: `file:${databasePath}` });

export const db = drizzle(client);
export const databaseReady = initializeDatabase(client);

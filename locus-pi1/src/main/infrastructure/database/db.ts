import { app } from "electron";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";

const databasePath = path.join(app.getPath("userData"), "database.db");

const sqlite = new Database(databasePath);
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);

import { app } from "electron";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import fs from "fs";
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

async function initializeWithFinanceBackup(): Promise<void> {
  if (fs.existsSync(databasePath)) {
    const existingPaymentsTable = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'property_payments'",
    );
    const existingFinanceSettings = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'financial_settings'",
    );
    if (existingPaymentsTable.rows.length > 0 && existingFinanceSettings.rows.length === 0) {
      const backupPath = `${databasePath}.before-finance-${Date.now()}.bak`;
      const escapedBackupPath = backupPath.replace(/'/g, "''");
      await client.execute(`VACUUM INTO '${escapedBackupPath}'`);
    }
  }
  await initializeDatabase(client);
}

export const databaseReady = initializeWithFinanceBackup();

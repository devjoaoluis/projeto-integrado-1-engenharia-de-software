import { db, client } from "./src/main/infrastructure/database/db";
import fs from "fs";

async function run() {
  const sql = fs.readFileSync("./src/main/infrastructure/database/migrations/0002_search_filters.sql", "utf8");
  await client.executeMultiple(sql);
  
  // Backfill
  console.log("Backfilling search_normalized...");
  const properties = await client.execute("SELECT id, title, address, neighborhood FROM properties WHERE search_normalized IS NULL");
  for (const row of properties.rows) {
    const title = row.title as string;
    const address = row.address as string;
    const neighborhood = (row.neighborhood as string) || "";
    
    const searchNormalized = `${title} ${address} ${neighborhood}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
      
    await client.execute({
      sql: "UPDATE properties SET search_normalized = ? WHERE id = ?",
      args: [searchNormalized, row.id]
    });
  }
  
  console.log("Migration and backfill completed successfully.");
}

run().catch(console.error).then(() => process.exit(0));

import { client, databaseReady } from "./src/main/infrastructure/database/db";

// Startup performs the same idempotent schema upgrade and search backfill.
async function run() {
  try {
    await databaseReady;
    console.log("Migration and backfill completed successfully.");
  } finally {
    client.close();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

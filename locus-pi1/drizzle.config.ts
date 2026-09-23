import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/main/infrastructure/database/schema/*",
  out: "./src/main/infrastructure/database/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:C:/Users/proje/AppData/Roaming/locus-pi1/database.db"
  }
});

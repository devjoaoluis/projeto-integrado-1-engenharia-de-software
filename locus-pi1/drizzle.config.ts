import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/main/infrastructure/database/schema/*",
  out: "./src/main/infrastructure/database/migrations",
  dialect: "sqlite",
});

import { defineConfig } from 'drizzle-kit';
import path from 'node:path';

const appDataPath = process.env.APPDATA || '';
const dbPath = path.join(appDataPath, 'locus-pi1', 'database.db').replace(/\\/g, '/');

export default defineConfig({
  schema: './src/main/infrastructure/database/schema/*', // ou o caminho exato da sua pasta de schema
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
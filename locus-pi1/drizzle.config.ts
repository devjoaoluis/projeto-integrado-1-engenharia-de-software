import { defineConfig } from 'drizzle-kit';
import path from 'node:path';
import os from 'node:os';

const appDataPath = process.env.APPDATA || (
  process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support')
    : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
);
const dbPath = path.join(appDataPath, 'locus-pi1', 'database.db').replace(/\\/g, '/');

export default defineConfig({
  schema: './src/main/infrastructure/database/schema/*',
  out: './src/main/infrastructure/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});

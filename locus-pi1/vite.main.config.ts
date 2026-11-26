import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        '@libsql/client',
        'bcryptjs',
        'drizzle-orm',
        'drizzle-orm/libsql',
        'sqlite',
        'sqlite3',
        'better-sqlite3'
      ],
    },
  },
});

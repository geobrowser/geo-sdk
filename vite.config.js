import path from 'node:path';
import process from 'node:process';
import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile();
} catch {
  // .env file is optional
}

export default defineConfig({
  test: {
    globals: true,
    alias: {
      '~': path.resolve(__dirname, './'),
    },
  },
});

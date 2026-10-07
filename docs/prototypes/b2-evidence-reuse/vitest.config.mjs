import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../../apps/web/', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['contracts.test.tsx'], maxWorkers: 1, minWorkers: 1 },
});

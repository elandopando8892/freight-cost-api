import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Hermetic env so envalid (src/config/env.ts) validates without a real .env
    // (CI has none). api.test.ts mocks env.js separately; this covers the rest.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
      JWT_SECRET: 'test-secret-for-validation-32chars-min',
      EIA_API_KEY: '',
      CRON_SECRET: 'test-cron-secret',
    },
  },
})

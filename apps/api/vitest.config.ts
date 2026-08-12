import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Hermetic env so envalid (src/config/env.ts) validates without a real .env
    // (CI has none). api.test.ts mocks env.js separately; this covers the rest.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      EIA_API_KEY: "",
      CRON_SECRET: "test-cron-secret",
    },
    // A single fork keeps the Fastify/Prisma mocks deterministic on Windows
    // runners, where the default parallel pool has intermittently crashed.
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
  },
});

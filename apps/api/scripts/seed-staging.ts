import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { assertIsolatedNeonStagingTarget } from "../src/config/database-url.js";

const envFile = process.env.STAGING_ENV_FILE?.trim();
if (!envFile) {
  throw new Error("STAGING_ENV_FILE is required.");
}

const values = parse(readFileSync(resolve(envFile)));
const databaseUrl = assertIsolatedNeonStagingTarget({
  expectedNeonProjectId: process.env.EXPECTED_STAGING_NEON_PROJECT_ID,
  productionDatabaseUrl: values.DATABASE_URL,
  stagingDatabaseUrl:
    values.STAGING_DATABASE_URL_UNPOOLED ?? values.STAGING_POSTGRES_URL_NON_POOLING,
  stagingNeonProjectId: values.STAGING_NEON_PROJECT_ID,
});
const executable =
  process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm run db:seed -w freight-cost-api"]
    : ["run", "db:seed", "-w", "freight-cost-api"];
const result = spawnSync(
  executable,
  args,
  {
    cwd: resolve("."),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.status !== 0) {
  throw new Error("Staging seed failed.");
}
process.stdout.write("Staging reference seed completed.\n");

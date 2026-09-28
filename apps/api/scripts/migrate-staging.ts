import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { assertIsolatedNeonStagingTarget } from "../src/config/database-url.js";
import {
  assertTireV2ResearchIsSolePending,
  isTireV2ResearchMigrationConfirmed,
  pendingTireV2ResearchMigration,
  tireV2ResearchMigrationConfirmation,
} from "../src/config/tire-v2-migration-confirmation.js";

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
const commandEnvironment = { ...process.env, DATABASE_URL: databaseUrl };

function prismaMigration(
  command: "status" | "deploy",
  options: { allowPending?: boolean } = {},
) {
  const executable =
    process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npx";
  const args =
    process.platform === "win32"
      ? [
          "/d",
          "/s",
          "/c",
          `npx prisma migrate ${command} --schema prisma/schema.prisma`,
        ]
      : ["prisma", "migrate", command, "--schema", "prisma/schema.prisma"];
  const result = spawnSync(
    executable,
    args,
    {
      cwd: resolve("apps/api"),
      env: commandEnvironment,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const pending =
    options.allowPending &&
    result.status === 1 &&
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`.includes(
      "have not yet been applied",
    );
  if (result.status !== 0 && !pending) {
    throw new Error(`Prisma migrate ${command} failed.`);
  }
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

process.stdout.write("Validated isolated Neon staging migration target.\n");
const statusOutput = prismaMigration("status", { allowPending: true });
assertTireV2ResearchIsSolePending(statusOutput);
if (pendingTireV2ResearchMigration(statusOutput) && !isTireV2ResearchMigrationConfirmed({
  confirmation: process.env.FCM_TIRE_V2_RESEARCH_MIGRATION_CONFIRMATION,
  releaseSha: process.env.FCM_MIGRATION_RELEASE_SHA,
})) {
  throw new Error(
    `Pending tire v2 research migration requires FCM_TIRE_V2_RESEARCH_MIGRATION_CONFIRMATION=${tireV2ResearchMigrationConfirmation(process.env.FCM_MIGRATION_RELEASE_SHA?.trim() || '<release-sha>')} with FCM_MIGRATION_RELEASE_SHA set to the intended commit.`,
  );
}
prismaMigration("deploy");
prismaMigration("status");
process.stdout.write("Staging migrations are current.\n");

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
}

process.stdout.write("Validated isolated Neon staging migration target.\n");
prismaMigration("status", { allowPending: true });
prismaMigration("deploy");
prismaMigration("status");
process.stdout.write("Staging migrations are current.\n");

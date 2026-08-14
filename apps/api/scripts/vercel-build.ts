import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  isProductionBaselineConfirmed,
  isProductionMigrationConfirmed,
  productionBaselineConfirmation,
  productionMigrationConfirmation,
} from "../src/config/production-migration-confirmation.js";

const schema = "prisma/schema.prisma";
const baselineSchema = "prisma/baseline.prisma";
const baselineMigration = "20260811000000_baseline";

function prisma(args: string[]) {
  const executable =
    process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npx";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx prisma ${args.join(" ")}`]
      : ["prisma", ...args];
  const result = spawnSync(executable, commandArgs, {
    cwd: resolve("."),
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function requireSuccess(label: string, result: ReturnType<typeof prisma>) {
  if (result.status !== 0) throw new Error(`${label} failed.`);
}

requireSuccess("Prisma generate", prisma(["generate", "--schema", schema]));

if (process.env.VERCEL_ENV !== "production") {
  process.stdout.write("Production migrations skipped outside Vercel Production.\n");
  process.exit(0);
}

const releaseSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
if (!releaseSha) {
  throw new Error("VERCEL_GIT_COMMIT_SHA is required for a Production build.");
}

const status = prisma(["migrate", "status", "--schema", schema]);
if (status.status === 0) {
  process.stdout.write("Production database migrations are current.\n");
  process.exit(0);
}

const pending = status.output.includes("have not yet been applied");
if (!pending) {
  throw new Error("Production migration status could not be verified.");
}

if (
  !isProductionMigrationConfirmed({
    confirmation: process.env.FCM_PRODUCTION_MIGRATION_CONFIRMATION,
    releaseSha,
  })
) {
  throw new Error(
    `Pending Production migrations require FCM_PRODUCTION_MIGRATION_CONFIRMATION=${productionMigrationConfirmation(releaseSha)}.`,
  );
}

if (status.output.includes(baselineMigration)) {
  if (
    !isProductionBaselineConfirmed({
      confirmation: process.env.FCM_PRODUCTION_BASELINE_CONFIRMATION,
      releaseSha,
    })
  ) {
    throw new Error(
      `Legacy Production schema adoption requires FCM_PRODUCTION_BASELINE_CONFIRMATION=${productionBaselineConfirmation(releaseSha)}.`,
    );
  }

  const baselineDiff = prisma([
    "migrate",
    "diff",
    "--from-schema-datasource",
    baselineSchema,
    "--to-schema-datamodel",
    baselineSchema,
    "--exit-code",
  ]);
  if (baselineDiff.status !== 0) {
    throw new Error(
      "Production schema does not exactly match the approved legacy baseline; refusing adoption.",
    );
  }

  requireSuccess(
    "Production baseline adoption",
    prisma([
      "migrate",
      "resolve",
      "--applied",
      baselineMigration,
      "--schema",
      schema,
    ]),
  );
}

requireSuccess(
  "Production migration deploy",
  prisma(["migrate", "deploy", "--schema", schema]),
);
requireSuccess(
  "Production migration verification",
  prisma(["migrate", "status", "--schema", schema]),
);
process.stdout.write("Production migrations applied and verified.\n");

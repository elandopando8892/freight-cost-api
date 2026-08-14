import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  isProductionMigrationConfirmed,
  productionMigrationConfirmation,
} from "../src/config/production-migration-confirmation.js";

const schema = "prisma/schema.prisma";

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

requireSuccess(
  "Production migration deploy",
  prisma(["migrate", "deploy", "--schema", schema]),
);
requireSuccess(
  "Production migration verification",
  prisma(["migrate", "status", "--schema", schema]),
);
process.stdout.write("Production migrations applied and verified.\n");

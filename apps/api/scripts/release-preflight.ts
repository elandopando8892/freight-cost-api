import { config as loadEnv, parse as parseEnv } from "dotenv";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildReleasePreflight,
  REQUIRED_RELEASE_MIGRATIONS,
} from "../src/modules/pilot/release-preflight.js";

for (const path of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../../.env.local"),
]) {
  loadEnv({ path, override: false, quiet: true });
}

function readEnvironmentFile(path: string) {
  try {
    return parseEnv(readFileSync(path));
  } catch {
    return {};
  }
}

const webEnvironment = readEnvironmentFile(
  resolve(process.cwd(), "../web/.env.local"),
);
const requireRateware = process.argv.includes("--require-rateware");
const jsonOutput = process.argv.includes("--json");
const migrationRoot = resolve(process.cwd(), "prisma/migrations");
const migrationArtifacts = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
let gitDirtyFileCount: number | null = null;
let gitHead: string | null = null;
try {
  gitDirtyFileCount = execFileSync("git", ["status", "--porcelain"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean).length;
  gitHead = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
  }).trim();
} catch {
  // A release cannot be proven reproducible if this check is unavailable.
}

const result = buildReleasePreflight({
  environment: process.env,
  webEnvironment,
  migrationArtifacts,
  gitDirtyFileCount,
  gitHead,
  requireRateware,
  nodeVersion: process.versions.node,
});

if (jsonOutput) {
  // Deliberately omit all environment values. This payload is safe to attach to
  // QA evidence and records only the result of local, read-only checks.
  console.log(
    JSON.stringify({
      schemaVersion: "fcm.release-preflight.v1",
      generatedAt: new Date().toISOString(),
      nodeVersion: process.versions.node,
      requiredMigrationCount: REQUIRED_RELEASE_MIGRATIONS.length,
      gitHead: gitHead?.slice(0, 12) ?? null,
      requireRateware,
      remoteSystemsChecked: false,
      ...result,
    }),
  );
} else {
  console.log("Freight Cost Model — preflight de release (solo lectura)");
  for (const check of result.checks) {
    console.log(`[${check.status}] ${check.label}: ${check.detail}`);
  }
  console.log(
    `Resultado: ${result.ready ? "LISTO PARA QA REMOTA" : "BLOQUEADO"} · ${result.blockers} bloqueo(s) · ${result.warnings} advertencia(s)`,
  );
  console.log(
    `Migraciones requeridas: ${REQUIRED_RELEASE_MIGRATIONS.length}. Este comando no accede a Neon, Vercel, Kinde ni Rateware.`,
  );
}

if (!result.ready) process.exitCode = 1;

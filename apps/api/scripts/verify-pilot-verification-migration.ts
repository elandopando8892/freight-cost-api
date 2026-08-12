import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const schemaFile = resolve(root, "apps/api/prisma/schema.prisma");
const migrationFile = resolve(
  root,
  "apps/api/prisma/migrations/20260812000100_pilot_verification_evidence/migration.sql",
);
const expectedSchema = [
  "enum PilotVerificationKind",
  "enum PilotVerificationOutcome",
  "model PilotVerification",
  "pilotVerifications       PilotVerification[]",
  'PilotVerification[]         @relation("PilotVerificationActor")',
];
const expectedMigration = [
  'CREATE TYPE "PilotVerificationKind"',
  'CREATE TYPE "PilotVerificationOutcome"',
  'CREATE TABLE "PilotVerification"',
  '"releaseId" TEXT NOT NULL',
  '"checks" JSONB NOT NULL',
  '"PilotVerification_orgId_fkey"',
  '"PilotVerification_verifiedById_fkey"',
  '"PilotVerification_orgId_createdAt_idx"',
  '"PilotVerification_orgId_releaseId_idx"',
];

const findings: string[] = [];
for (const [file, requirements] of [
  [schemaFile, expectedSchema],
  [migrationFile, expectedMigration],
] as const) {
  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    findings.push(`No se puede leer ${file}.`);
    continue;
  }
  for (const requirement of requirements) {
    if (!content.includes(requirement)) {
      findings.push(`${file}: falta el contrato ${requirement}.`);
    }
  }
}

if (findings.length) {
  console.error("Contrato de migración PilotVerification falló:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Contrato Prisma/SQL de PilotVerification correcto (validación estática sin conexión).");
}

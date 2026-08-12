import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const schemaFile = resolve(root, "apps/api/prisma/schema.prisma");
const migrationFile = resolve(
  root,
  "apps/api/prisma/migrations/20260812000200_pilot_go_dual_approval/migration.sql",
);
const expectedSchema = [
  "model PilotGoApproval",
  "pilotGoApprovals         PilotGoApproval[]",
  'PilotGoApproval[]            @relation("PilotGoApprovalActor")',
  "@@unique([orgId, roundId, approvedById])",
  "goApprovals PilotGoApproval[]",
];
const expectedMigration = [
  'CREATE TABLE "PilotGoApproval"',
  '"gateFingerprint" TEXT NOT NULL',
  '"roundId" TEXT NOT NULL',
  '"decisionId" TEXT',
  '"PilotGoApproval_orgId_roundId_approvedById_key"',
  '"PilotGoApproval_orgId_fkey"',
  '"PilotGoApproval_approvedById_fkey"',
  '"PilotGoApproval_decisionId_fkey"',
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
  console.error("Contrato de migración PilotGoApproval falló:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    "Contrato Prisma/SQL de PilotGoApproval correcto (validación estática sin conexión).",
  );
}

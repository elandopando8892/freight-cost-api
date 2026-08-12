import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const schemaFile = resolve(root, "apps/api/prisma/schema.prisma");
const migrationFile = resolve(
  root,
  "apps/api/prisma/migrations/20260812000300_organization_invitations/migration.sql",
);
const expectedSchema = [
  "enum OrganizationInvitationStatus",
  "model OrganizationInvitation",
  "invitations             OrganizationInvitation[]",
  '@relation("OrganizationInvitationInviter"',
  '@relation("OrganizationInvitationAcceptor"',
  "@@index([orgId, status, createdAt])",
];
const expectedMigration = [
  'CREATE TYPE "OrganizationInvitationStatus"',
  'CREATE TABLE "OrganizationInvitation"',
  '"OrganizationInvitation_email_key"',
  '"OrganizationInvitation_orgId_fkey"',
  '"OrganizationInvitation_invitedById_fkey"',
  '"OrganizationInvitation_acceptedById_fkey"',
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
  console.error("Contrato de migración OrganizationInvitation falló:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    "Contrato Prisma/SQL de OrganizationInvitation correcto (validación estática sin conexión).",
  );
}

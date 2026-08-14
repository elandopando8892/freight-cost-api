import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const schemaFile = resolve(root, 'apps/api/prisma/schema.prisma')
const migrationFile = resolve(
  root,
  'apps/api/prisma/migrations/20260814000100_organization_member_role_audit/migration.sql',
)
const expectedSchema = [
  'model OrganizationMemberRoleAudit',
  'memberRoleAudits         OrganizationMemberRoleAudit[]',
  '@relation("OrganizationMemberRoleAuditActor"',
  '@relation("OrganizationMemberRoleAuditMember"',
  '@@index([orgId, createdAt])',
]
const expectedMigration = [
  'CREATE TABLE "OrganizationMemberRoleAudit"',
  '"OrganizationMemberRoleAudit_orgId_createdAt_idx"',
  '"OrganizationMemberRoleAudit_memberId_fkey"',
  '"OrganizationMemberRoleAudit_actorId_fkey"',
]

const findings: string[] = []
for (const [file, requirements] of [
  [schemaFile, expectedSchema],
  [migrationFile, expectedMigration],
] as const) {
  let content = ''
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    findings.push(`No se puede leer ${file}.`)
    continue
  }
  for (const requirement of requirements) {
    if (!content.includes(requirement)) {
      findings.push(`${file}: falta el contrato ${requirement}.`)
    }
  }
}

if (findings.length) {
  console.error('Contrato de migración OrganizationMemberRoleAudit falló:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exitCode = 1
} else {
  console.log('Contrato Prisma/SQL de OrganizationMemberRoleAudit correcto (validación estática sin conexión).')
}

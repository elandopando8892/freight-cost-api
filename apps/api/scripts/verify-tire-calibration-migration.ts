import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootMarker = process.argv.indexOf('--root')
const sourceRoot = rootMarker >= 0 && process.argv[rootMarker + 1]
  ? resolve(process.argv[rootMarker + 1])
  : process.cwd()
const schema = readFileSync(resolve(sourceRoot, 'apps/api/prisma/schema.prisma'), 'utf8')
const migration = readFileSync(resolve(sourceRoot, 'apps/api/prisma/migrations/20260927000100_tire_calibration_multitenant/migration.sql'), 'utf8')
const findings: string[] = []

for (const model of ['TireCohortSourceSnapshot', 'TireCohortSourceHead', 'TireCalibrationDossier', 'TireCalibrationReviewEvent', 'TireCalibrationApprovalPackage']) {
  if (!schema.includes(`model ${model} {`)) findings.push(`Missing Prisma model ${model}`)
  if (!migration.includes(`CREATE TABLE "${model}"`)) findings.push(`Missing SQL table ${model}`)
  if (!migration.includes(`ALTER TABLE "${model}" ENABLE ROW LEVEL SECURITY`)) findings.push(`RLS not enabled for ${model}`)
  if (!migration.includes(`ALTER TABLE "${model}" FORCE ROW LEVEL SECURITY`)) findings.push(`RLS not forced for ${model}`)
  if (!migration.includes(`REVOKE ALL ON TABLE "${model}" FROM PUBLIC`)) findings.push(`PUBLIC privileges not revoked for ${model}`)
}

for (const setting of ['app.current_org_id', 'app.current_user_id', 'app.current_role']) {
  if (!migration.includes(`current_setting('${setting}', true)`)) findings.push(`Missing transaction context ${setting}`)
}

for (const required of [
  'TireCalibrationDossier_orgId_authorId_fkey',
  'TireCalibrationDossier_orgId_sourceSnapshotId_fkey',
  'TireCohortSourceHead_orgId_currentSnapshotId_fkey',
  'TireCohortSourceSnapshot_append_only',
  'TireCalibrationDossier_author_owner_distinct_check',
  'TireCalibrationReviewEvent_append_only',
  'TireCalibrationApprovalPackage_append_only',
  'TireCalibrationApprovalPackage_quoteEligible_check',
  'SECURITY INVOKER',
  'WITH CHECK',
]) {
  if (!migration.includes(required)) findings.push(`Missing safeguard ${required}`)
}

for (const forbidden of [/auth\.uid\s*\(/i, /auth\.jwt\s*\(/i, /SECURITY\s+DEFINER/i, /GRANT[\s\S]{0,100}\b(?:anon|authenticated)\b/i, /\bDROP\s+(?:TABLE|SCHEMA)\b/i]) {
  if (forbidden.test(migration)) findings.push(`Forbidden migration pattern ${forbidden}`)
}

if (!schema.includes('@@unique([orgId, id])')) findings.push('Composite tenant identity key missing from Prisma schema')
if (!migration.includes('Candidate only: shared deployment is not authorized')) findings.push('Candidate-only scope marker missing')

if (findings.length) {
  console.error('Tire calibration migration contract failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log('Tire calibration migration contract correct: Neon context, forced RLS, tenant keys and append-only evidence are present; shared deployment remains unauthorized.')

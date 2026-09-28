import { z } from 'zod'

const sha = z.string().regex(/^[a-f0-9]{40}$/)
const safeKey = z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/)

export const TirePreviewReadinessEvidenceSchema = z.object({
  schemaVersion: z.literal('fcm.tire-preview-readiness.v1'),
  release: z.object({
    expectedSha: sha,
    apiSha: sha.nullable(),
    webSha: sha.nullable(),
    apiDirty: z.boolean().nullable(),
    webDirty: z.boolean().nullable(),
  }).strict(),
  database: z.object({
    migrationId: z.literal('20260927000100_tire_calibration_multitenant'),
    migrationApplied: z.boolean(),
    prismaRoleBypassRls: z.boolean().nullable(),
    backupVerified: z.boolean(),
    restoreVerified: z.boolean(),
  }).strict(),
  identities: z.array(z.object({
    identityKey: safeKey,
    orgKey: safeKey,
    role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
    loginVerified: z.boolean(),
    reloadVerified: z.boolean(),
    renewalVerified: z.boolean(),
  }).strict()).min(1),
  workflow: z.object({
    sourceCaptured: z.boolean(),
    staleSourceRejected: z.boolean(),
    dossierOpened: z.boolean(),
    reviewersAssigned: z.boolean(),
    economicDecisionRecorded: z.boolean(),
    independentDecisionRecorded: z.boolean(),
    approvalPackageReadAfterReload: z.boolean(),
    crossTenantDenied: z.boolean(),
  }).strict(),
  productionEnabled: z.literal(false),
}).strict()

export type TirePreviewReadinessStatus = 'PASS' | 'BLOCK'

export type TirePreviewReadinessCheck = {
  key: string
  status: TirePreviewReadinessStatus
  detail: string
}

export function evaluateTirePreviewReadiness(input: unknown) {
  const evidence = TirePreviewReadinessEvidenceSchema.parse(input)
  const checks: TirePreviewReadinessCheck[] = []
  const artifactPair = evidence.release.apiSha === evidence.release.expectedSha &&
    evidence.release.webSha === evidence.release.expectedSha &&
    evidence.release.apiDirty === false && evidence.release.webDirty === false
  checks.push({
    key: 'IMMUTABLE_ARTIFACT_PAIR', status: artifactPair ? 'PASS' : 'BLOCK',
    detail: artifactPair
      ? 'API y web corresponden al mismo commit limpio.'
      : 'API y web deben corresponder al mismo commit limpio antes de QA autenticada.',
  })

  checks.push({
    key: 'ISOLATED_MIGRATION', status: evidence.database.migrationApplied ? 'PASS' : 'BLOCK',
    detail: evidence.database.migrationApplied
      ? 'La migración candidata está aplicada en la base aislada de preview.'
      : 'La migración candidata no está acreditada en una base aislada de preview.',
  })
  checks.push({
    key: 'PRISMA_ROLE_RLS', status: evidence.database.prismaRoleBypassRls === false ? 'PASS' : 'BLOCK',
    detail: evidence.database.prismaRoleBypassRls === false
      ? 'El rol Prisma verificado no puede omitir RLS.'
      : 'Debe probarse que el rol Prisma efectivo no tiene BYPASSRLS.',
  })
  const rollbackReady = evidence.database.backupVerified && evidence.database.restoreVerified
  checks.push({
    key: 'ROLLBACK_REHEARSED', status: rollbackReady ? 'PASS' : 'BLOCK',
    detail: rollbackReady
      ? 'Backup y restauración fueron verificados antes de la prueba.'
      : 'Falta verificar backup y restauración de la base aislada.',
  })

  const identityKeys = new Set(evidence.identities.map(identity => identity.identityKey))
  const orgKeys = new Set(evidence.identities.map(identity => identity.orgKey))
  const identitySetReady = identityKeys.size >= 3 && identityKeys.size === evidence.identities.length && orgKeys.size === 1
  checks.push({
    key: 'THREE_SAME_TENANT_IDENTITIES', status: identitySetReady ? 'PASS' : 'BLOCK',
    detail: identitySetReady
      ? 'Hay tres o más identidades distintas del mismo tenant.'
      : 'Se requieren tres identidades distintas del mismo tenant, sin reutilizar cuentas.',
  })
  const admins = evidence.identities.filter(identity => identity.role === 'ADMIN')
  const authors = evidence.identities.filter(identity => identity.role === 'ADMIN' || identity.role === 'OPERATOR')
  const dutiesReady = authors.some(author => admins.filter(admin => admin.identityKey !== author.identityKey).length >= 2)
  checks.push({
    key: 'SEPARATION_OF_DUTIES', status: dutiesReady ? 'PASS' : 'BLOCK',
    detail: dutiesReady
      ? 'Existe un autor y dos ADMIN diferentes para los dictámenes.'
      : 'El flujo necesita un autor y dos ADMIN distintos; VIEWER no sustituye a un revisor.',
  })
  const sessionsReady = evidence.identities.length >= 3 && evidence.identities.every(identity =>
    identity.loginVerified && identity.reloadVerified && identity.renewalVerified)
  checks.push({
    key: 'AUTHENTICATED_SESSION_LIFECYCLE', status: sessionsReady ? 'PASS' : 'BLOCK',
    detail: sessionsReady
      ? 'Login, recarga y renovación están acreditados para todas las identidades.'
      : 'Falta acreditar login, recarga y renovación para cada identidad del ensayo.',
  })
  const workflowReady = Object.values(evidence.workflow).every(Boolean)
  checks.push({
    key: 'END_TO_END_WORKFLOW', status: workflowReady ? 'PASS' : 'BLOCK',
    detail: workflowReady
      ? 'El flujo completo y los rechazos de seguridad quedaron observados.'
      : 'La cobertura de configuración no equivale todavía a una prueba autenticada completa.',
  })
  checks.push({
    key: 'PRODUCTION_DISABLED', status: 'PASS',
    detail: 'La evidencia declara producción deshabilitada; el contrato no admite true.',
  })
  return {
    schemaVersion: 'fcm.tire-preview-readiness-result.v1' as const,
    ready: checks.every(check => check.status === 'PASS'),
    blockers: checks.filter(check => check.status === 'BLOCK').length,
    checks,
  }
}

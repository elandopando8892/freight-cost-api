import { z } from 'zod'

const sha = z.string().regex(/^[a-f0-9]{40}$/)
const safeKey = z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/)

export const TirePreviewReadinessEvidenceSchema = z.object({
  schemaVersion: z.literal('fcm.tire-preview-readiness.v1'),
  reviewMode: z.enum(['DUAL_REVIEW', 'ECONOMIC_ONLY']).default('DUAL_REVIEW'),
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
    economicReviewMigrationApplied: z.boolean().default(false),
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
    economicDecisionReadAfterReload: z.boolean().default(false),
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
  if (evidence.reviewMode === 'ECONOMIC_ONLY') checks.push({
    key: 'ECONOMIC_REVIEW_MIGRATION', status: evidence.database.economicReviewMigrationApplied ? 'PASS' : 'BLOCK',
    detail: 'La modalidad individual requiere la migración 20260928000100_tire_economic_review en la base aislada.',
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
  const economicOnly = evidence.reviewMode === 'ECONOMIC_ONLY'
  const requiredIdentities = economicOnly ? 2 : 3
  const identitySetReady = identityKeys.size >= requiredIdentities && identityKeys.size === evidence.identities.length && orgKeys.size === 1
  checks.push({
    key: economicOnly ? 'TWO_SAME_TENANT_IDENTITIES' : 'THREE_SAME_TENANT_IDENTITIES', status: identitySetReady ? 'PASS' : 'BLOCK',
    detail: identitySetReady
      ? `Hay ${requiredIdentities} o más identidades distintas del mismo tenant.`
      : `Se requieren ${requiredIdentities} identidades distintas del mismo tenant, sin reutilizar cuentas.`,
  })
  const admins = evidence.identities.filter(identity => identity.role === 'ADMIN')
  const authors = evidence.identities.filter(identity => identity.role === 'ADMIN' || identity.role === 'OPERATOR')
  const dutiesReady = authors.some(author => admins.filter(admin => admin.identityKey !== author.identityKey).length >= (economicOnly ? 1 : 2))
  checks.push({
    key: 'SEPARATION_OF_DUTIES', status: dutiesReady ? 'PASS' : 'BLOCK',
    detail: dutiesReady
      ? (economicOnly ? 'Existe un autor y un ADMIN distinto para la revisión económica.' : 'Existe un autor y dos ADMIN diferentes para los dictámenes.')
      : (economicOnly ? 'Se necesita un autor y un ADMIN distinto; VIEWER no sustituye al revisor.' : 'El flujo necesita un autor y dos ADMIN distintos; VIEWER no sustituye a un revisor.'),
  })
  const sessionsReady = evidence.identities.length >= requiredIdentities && evidence.identities.every(identity =>
    identity.loginVerified && identity.reloadVerified && identity.renewalVerified)
  checks.push({
    key: 'AUTHENTICATED_SESSION_LIFECYCLE', status: sessionsReady ? 'PASS' : 'BLOCK',
    detail: sessionsReady
      ? 'Login, recarga y renovación están acreditados para todas las identidades.'
      : 'Falta acreditar login, recarga y renovación para cada identidad del ensayo.',
  })
  const { independentDecisionRecorded, approvalPackageReadAfterReload, economicDecisionReadAfterReload, ...commonWorkflow } = evidence.workflow
  const workflowReady = Object.values(commonWorkflow).every(Boolean) && (economicOnly
    ? economicDecisionReadAfterReload && !independentDecisionRecorded && !approvalPackageReadAfterReload
    : independentDecisionRecorded && approvalPackageReadAfterReload)
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

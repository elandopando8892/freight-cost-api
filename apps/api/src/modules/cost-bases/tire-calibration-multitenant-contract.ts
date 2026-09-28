import { createHash } from 'node:crypto'
import { z } from 'zod'

const text = z.string().trim().min(1)
const hash = z.string().regex(/^[a-f0-9]{64}$/)

export const TireCalibrationTenantIdentitySchema = z.object({
  internalUserId: text,
  supabaseId: z.string().uuid(),
  orgId: text,
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
}).strict()

export const TireCalibrationTenantActionSchema = z.enum([
  'READ_DOSSIER',
  'OPEN_DRAFT',
  'ASSIGN_REVIEWERS',
  'RECORD_ECONOMIC_DECISION',
  'RECORD_INDEPENDENT_DECISION',
  'PUBLISH_PARAMETERS',
  'ACTIVATE_COST_BASE',
])

export const TireCalibrationTenantContextSchema = z.object({
  actor: TireCalibrationTenantIdentitySchema,
  action: TireCalibrationTenantActionSchema,
  resourceOrgId: text,
  status: z.enum(['NEW', 'DRAFT', 'PENDING_ECONOMIC', 'PENDING_INDEPENDENT', 'RETURNED', 'REJECTED', 'REVIEWED']),
  expectedRevision: z.number().int().nonnegative(),
  currentRevision: z.number().int().nonnegative(),
  expectedProposalFingerprint: hash.nullable(),
  storedProposalFingerprint: hash.nullable(),
  currentSourceAggregationFingerprint: hash.nullable(),
  storedSourceAggregationFingerprint: hash.nullable(),
  authorId: text.nullable(),
  economicOwnerId: text.nullable(),
  independentReviewerId: text.nullable(),
}).strict()

type TenantContext = z.infer<typeof TireCalibrationTenantContextSchema>
type Action = z.infer<typeof TireCalibrationTenantActionSchema>
type Role = TenantContext['actor']['role']

const actionRoles: Record<Action, Role[]> = {
  READ_DOSSIER: ['ADMIN', 'OPERATOR', 'VIEWER'],
  OPEN_DRAFT: ['ADMIN', 'OPERATOR'],
  ASSIGN_REVIEWERS: ['ADMIN', 'OPERATOR'],
  RECORD_ECONOMIC_DECISION: ['ADMIN'],
  RECORD_INDEPENDENT_DECISION: ['ADMIN'],
  PUBLISH_PARAMETERS: [],
  ACTIVATE_COST_BASE: [],
}

const requiredState: Partial<Record<Action, TenantContext['status']>> = {
  OPEN_DRAFT: 'NEW',
  ASSIGN_REVIEWERS: 'DRAFT',
  RECORD_ECONOMIC_DECISION: 'PENDING_ECONOMIC',
  RECORD_INDEPENDENT_DECISION: 'PENDING_INDEPENDENT',
}

export type TireCalibrationAuthorizationDecision = {
  allowed: boolean
  concealResource: boolean
  code: string
  requiredRole: Role[]
  checks: string[]
}

/** Pure policy used to specify the future API/database adapter. It performs no reads or writes. */
export function authorizeTireCalibrationTenantAction(input: unknown): TireCalibrationAuthorizationDecision {
  const context = TireCalibrationTenantContextSchema.parse(input)
  const checks: string[] = []
  const requiredRole = actionRoles[context.action]
  if (context.actor.orgId !== context.resourceOrgId) return { allowed: false, concealResource: true, code: 'TENANT_RESOURCE_NOT_FOUND', requiredRole, checks: ['TENANT_MATCH_FAILED'] }
  checks.push('TENANT_MATCHED')
  if (!requiredRole.length) return { allowed: false, concealResource: false, code: 'SEPARATE_PRODUCTION_AUTHORIZATION_REQUIRED', requiredRole, checks }
  if (!requiredRole.includes(context.actor.role)) return { allowed: false, concealResource: false, code: 'ROLE_FORBIDDEN', requiredRole, checks }
  checks.push('ROLE_ALLOWED')
  if (context.action === 'READ_DOSSIER') return { allowed: true, concealResource: false, code: 'ALLOWED', requiredRole, checks }

  if (context.expectedRevision !== context.currentRevision) return { allowed: false, concealResource: false, code: 'REVISION_CONFLICT', requiredRole, checks }
  checks.push('REVISION_MATCHED')
  const state = requiredState[context.action]
  if (state && context.status !== state) return { allowed: false, concealResource: false, code: 'STATE_TRANSITION_FORBIDDEN', requiredRole, checks }
  checks.push('STATE_MATCHED')

  if (context.action !== 'OPEN_DRAFT') {
    if (!context.expectedProposalFingerprint || context.expectedProposalFingerprint !== context.storedProposalFingerprint) return { allowed: false, concealResource: false, code: 'PROPOSAL_FINGERPRINT_CONFLICT', requiredRole, checks }
    checks.push('PROPOSAL_FINGERPRINT_MATCHED')
    if (!context.currentSourceAggregationFingerprint || context.currentSourceAggregationFingerprint !== context.storedSourceAggregationFingerprint) return { allowed: false, concealResource: false, code: 'SOURCE_FINGERPRINT_STALE', requiredRole, checks }
    checks.push('SOURCE_FINGERPRINT_MATCHED')
  }

  if (context.action === 'ASSIGN_REVIEWERS' && context.actor.internalUserId !== context.authorId) return { allowed: false, concealResource: false, code: 'ONLY_AUTHOR_CAN_ASSIGN', requiredRole, checks }
  if (context.action === 'RECORD_ECONOMIC_DECISION' && context.actor.internalUserId !== context.economicOwnerId) return { allowed: false, concealResource: false, code: 'ASSIGNED_ECONOMIC_OWNER_REQUIRED', requiredRole, checks }
  if (context.action === 'RECORD_INDEPENDENT_DECISION' && context.actor.internalUserId !== context.independentReviewerId) return { allowed: false, concealResource: false, code: 'ASSIGNED_INDEPENDENT_REVIEWER_REQUIRED', requiredRole, checks }
  if (context.action !== 'OPEN_DRAFT') checks.push('ACTOR_ASSIGNMENT_MATCHED')

  const assigned = [context.authorId, context.economicOwnerId, context.independentReviewerId].filter(Boolean)
  if (assigned.length > 1 && new Set(assigned).size !== assigned.length) return { allowed: false, concealResource: false, code: 'SEPARATION_OF_DUTIES_REQUIRED', requiredRole, checks }
  checks.push('SEPARATION_OF_DUTIES_SATISFIED')
  return { allowed: true, concealResource: false, code: 'ALLOWED', requiredRole, checks }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}

export const TIRE_CALIBRATION_PERMISSION_MATRIX = [
  { action: 'READ_DOSSIER', admin: true, operator: true, viewer: true, assignment: 'SAME_ORG' },
  { action: 'OPEN_DRAFT', admin: true, operator: true, viewer: false, assignment: 'AUTHOR_CREATED' },
  { action: 'ASSIGN_REVIEWERS', admin: true, operator: true, viewer: false, assignment: 'AUTHOR_ONLY' },
  { action: 'RECORD_ECONOMIC_DECISION', admin: true, operator: false, viewer: false, assignment: 'ASSIGNED_OWNER_ONLY' },
  { action: 'RECORD_INDEPENDENT_DECISION', admin: true, operator: false, viewer: false, assignment: 'ASSIGNED_REVIEWER_ONLY' },
  { action: 'PUBLISH_PARAMETERS', admin: false, operator: false, viewer: false, assignment: 'SEPARATE_AUTHORIZATION' },
  { action: 'ACTIVATE_COST_BASE', admin: false, operator: false, viewer: false, assignment: 'SEPARATE_AUTHORIZATION' },
] as const

/** Reviewed Sprint 10 blueprint. The candidate exists locally but is not applied to shared Neon. */
export function buildTireCalibrationPersistenceBlueprint() {
  const blueprint = {
    version: 3,
    status: 'CANDIDATE_MIGRATION_LOCALLY_VALIDATED' as const,
    migrationId: '20260927000100_tire_calibration_multitenant' as const,
    accessPath: 'FASTIFY_PRISMA_AUTHORITATIVE' as const,
    supabaseAuthMapping: 'SUPABASE_SUB_TO_INTERNAL_USER_SUPABASE_ID' as const,
    operationalDatabase: 'NEON_POSTGRESQL' as const,
    tenantAuthority: 'INTERNAL_USER_ORG_ID' as const,
    jwtAuthorizationClaims: 'NOT_USED_FOR_DOMAIN_AUTHORIZATION' as const,
    dataApiExposure: 'NOT_APPLICABLE_OPERATIONAL_DATABASE_IS_NEON' as const,
    tables: [
      { name: 'TireCohortSourceSnapshot', purpose: 'Immutable tenant source records, policy and recomputable aggregation fingerprint', tenantColumn: 'orgId', keys: ['id', 'orgId+cohortKey+version', 'orgId+requestId'], mutable: false },
      { name: 'TireCohortSourceHead', purpose: 'Versioned pointer to the current authoritative source per tenant cohort', tenantColumn: 'orgId', keys: ['id', 'orgId+cohortKey'], mutable: true },
      { name: 'TireCalibrationDossier', purpose: 'Current tenant-scoped projection and immutable proposal snapshot', tenantColumn: 'orgId', keys: ['id', 'orgId+proposalId'], mutable: true },
      { name: 'TireCalibrationReviewEvent', purpose: 'Append-only command and decision ledger', tenantColumn: 'orgId', keys: ['id', 'orgId+requestId', 'dossierId+sequence'], mutable: false },
      { name: 'TireCalibrationApprovalPackage', purpose: 'Non-executable reviewed evidence package', tenantColumn: 'orgId', keys: ['id', 'orgId+dossierId', 'packageFingerprint'], mutable: false },
    ],
    constraints: [
      'SOURCE_SNAPSHOT_APPEND_ONLY', 'SOURCE_HEAD_VERSIONED', 'SOURCE_FINGERPRINT_RECOMPUTED_SERVER_SIDE',
      'AUTHOR_OWNER_REVIEWER_DISTINCT', 'PROPOSAL_FINGERPRINT_IMMUTABLE', 'SOURCE_FINGERPRINT_REQUIRED',
      'EVENT_APPEND_ONLY', 'EVENT_HASH_CHAIN', 'IDEMPOTENT_REQUEST_PER_TENANT', 'PACKAGE_NOT_QUOTE_ELIGIBLE',
    ],
    transactionOrder: [
      'BEGIN', 'RESOLVE_INTERNAL_USER_BY_SUPABASE_ID', 'LOCK_ORGANIZATION', 'READ_AUTHORITATIVE_SOURCE_HEAD', 'RECOMPUTE_SOURCE_FINGERPRINT',
      'LOCK_DOSSIER', 'ASSERT_TENANT', 'ASSERT_ROLE', 'ASSERT_REVISION', 'ASSERT_STATE', 'ASSERT_PROPOSAL_FINGERPRINT', 'ASSERT_CURRENT_SOURCE_FINGERPRINT',
      'ASSERT_ASSIGNED_ACTOR', 'ASSERT_SEPARATION_OF_DUTIES', 'UPDATE_PROJECTION', 'APPEND_EVENT', 'OPTIONALLY_CREATE_EVIDENCE_PACKAGE', 'COMMIT',
    ],
    rls: {
      enabled: true,
      forced: true,
      sourceOfTenantMembership: 'TRANSACTION_LOCAL_CONTEXT_FROM_RESOLVED_INTERNAL_USER' as const,
      contextKeys: ['app.current_org_id', 'app.current_user_id', 'app.current_role'],
      contextLifetime: 'TRANSACTION_LOCAL' as const,
      userMetadataAllowed: false,
      jwtClaimsUsed: false,
      updateRequiresUsingAndWithCheck: true,
      securityDefinerAllowed: false,
      tables: ['TireCohortSourceSnapshot', 'TireCohortSourceHead', 'TireCalibrationDossier', 'TireCalibrationReviewEvent', 'TireCalibrationApprovalPackage'],
    },
    grants: { public: [] as string[], browserRoles: [] as string[], applicationRoleRequiresExplicitGrant: true },
    requiredTests: [
      'ANON_DENIED', 'UNAUTHENTICATED_DENIED', 'CROSS_TENANT_SELECT_DENIED', 'CROSS_TENANT_INSERT_DENIED',
      'CROSS_TENANT_UPDATE_DENIED', 'CROSS_TENANT_DELETE_DENIED', 'VIEWER_WRITE_DENIED', 'OPERATOR_DECISION_DENIED',
      'ADMIN_UNASSIGNED_DECISION_DENIED', 'STALE_JWT_MEMBERSHIP_DENIED_BY_AUTHORITATIVE_LOOKUP', 'APPEND_ONLY_EVENT_DENIED',
      'SOURCE_SNAPSHOT_APPEND_ONLY_DENIED', 'SOURCE_FINGERPRINT_FROM_AUTHORITATIVE_HEAD', 'STALE_SOURCE_HANDOFF_DENIED',
    ],
    rolloutGates: ['CANDIDATE_SCHEMA_AUTHORIZED', 'LOCAL_POSTGRES_TESTS_COMPLETE', 'RLS_ALLOW_DENY_TESTS_COMPLETE', 'AUTHORITATIVE_SOURCE_RESOLVER_COMPLETE', 'AUTHENTICATED_PREVIEW', 'SHARED_NEON_AUTHORIZATION'],
    rollback: ['DROP_NEW_POLICIES', 'REVOKE_NEW_GRANTS', 'DROP_NEW_TABLES_ONLY_IF_EMPTY_OR_EXPLICITLY_AUTHORIZED'],
  }
  return { ...blueprint, fingerprint: createHash('sha256').update(canonical(blueprint)).digest('hex') }
}

import { describe, expect, it } from 'vitest'
import {
  authorizeTireCalibrationTenantAction,
  buildTireCalibrationPersistenceBlueprint,
  TIRE_CALIBRATION_PERMISSION_MATRIX,
} from '../src/modules/cost-bases/tire-calibration-multitenant-contract'

const proposal = 'a'.repeat(64)
const source = 'b'.repeat(64)
const base = {
  actor: { internalUserId: 'analyst-1', supabaseId: '00000000-0000-4000-8000-000000000001', orgId: 'org-a', role: 'OPERATOR' },
  action: 'ASSIGN_REVIEWERS', resourceOrgId: 'org-a', status: 'DRAFT', expectedRevision: 1, currentRevision: 1,
  expectedProposalFingerprint: proposal, storedProposalFingerprint: proposal,
  currentSourceAggregationFingerprint: source, storedSourceAggregationFingerprint: source,
  authorId: 'analyst-1', economicOwnerId: 'owner-1', independentReviewerId: 'reviewer-1',
} as const

describe('tire calibration multi-tenant contract', () => {
  it('requires explicit economic-only mode without faking an independent reviewer', () => {
    expect(authorizeTireCalibrationTenantAction({ ...base, independentReviewerId: null }).code).toBe('REVIEWER_ASSIGNMENT_REQUIRED')
    expect(authorizeTireCalibrationTenantAction({ ...base, reviewMode: 'ECONOMIC_ONLY', independentReviewerId: null }).allowed).toBe(true)
    expect(authorizeTireCalibrationTenantAction({ ...base, reviewMode: 'ECONOMIC_ONLY' }).code).toBe('INDEPENDENT_REVIEW_NOT_APPLICABLE')
    expect(authorizeTireCalibrationTenantAction({ ...base, reviewMode: 'ECONOMIC_ONLY', independentReviewerId: null, economicOwnerId: base.authorId }).code).toBe('SEPARATION_OF_DUTIES_REQUIRED')
  })
  it('conceals cross-tenant resources before evaluating role or state', () => {
    const result = authorizeTireCalibrationTenantAction({ ...base, resourceOrgId: 'org-b' })
    expect(result).toMatchObject({ allowed: false, concealResource: true, code: 'TENANT_RESOURCE_NOT_FOUND' })
    expect(result.checks).toEqual(['TENANT_MATCH_FAILED'])
  })

  it('allows every internal role to read only inside its tenant', () => {
    for (const role of ['ADMIN', 'OPERATOR', 'VIEWER'] as const) {
      expect(authorizeTireCalibrationTenantAction({ ...base, action: 'READ_DOSSIER', actor: { ...base.actor, role } }).allowed).toBe(true)
    }
  })

  it('allows an operator to open a draft and assign only their own dossier', () => {
    const open = authorizeTireCalibrationTenantAction({ ...base, action: 'OPEN_DRAFT', status: 'NEW', expectedRevision: 0, currentRevision: 0,
      expectedProposalFingerprint: null, storedProposalFingerprint: null, currentSourceAggregationFingerprint: null, storedSourceAggregationFingerprint: null,
      authorId: null, economicOwnerId: null, independentReviewerId: null })
    expect(open.allowed).toBe(true)
    expect(authorizeTireCalibrationTenantAction(base).allowed).toBe(true)
    expect(authorizeTireCalibrationTenantAction({ ...base, actor: { ...base.actor, internalUserId: 'other-operator' } }).code).toBe('ONLY_AUTHOR_CAN_ASSIGN')
  })

  it('requires ADMIN plus the exact assigned identity for each decision', () => {
    const owner = { ...base, action: 'RECORD_ECONOMIC_DECISION', status: 'PENDING_ECONOMIC', expectedRevision: 2, currentRevision: 2,
      actor: { ...base.actor, internalUserId: 'owner-1', role: 'ADMIN' } } as const
    expect(authorizeTireCalibrationTenantAction(owner).allowed).toBe(true)
    expect(authorizeTireCalibrationTenantAction({ ...owner, actor: { ...owner.actor, role: 'OPERATOR' } }).code).toBe('ROLE_FORBIDDEN')
    expect(authorizeTireCalibrationTenantAction({ ...owner, actor: { ...owner.actor, internalUserId: 'admin-unassigned' } }).code).toBe('ASSIGNED_ECONOMIC_OWNER_REQUIRED')
    const review = { ...base, action: 'RECORD_INDEPENDENT_DECISION', status: 'PENDING_INDEPENDENT', expectedRevision: 3, currentRevision: 3,
      actor: { ...base.actor, internalUserId: 'reviewer-1', role: 'ADMIN' } } as const
    expect(authorizeTireCalibrationTenantAction(review).allowed).toBe(true)
  })

  it('rejects one person filling two duties and stale source handoffs', () => {
    expect(authorizeTireCalibrationTenantAction({ ...base, independentReviewerId: 'owner-1' }).code).toBe('SEPARATION_OF_DUTIES_REQUIRED')
    expect(authorizeTireCalibrationTenantAction({ ...base, currentSourceAggregationFingerprint: 'c'.repeat(64) }).code).toBe('SOURCE_FINGERPRINT_STALE')
    expect(authorizeTireCalibrationTenantAction({ ...base, expectedProposalFingerprint: 'd'.repeat(64) }).code).toBe('PROPOSAL_FINGERPRINT_CONFLICT')
  })

  it('keeps publication and activation outside the sprint even for ADMIN', () => {
    for (const action of ['PUBLISH_PARAMETERS', 'ACTIVATE_COST_BASE'] as const) {
      const result = authorizeTireCalibrationTenantAction({ ...base, action, actor: { ...base.actor, role: 'ADMIN' } })
      expect(result).toMatchObject({ allowed: false, code: 'SEPARATE_PRODUCTION_AUTHORIZATION_REQUIRED' })
    }
  })

  it('specifies the locally validated Neon/Prisma RLS candidate', () => {
    const blueprint = buildTireCalibrationPersistenceBlueprint()
    expect(blueprint.status).toBe('CANDIDATE_MIGRATION_LOCALLY_VALIDATED')
    expect(blueprint.accessPath).toBe('FASTIFY_PRISMA_AUTHORITATIVE')
    expect(blueprint.operationalDatabase).toBe('NEON_POSTGRESQL')
    expect(blueprint.dataApiExposure).toBe('NOT_APPLICABLE_OPERATIONAL_DATABASE_IS_NEON')
    expect(blueprint.rls).toMatchObject({ enabled: true, forced: true, sourceOfTenantMembership: 'TRANSACTION_LOCAL_CONTEXT_FROM_RESOLVED_INTERNAL_USER', contextLifetime: 'TRANSACTION_LOCAL', userMetadataAllowed: false, securityDefinerAllowed: false })
    expect(blueprint.grants.public).toEqual([])
    expect(blueprint.grants.browserRoles).toEqual([])
    expect(blueprint.tables.map(table => table.name)).toEqual([
      'TireCohortSourceSnapshot', 'TireCohortSourceHead', 'TireCalibrationDossier',
      'TireCalibrationReviewEvent', 'TireCalibrationApprovalPackage',
    ])
    expect(blueprint.transactionOrder).toContain('RECOMPUTE_SOURCE_FINGERPRINT')
    expect(blueprint.transactionOrder.indexOf('ASSERT_TENANT')).toBeLessThan(blueprint.transactionOrder.indexOf('APPEND_EVENT'))
    expect(blueprint.requiredTests).toContain('CROSS_TENANT_SELECT_DENIED')
    expect(blueprint.requiredTests).toContain('SOURCE_FINGERPRINT_FROM_AUTHORITATIVE_HEAD')
    expect(blueprint.fingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  it('publishes a permission matrix with no role capable of production actions', () => {
    const production = TIRE_CALIBRATION_PERMISSION_MATRIX.filter(row => row.action === 'PUBLISH_PARAMETERS' || row.action === 'ACTIVATE_COST_BASE')
    expect(production).toHaveLength(2)
    expect(production.every(row => !row.admin && !row.operator && !row.viewer)).toBe(true)
  })
})

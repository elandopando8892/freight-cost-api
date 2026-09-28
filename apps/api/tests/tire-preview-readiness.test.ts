import { describe, expect, it } from 'vitest'
import { evaluateTirePreviewReadiness } from '../src/modules/cost-bases/tire-preview-readiness.js'

const releaseSha = 'a'.repeat(40)
const identity = (identityKey: string, role: 'ADMIN' | 'OPERATOR' | 'VIEWER') => ({
  identityKey, orgKey: 'tenant-rateware', role,
  loginVerified: true, reloadVerified: true, renewalVerified: true,
})
const complete = {
  schemaVersion: 'fcm.tire-preview-readiness.v1',
  release: { expectedSha: releaseSha, apiSha: releaseSha, webSha: releaseSha, apiDirty: false, webDirty: false },
  database: {
    migrationId: '20260927000100_tire_calibration_multitenant', migrationApplied: true,
    prismaRoleBypassRls: false, backupVerified: true, restoreVerified: true,
  },
  identities: [identity('author-operator', 'OPERATOR'), identity('economic-admin', 'ADMIN'), identity('review-admin', 'ADMIN')],
  workflow: {
    sourceCaptured: true, staleSourceRejected: true, dossierOpened: true, reviewersAssigned: true,
    economicDecisionRecorded: true, independentDecisionRecorded: true,
    approvalPackageReadAfterReload: true, crossTenantDenied: true,
  },
  productionEnabled: false,
} as const

describe('tire authenticated preview readiness', () => {
  it('passes only a clean paired release with isolated database and separated duties', () => {
    expect(evaluateTirePreviewReadiness(complete)).toMatchObject({ ready: true, blockers: 0 })
  })

  it('blocks the current one-admin roster shape', () => {
    const result = evaluateTirePreviewReadiness({
      ...complete,
      identities: [identity('sales-admin', 'ADMIN'), identity('primary-operator', 'OPERATOR'), identity('xbf-viewer', 'VIEWER')],
    })
    expect(result.ready).toBe(false)
    expect(result.checks.find(check => check.key === 'SEPARATION_OF_DUTIES')).toMatchObject({ status: 'BLOCK' })
  })

  it('accepts three administrators when each duty uses a different identity', () => {
    const result = evaluateTirePreviewReadiness({
      ...complete,
      identities: [identity('author-admin', 'ADMIN'), identity('economic-admin', 'ADMIN'), identity('review-admin', 'ADMIN')],
    })
    expect(result).toMatchObject({ ready: true, blockers: 0 })
  })

  it('does not accept a dirty or mismatched deployment pair', () => {
    const result = evaluateTirePreviewReadiness({ ...complete, release: { ...complete.release, apiDirty: true, webSha: 'b'.repeat(40) } })
    expect(result.checks.find(check => check.key === 'IMMUTABLE_ARTIFACT_PAIR')).toMatchObject({ status: 'BLOCK' })
  })

  it('distinguishes environment coverage from authenticated workflow evidence', () => {
    const result = evaluateTirePreviewReadiness({
      ...complete,
      database: { ...complete.database, migrationApplied: false, prismaRoleBypassRls: null, backupVerified: false, restoreVerified: false },
      identities: complete.identities.map(item => ({ ...item, renewalVerified: false })),
      workflow: { ...complete.workflow, sourceCaptured: false },
    })
    expect(result.ready).toBe(false)
    expect(result.blockers).toBe(5)
  })

  it('rejects unsafe or identifying evidence shapes', () => {
    expect(() => evaluateTirePreviewReadiness({ ...complete, identities: [{ ...complete.identities[0], identityKey: 'person@example.com' }] })).toThrow()
    expect(() => evaluateTirePreviewReadiness({ ...complete, productionEnabled: true })).toThrow()
  })
})

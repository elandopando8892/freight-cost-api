import { describe, expect, it } from 'vitest'
import {
  assertTireV2ResearchIsSolePending, isTireV2ResearchMigrationConfirmed, pendingTireV2ResearchMigration,
  tireV2ResearchMigrationConfirmation,
} from '../src/config/tire-v2-migration-confirmation.js'

describe('tire v2 migration release gate', () => {
  it('recognizes only the named pending migration', () => {
    expect(pendingTireV2ResearchMigration('The following migration(s) have not yet been applied:\n20260928000200_tire_cohort_v2_research')).toBe(true)
    expect(pendingTireV2ResearchMigration('20260928000100_tire_economic_review')).toBe(false)
  })

  it('requires a commit-specific explicit confirmation', () => {
    const releaseSha = 'abc123'
    expect(isTireV2ResearchMigrationConfirmed({ releaseSha })).toBe(false)
    expect(isTireV2ResearchMigrationConfirmed({ releaseSha, confirmation: tireV2ResearchMigrationConfirmation('old-sha') })).toBe(false)
    expect(isTireV2ResearchMigrationConfirmed({ releaseSha, confirmation: tireV2ResearchMigrationConfirmation(releaseSha) })).toBe(true)
    expect(isTireV2ResearchMigrationConfirmed({ confirmation: tireV2ResearchMigrationConfirmation(releaseSha) })).toBe(false)
  })

  it('refuses a v2 approval when Prisma would also apply identity or other migrations', () => {
    const pending = 'The following migration(s) have not yet been applied:\n20260830000200_finalize_supabase_identity\n20260927000100_tire_calibration_multitenant\n20260928000100_tire_economic_review\n20260928000200_tire_cohort_v2_research'
    expect(() => assertTireV2ResearchIsSolePending(pending)).toThrow('TIRE_V2_MIGRATION_SCOPE_CONFLICT')
    expect(() => assertTireV2ResearchIsSolePending('The following migration(s) have not yet been applied:\n20260928000200_tire_cohort_v2_research')).not.toThrow()
    expect(() => assertTireV2ResearchIsSolePending('No pending migrations')).not.toThrow()
  })
})

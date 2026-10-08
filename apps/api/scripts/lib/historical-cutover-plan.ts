import { createHash } from 'node:crypto'
import { buildMigrationInventoryPlan, type ProductionCutoverPlanInput } from './production-cutover-plan.js'
import { buildScopedAccessPlan } from './scoped-access-plan.js'
import type { FcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'

export const PRESERVE_HISTORICAL_AUTHORS = '20261008052054_preserve_historical_authors'
/** Review-only bridge. All rows participate in the fingerprint; only approved
 * identities are linked. It never executes SQL, changes the ledger, suppresses
 * drift, or proves backup, source provenance, authority or paired promotion. */
export function buildHistoricalCutoverPlan(input: ProductionCutoverPlanInput & { scope: FcmAccessScope }) {
  const migrations = buildMigrationInventoryPlan(input)
  const access = buildScopedAccessPlan(input)
  const issues = [...migrations.issues.map(i => `${i.code}:${i.key}`), ...access.issues]
  const nullable = input.artifacts.find(m => m.name === PRESERVE_HISTORICAL_AUTHORS)
  if (!nullable) issues.push('HISTORICAL_CONTRACT_MISSING')
  else if (nullable.sql.replace(/--[^\r\n]*/g, '').trim() !== 'ALTER TABLE "User" ALTER COLUMN "supabaseId" DROP NOT NULL;')
    issues.push('HISTORICAL_CONTRACT_UNEXPECTED_SQL')
  // This bridge is deliberately limited to a legacy production transition.
  // An already-finalized database needs a different plan, not a broad bypass.
  if (migrations.ready && !migrations.deferredFinalize) issues.push('LEGACY_FINALIZATION_NOT_PENDING')
  if (!access.proposedExistingMappings.some(u => u.emailHash === createHash('sha256').update('sales@heymarksman.com').digest('hex')))
    issues.push('ORIGINAL_OWNER_REQUIRED')
  const reviewReady = issues.length === 0
  return { schemaVersion: 'fcm.historical-cutover-plan.v1', reviewReady, issues: [...new Set(issues)].sort(),
    pendingMigrations: reviewReady ? migrations.pendingMigrations : [],
    deferredFinalize: reviewReady ? migrations.deferredFinalize : null,
    existingMappings: reviewReady ? access.proposedExistingMappings : [],
    membershipRequired: reviewReady ? access.membershipRequired : [],
    historicalUsers: access.historicalUsers,
    planFingerprint: createHash('sha256').update(JSON.stringify({ version: 1,
      migrations: migrations.fingerprint, access: access.inventoryFingerprint, issues: [...new Set(issues)].sort() })).digest('hex'),
    requiresBackupAndRestore: true as const, requiresIndependentPromotionEvidence: true as const,
    writesAuthorized: false as const }
}

export const TIRE_V2_RESEARCH_MIGRATION = '20260928000200_tire_cohort_v2_research'
const prefix = 'APPLY_TIRE_V2_RESEARCH_MIGRATION'

export function tireV2ResearchMigrationConfirmation(releaseSha: string) {
  return `${prefix}:${releaseSha}`
}

export function pendingTireV2ResearchMigration(statusOutput: string) {
  return statusOutput.includes(TIRE_V2_RESEARCH_MIGRATION)
}

/** Prisma deploy applies every pending migration, so v2 approval cannot cover unrelated migrations. */
export function assertTireV2ResearchIsSolePending(statusOutput: string) {
  if (!pendingTireV2ResearchMigration(statusOutput)) return
  const pendingNames = [...new Set(statusOutput.match(/\b20\d{12}_[A-Za-z0-9_]+\b/g) ?? [])]
  const outsideScope = pendingNames.filter(name => name !== TIRE_V2_RESEARCH_MIGRATION)
  if (pendingNames.length !== 1 || outsideScope.length) {
    throw new Error(`TIRE_V2_MIGRATION_SCOPE_CONFLICT: ${outsideScope.join(', ') || 'pending list unavailable'}`)
  }
}

export function isTireV2ResearchMigrationConfirmed(input: { confirmation?: string; releaseSha?: string }) {
  const releaseSha = input.releaseSha?.trim()
  return !!releaseSha && input.confirmation?.trim() === tireV2ResearchMigrationConfirmation(releaseSha)
}

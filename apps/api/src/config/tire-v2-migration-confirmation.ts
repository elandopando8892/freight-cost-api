export const TIRE_V2_RESEARCH_MIGRATION = '20260928000200_tire_cohort_v2_research'
const prefix = 'APPLY_TIRE_V2_RESEARCH_MIGRATION'

export function tireV2ResearchMigrationConfirmation(releaseSha: string) {
  return `${prefix}:${releaseSha}`
}

export function pendingTireV2ResearchMigration(statusOutput: string) {
  return statusOutput.includes(TIRE_V2_RESEARCH_MIGRATION)
}

export function isTireV2ResearchMigrationConfirmed(input: { confirmation?: string; releaseSha?: string }) {
  const releaseSha = input.releaseSha?.trim()
  return !!releaseSha && input.confirmation?.trim() === tireV2ResearchMigrationConfirmation(releaseSha)
}

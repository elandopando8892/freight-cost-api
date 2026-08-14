export const PRODUCTION_MIGRATION_CONFIRMATION_PREFIX =
  "APPLY_PRODUCTION_MIGRATIONS";
export const PRODUCTION_BASELINE_CONFIRMATION_PREFIX =
  "ADOPT_PRODUCTION_BASELINE";

export function productionMigrationConfirmation(releaseSha: string) {
  return `${PRODUCTION_MIGRATION_CONFIRMATION_PREFIX}:${releaseSha}`;
}

export function productionBaselineConfirmation(releaseSha: string) {
  return `${PRODUCTION_BASELINE_CONFIRMATION_PREFIX}:${releaseSha}`;
}

export function isProductionMigrationConfirmed(input: {
  confirmation?: string;
  releaseSha?: string;
}) {
  const releaseSha = input.releaseSha?.trim();
  if (!releaseSha) return false;
  return input.confirmation?.trim() === productionMigrationConfirmation(releaseSha);
}

export function isProductionBaselineConfirmed(input: {
  confirmation?: string;
  releaseSha?: string;
}) {
  const releaseSha = input.releaseSha?.trim();
  if (!releaseSha) return false;
  return input.confirmation?.trim() === productionBaselineConfirmation(releaseSha);
}

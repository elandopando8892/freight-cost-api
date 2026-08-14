export const PRODUCTION_MIGRATION_CONFIRMATION_PREFIX =
  "APPLY_PRODUCTION_MIGRATIONS";

export function productionMigrationConfirmation(releaseSha: string) {
  return `${PRODUCTION_MIGRATION_CONFIRMATION_PREFIX}:${releaseSha}`;
}

export function isProductionMigrationConfirmed(input: {
  confirmation?: string;
  releaseSha?: string;
}) {
  const releaseSha = input.releaseSha?.trim();
  if (!releaseSha) return false;
  return input.confirmation?.trim() === productionMigrationConfirmation(releaseSha);
}

export type MigrationArtifact = { name: string; checksums: string[] };
export type MigrationRecord = {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

const PARTNER_MIGRATION = '20260923000100_partner_cost_estimates';

/** Inventory only. A clean ledger is not authorization to migrate or deploy. */
export function evaluatePartnerMigrationGate(artifacts: MigrationArtifact[], records: MigrationRecord[]) {
  const active = records.filter(row => !row.rolled_back_at);
  const applied = new Set(active.filter(row => row.finished_at).map(row => row.migration_name));
  const pending = artifacts.filter(file => !applied.has(file.name)).map(file => file.name);
  const failed = active.filter(row => !row.finished_at).map(row => row.migration_name);
  const unknown = active.filter(row => !artifacts.some(file => file.name === row.migration_name)).map(row => row.migration_name);
  const changed = active.filter(row => {
    const file = artifacts.find(item => item.name === row.migration_name);
    return file && !file.checksums.includes(row.checksum);
  }).map(row => row.migration_name);
  const duplicate = [...applied].filter(name => active.filter(row => row.finished_at && row.migration_name === name).length > 1);
  const outsidePartnerScope = pending.filter(name => name !== PARTNER_MIGRATION);
  const missingPartnerArtifact = !artifacts.some(file => file.name === PARTNER_MIGRATION);
  const ledgerConsistent = !failed.length && !unknown.length && !changed.length && !duplicate.length && !missingPartnerArtifact;
  return {
    pending, failed, unknown, changed, duplicate, outsidePartnerScope, missingPartnerArtifact,
    ledgerConsistent,
    schemaCurrent: ledgerConsistent && pending.length === 0,
    partnerOnlyCandidate: ledgerConsistent && pending.length === 1 && outsidePartnerScope.length === 0,
    migrationAuthorized: false,
  };
}

import { createHash } from 'node:crypto';

export const FINALIZE_SUPABASE_IDENTITY = '20260830000200_finalize_supabase_identity';

export type CutoverMigrationArtifact = {
  name: string;
  sql: string;
  checksum: string;
  /** Only explicitly admitted SHA256 hashes of this SQL's LF/CRLF encodings. */
  checksumVariants?: string[];
};
export type CutoverMigrationRecord = {
  migration_name: string;
  checksum: string;
  finished_at: Date | string | null;
  rolled_back_at: Date | string | null;
};
export type CutoverUserInventory = {
  id: string;
  emailHash: string;
  orgId: string;
  role: string;
  /** SHA256 of the complete inspected User row, supplied by the inventory reader. */
  identityFingerprint: string;
};
export type CutoverAuthMatch = { emailHash: string; supabaseId: string; verified: boolean };
export type CutoverIdentityMapping = CutoverUserInventory & { supabaseId: string };
export type ProductionCutoverPlanInput = {
  artifacts: CutoverMigrationArtifact[];
  ledger: CutoverMigrationRecord[];
  users: CutoverUserInventory[];
  authMatches: CutoverAuthMatch[];
};
export type CutoverPlanIssue = { code: string; key: string };
export type ProductionCutoverPlan = {
  ready: boolean;
  issues: CutoverPlanIssue[];
  pendingMigrations: CutoverMigrationArtifact[];
  deferredFinalize: (CutoverMigrationArtifact & {
    requireBackup: true;
    requireIdentityReconciliation: true;
  }) | null;
  identityMapping: CutoverIdentityMapping[];
  userFingerprint: string;
  planFingerprint: string;
  migrationAuthorized: false;
};

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const digest = (value: unknown) => sha256(JSON.stringify(value));
const hashPattern = /^[a-f0-9]{64}$/i;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const isHash = (value: string) => typeof value === 'string' && hashPattern.test(value);
const present = (value: string) => typeof value === 'string' && value.trim().length > 0;
const lower = (value: string) => typeof value === 'string' ? value.toLowerCase() : '';
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const canonicalSort = <T>(rows: T[]) => rows.sort((left, right) => compare(JSON.stringify(left), JSON.stringify(right)));
const copyArtifact = (file: CutoverMigrationArtifact): CutoverMigrationArtifact => ({
  name: file.name, sql: file.sql, checksum: file.checksum,
  ...(file.checksumVariants === undefined ? {} : { checksumVariants: [...file.checksumVariants] }),
});

/**
 * Pure inventory reconciliation, never SQL execution or authorization. No DB,
 * Auth client, filesystem, clock, random IDs, defaults, or account creation.
 * The caller must separately prove the full inventory's provenance, backup,
 * reconciliation transaction and authorization before applying this plan.
 */
export function buildProductionCutoverPlan(input: ProductionCutoverPlanInput): ProductionCutoverPlan {
  const issues: CutoverPlanIssue[] = [];
  const issue = (code: string, key: string) => { issues.push({ code, key }); };
  const files = new Map<string, CutoverMigrationArtifact>();
  for (const file of input.artifacts) {
    if (!/^\d{14}_[a-z0-9_]+$/.test(file.name)) issue('ARTIFACT_INVALID_NAME', file.name);
    if (files.has(file.name)) issue('ARTIFACT_DUPLICATE_NAME', file.name);
    files.set(file.name, file);
    if (typeof file.sql !== 'string' || !file.sql.trim() || !isHash(file.checksum)
      || sha256(typeof file.sql === 'string' ? file.sql : '') !== lower(file.checksum)) {
      issue('ARTIFACT_CHECKSUM_MISMATCH', file.name);
    }
    const lf = typeof file.sql === 'string' ? file.sql.replace(/\r\n/g, '\n') : '';
    const eolHashes = new Set([sha256(lf), sha256(lf.replace(/\n/g, '\r\n'))]);
    for (const variant of file.checksumVariants ?? []) {
      if (!isHash(variant) || !eolHashes.has(lower(variant))) issue('ARTIFACT_INVALID_CHECKSUM_VARIANT', file.name);
    }
  }
  if (!files.has(FINALIZE_SUPABASE_IDENTITY)) issue('ARTIFACT_FINALIZE_MISSING', FINALIZE_SUPABASE_IDENTITY);

  const timestamp = (value: Date | string | null, key: string) => {
    if (value === null) return null;
    const date = value instanceof Date ? value : new Date(value);
    if ((typeof value !== 'string' && !(value instanceof Date)) || !Number.isFinite(date.getTime())) {
      issue('LEDGER_INVALID_TIMESTAMP', key);
      return { invalid: String(value) };
    }
    return date.toISOString();
  };
  const ledgerProjection = input.ledger.map(row => ({
    migration_name: row.migration_name,
    checksum: lower(row.checksum),
    finished_at: timestamp(row.finished_at, row.migration_name),
    rolled_back_at: timestamp(row.rolled_back_at, row.migration_name),
  }));
  const applied = new Set<string>();
  const activeNames = new Set<string>();
  for (const row of input.ledger) {
    // Historical rolled-back attempts stay fingerprinted, never marked applied.
    if (row.rolled_back_at !== null) continue;
    if (activeNames.has(row.migration_name)) issue('LEDGER_DUPLICATE_MIGRATION', row.migration_name);
    activeNames.add(row.migration_name);
    if (row.finished_at === null) issue('LEDGER_UNFINISHED_MIGRATION', row.migration_name);
    else applied.add(row.migration_name);
    const file = files.get(row.migration_name);
    if (!file) issue('LEDGER_UNKNOWN_MIGRATION', row.migration_name);
    else if (![file.checksum, ...(file.checksumVariants ?? [])].map(lower).includes(lower(row.checksum))) {
      issue('LEDGER_CHECKSUM_MISMATCH', row.migration_name);
    }
  }

  const userIds = new Set<string>();
  const userHashes = new Set<string>();
  const users = input.users.map(user => ({
    id: user.id, emailHash: lower(user.emailHash), orgId: user.orgId,
    role: user.role, identityFingerprint: lower(user.identityFingerprint),
  })).sort((left, right) => compare(left.id, right.id));
  for (const user of users) {
    if (!present(user.id) || !present(user.orgId) || !present(user.role)
      || !isHash(user.emailHash) || !isHash(user.identityFingerprint)) issue('USER_INCOMPLETE_INVENTORY', user.id);
    if (userIds.has(user.id)) issue('USER_DUPLICATE_ID', user.id);
    if (userHashes.has(user.emailHash)) issue('USER_DUPLICATE_EMAIL_HASH', user.emailHash);
    userIds.add(user.id);
    userHashes.add(user.emailHash);
  }
  const authByHash = new Map<string, CutoverAuthMatch>();
  const subjects = new Set<string>();
  const authProjection = input.authMatches.map(match => ({
    emailHash: lower(match.emailHash), supabaseId: lower(match.supabaseId), verified: match.verified,
  }));
  for (const match of authProjection) {
    if (!isHash(match.emailHash)) issue('IDENTITY_INVALID_EMAIL_HASH', match.emailHash);
    if (!uuidPattern.test(match.supabaseId)) issue('IDENTITY_INVALID_SUBJECT', match.emailHash);
    if (match.verified !== true) issue('IDENTITY_NOT_VERIFIED', match.emailHash);
    if (authByHash.has(match.emailHash)) issue('IDENTITY_DUPLICATE_EMAIL_HASH', match.emailHash);
    if (subjects.has(match.supabaseId)) issue('IDENTITY_DUPLICATE_SUBJECT', match.emailHash);
    if (!userHashes.has(match.emailHash)) issue('IDENTITY_OUTSIDE_INVENTORY', match.emailHash);
    authByHash.set(match.emailHash, match);
    subjects.add(match.supabaseId);
  }
  const proposedMapping: CutoverIdentityMapping[] = [];
  for (const user of users) {
    const match = authByHash.get(user.emailHash);
    if (!match) issue('IDENTITY_MATCH_MISSING', user.id);
    else proposedMapping.push({ ...user, supabaseId: match.supabaseId });
  }

  const uniqueIssues = [...new Map(issues.map(item => [JSON.stringify(item), item])).values()];
  canonicalSort(uniqueIssues);
  const ready = uniqueIssues.length === 0;
  // Failed plans expose no runnable migration list or partial identity mapping.
  const identityMapping = ready ? proposedMapping : [];
  const pending = ready ? [...files.values()].filter(file => !applied.has(file.name))
    .sort((left, right) => compare(left.name, right.name)) : [];
  const finalize = pending.find(file => file.name === FINALIZE_SUPABASE_IDENTITY);
  const userFingerprint = digest(canonicalSort(users.map(user => ({ ...user }))));
  const planFingerprint = digest({
    version: 1,
    artifacts: canonicalSort(input.artifacts.map(file => ({
      name: file.name, sqlHash: sha256(file.sql), checksum: lower(file.checksum),
      checksumVariants: [...new Set((file.checksumVariants ?? []).map(lower))].sort(compare),
    }))),
    ledger: canonicalSort(ledgerProjection),
    userFingerprint,
    authMatches: canonicalSort(authProjection),
    identityMapping,
    issues: uniqueIssues,
  });
  return {
    ready, issues: uniqueIssues,
    pendingMigrations: pending.filter(file => file.name !== FINALIZE_SUPABASE_IDENTITY).map(copyArtifact),
    deferredFinalize: finalize ? { ...copyArtifact(finalize), requireBackup: true, requireIdentityReconciliation: true } : null,
    identityMapping, userFingerprint, planFingerprint, migrationAuthorized: false,
  };
}

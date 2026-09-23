import { describe, expect, it } from 'vitest';
import { evaluatePartnerMigrationGate as gate, type MigrationRecord } from '../src/modules/pilot/partner-migration-gate.js';

const auth = '20260830000200_finalize_supabase_identity';
const partner = '20260923000100_partner_cost_estimates';
const artifacts = [auth, partner].map(name => ({ name, checksums: ['valid'] }));
const applied = (name: string): MigrationRecord => ({ migration_name: name, checksum: 'valid', finished_at: new Date(), rolled_back_at: null });

describe('partner preview migration inventory (never authorizes execution)', () => {
  it('flags pending Auth instead of allowing a blanket deploy', () => {
    expect(gate(artifacts, []).outsidePartnerScope).toEqual([auth]);
    expect(gate(artifacts, []).partnerOnlyCandidate).toBe(false);
  });
  it('identifies an isolated partner candidate, still not authorized', () => {
    expect(gate(artifacts, [applied(auth)])).toMatchObject({ partnerOnlyCandidate: true, schemaCurrent: false, migrationAuthorized: false });
  });
  it('accepts current schema without claiming authenticated acceptance', () => {
    expect(gate(artifacts, [applied(auth), applied(partner)])).toMatchObject({ schemaCurrent: true, migrationAuthorized: false });
  });
  it('blocks failed migrations', () => {
    expect(gate(artifacts, [{ ...applied(auth), finished_at: null }]).ledgerConsistent).toBe(false);
  });
  it('ignores rolled back attempts but keeps the migration pending', () => {
    expect(gate(artifacts, [{ ...applied(auth), finished_at: null, rolled_back_at: new Date() }]).pending).toContain(auth);
  });
  it('blocks changed checksums', () => {
    expect(gate(artifacts, [{ ...applied(auth), checksum: 'changed' }]).changed).toEqual([auth]);
  });
  it('blocks unknown applied migrations', () => {
    expect(gate(artifacts, [applied('unknown')]).ledgerConsistent).toBe(false);
  });
  it('blocks duplicate successful ledger entries', () => {
    expect(gate(artifacts, [applied(auth), applied(auth)]).duplicate).toEqual([auth]);
  });
  it('requires the partner artifact', () => {
    expect(gate([], []).schemaCurrent).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { fixture, readEvidence, scopeKey, type Scope } from './contracts';
import { provider } from './refine';

const scope: Scope = { account: 'A', role: 'ADMIN', cycle: 'NETWORK_EXPECTED_EMPTY_PROXY', funding: 'CASH', state: 'normal' };
const filters = { search: '', country: 'Todos', status: 'Todos' };
describe('isolated B2 demonstration boundaries', () => {
  it('never promotes synthetic amounts or canonical mappings', () => {
    expect(fixture).toHaveLength(4);
    expect(fixture.every((r) => r.amount === null && r.canonicalKey === null)).toBe(true);
    expect(fixture.every((r) => r.source === null || r.source.startsWith('https://example.invalid/'))).toBe(true);
    expect(fixture.find((r) => r.id === 'us-hotel')?.period).toContain('Octubre');
  });
  it('filters the same source by concept, country and state', async () => {
    expect((await readEvidence(scope, { search: 'pensión', country: 'US', status: 'Todos' })).map((r) => r.id)).toEqual(['us-pension']);
    expect(await readEvidence(scope, { search: '', country: 'US', status: 'Parcial' })).toEqual([]);
  });
  it.each([{ role: 'VIEWER' as const }, { state: 'expired' as const }])('denies direct reads with %o', async (patch) => {
    await expect(readEvidence({ ...scope, ...patch }, filters)).rejects.toThrow('rechazado');
  });
  it('does not conceal query failure as an empty successful response', async () => {
    await expect(readEvidence({ ...scope, state: 'error' }, filters)).rejects.toThrow('fallida');
  });
  it('isolates scope and does not reset for an equivalent identity object', () => {
    expect(scopeKey({ ...scope })).toBe(scopeKey(scope));
    for (const patch of [{ account: 'B' }, { role: 'OPERATOR' as const }, { funding: 'FINANCED' as const }, { cycle: 'DEDICATED_EMPTY_SAME_BOX_RETURN' as const }]) {
      expect(scopeKey({ ...scope, ...patch })).not.toBe(scopeKey(scope));
    }
  });
  it('adapts Refine filters and rejects undeclared resources', async () => {
    const result = await provider.getList({ resource: 'b2-demo', meta: { scope }, filters: [
      { field: 'search', operator: 'contains', value: 'pensión' }, { field: 'country', operator: 'eq', value: 'US' },
    ] });
    expect(result.total).toBe(1); expect(result.data[0]?.id).toBe('us-pension');
    await expect(provider.getList({ resource: 'assumptions', meta: { scope } })).rejects.toThrow('inválido');
  });
  it('does not bypass the direct-read guard through Refine', async () => {
    await expect(provider.getList({ resource: 'b2-demo', meta: { scope: { ...scope, role: 'VIEWER' } } })).rejects.toThrow('rechazado');
  });
  it.each(['create', 'update', 'deleteOne'] as const)('rejects every declared write: %s', async (method) => {
    const action = provider[method] as (...args: unknown[]) => Promise<unknown>;
    await expect(action({ resource: 'b2-demo', id: 'mx-hotel', variables: { amount: 1 } })).rejects.toThrow('deshabilitadas');
  });
});

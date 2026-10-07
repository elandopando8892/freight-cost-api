import { Refine, useList, type DataProvider, type BaseRecord } from '@refinedev/core';
import type { PropsWithChildren } from 'react';
import { allowed, readEvidence, scopeKey, type ListHook, type Scope, type Filters } from './contracts';

const unsupported = async (): Promise<never> => { throw new Error('Escrituras deshabilitadas en demo'); };
export const provider: DataProvider = {
  getList: async <T extends BaseRecord>({ resource, meta, filters = [] }: Parameters<DataProvider['getList']>[0]) => {
    if (resource !== 'b2-demo' || !meta?.scope) throw new Error('Contrato sintético inválido');
    const value = (field: string, fallback: string) => {
      const filter = filters.find((f) => 'field' in f && f.field === field);
      return filter && 'value' in filter ? String(filter.value) : fallback;
    };
    const projected: Filters = {
      search: value('search', ''), country: value('country', 'Todos'), status: value('status', 'Todos'),
    };
    const rows = await readEvidence(meta.scope as Scope, projected);
    return { data: rows as unknown as T[], total: rows.length };
  },
  getOne: unsupported, create: unsupported, update: unsupported, deleteOne: unsupported,
  getApiUrl: () => '',
};
export const Provider = ({ children }: PropsWithChildren) =>
  <Refine dataProvider={provider} resources={[{ name: 'b2-demo' }]}
    options={{ disableTelemetry: true, liveMode: 'off', syncWithLocation: false }}>
    {children}
  </Refine>;

export const useEvidence: ListHook = (scope, filters) => {
  const { result, query } = useList({
    resource: 'b2-demo', pagination: { mode: 'off' },
    meta: { scope },
    filters: [
      { field: 'search', operator: 'contains', value: filters.search },
      { field: 'country', operator: 'eq', value: filters.country },
      { field: 'status', operator: 'eq', value: filters.status },
      { field: '_scope', operator: 'eq', value: scopeKey(scope) },
    ],
    queryOptions: { enabled: allowed(scope), retry: false, staleTime: 0 },
  });
  return { rows: result.data as ReturnType<ListHook>['rows'], loading: query.isLoading, error: query.isError, retry: query.refetch };
};

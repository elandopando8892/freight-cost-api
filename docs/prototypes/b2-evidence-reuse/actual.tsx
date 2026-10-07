import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { allowed, readEvidence, scopeKey, type ListHook } from './contracts';

const client = new QueryClient();
export const Provider = ({ children }: PropsWithChildren) =>
  <QueryClientProvider client={client}>{children}</QueryClientProvider>;

export const useEvidence: ListHook = (scope, filters) => {
  const query = useQuery({
    queryKey: ['b2-demo', scopeKey(scope), filters],
    queryFn: () => readEvidence(scope, filters),
    enabled: allowed(scope), retry: false, staleTime: 0,
  });
  return { rows: query.data ?? [], loading: query.isLoading, error: query.isError, retry: query.refetch };
};

'use client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { ClientApiError } from '@/lib/fetcher'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
        // Any read returning 401 → session expired → bounce to /login.
        queryCache: new QueryCache({
          onError: (err) => {
            if (err instanceof ClientApiError && err.status === 401 && typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          },
        }),
      }),
  )
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors closeButton position="top-right" />
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}

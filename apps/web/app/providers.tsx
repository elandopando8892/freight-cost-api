'use client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { ClientApiError, sessionExpiredEvent } from '@/lib/fetcher'

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    const redirectToLogin = () => router.replace('/login')
    window.addEventListener(sessionExpiredEvent, redirectToLogin)
    return () => window.removeEventListener(sessionExpiredEvent, redirectToLogin)
  }, [router])
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
        // Any read returning 401 → session expired → bounce to /login.
        queryCache: new QueryCache({
          onError: (err) => {
            if (err instanceof ClientApiError && err.status === 401 && typeof window !== 'undefined') {
              window.dispatchEvent(new Event(sessionExpiredEvent))
            }
          },
        }),
      }),
  )
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors closeButton position="top-right" />
        {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </ThemeProvider>
  )
}

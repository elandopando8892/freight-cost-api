'use client'

import { toast } from 'sonner'

export const sessionExpiredEvent = 'freight-cost-model:session-expired'

export class ClientApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) { super(message) }
}

/**
 * Client-side fetch helper for `/api/v1/*` (BFF) routes.
 *  - 401 → redirect to /login (session expired)
 *  - Non-2xx → throw ClientApiError + show toast
 *  - 2xx with body → parsed JSON
 */
export async function fetcher<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown; silent?: boolean } = {},
): Promise<T> {
  const { json, silent, ...rest } = init
  const headers = new Headers(rest.headers)
  if (json !== undefined) {
    headers.set('content-type', 'application/json')
    rest.body = JSON.stringify(json)
  }
  const res = await fetch(path, { ...rest, headers })
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(sessionExpiredEvent))
    throw new ClientApiError(401, null, 'Session expired')
  }
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `Request failed (${res.status})`
    if (!silent) toast.error(message)
    throw new ClientApiError(res.status, data, message)
  }
  return data as T
}

function safeJson(s: string): unknown { try { return JSON.parse(s) } catch { return s } }

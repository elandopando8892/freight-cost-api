/**
 * Server-side typed client for the Fastify API.
 * Reads the JWT from the httpOnly session cookie and attaches it as Bearer.
 * Use ONLY from Route Handlers / Server Components / Server Actions.
 */
import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'
const SESSION = process.env.SESSION_COOKIE_NAME ?? 'fcm_session'

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message)
  }
}

async function bearerFromCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(SESSION)?.value ?? null
}

/** Forward an arbitrary request to the Fastify API with the user's JWT. */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const token = await bearerFromCookie()
  const headers = new Headers(init.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (init.json !== undefined) {
    headers.set('content-type', 'application/json')
    init.body = JSON.stringify(init.json)
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' })
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) throw new ApiError(res.status, data, `API ${res.status} ${path}`)
  return data as T
}

function safeJson(s: string): unknown { try { return JSON.parse(s) } catch { return s } }

/** Public login — does NOT use the cookie; returns the raw token on success. */
export async function apiLogin(email: string, password: string): Promise<{ token: string; user?: unknown }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => ({}))) as { token?: string; user?: unknown; error?: string }
  if (!res.ok || !data.token) throw new ApiError(res.status, data, data.error ?? 'Login failed')
  return { token: data.token, user: data.user }
}

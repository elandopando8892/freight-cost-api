/**
 * Server-side typed client for the Fastify API.
 * Attaches the user's Kinde access token as Bearer.
 * Use ONLY from Route Handlers / Server Components / Server Actions.
 */
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message)
  }
}

async function bearerToken(): Promise<string | null> {
  const { getAccessTokenRaw } = getKindeServerSession()
  return (await getAccessTokenRaw()) ?? null
}

/** Forward an arbitrary request to the Fastify API with the user's Kinde token. */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const token = await bearerToken()
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

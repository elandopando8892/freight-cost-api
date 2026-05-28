/**
 * Generic BFF proxy — forwards /api/v1/* to the Fastify backend with the user's
 * Kinde access token attached as Bearer. Client code calls `/api/v1/...` without
 * ever touching the token directly. Returns JSON 401 (not an HTML redirect) when
 * there's no session, so the client fetcher can react.
 */
import { type NextRequest, NextResponse } from 'next/server'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

async function handle(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const { isAuthenticated, getAccessTokenRaw } = getKindeServerSession()

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const token = await getAccessTokenRaw()
  const url = `${API_URL}/${path.join('/')}${request.nextUrl.search}`

  const headers = new Headers()
  const ct = request.headers.get('content-type')
  if (ct) headers.set('content-type', ct)
  if (token) headers.set('authorization', `Bearer ${token}`)

  const init: RequestInit = { method: request.method, headers, cache: 'no-store' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.text()
    if (body) init.body = body
  }

  try {
    const res = await fetch(url, init)
    const text = await res.text()
    return new NextResponse(text || null, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch {
    return NextResponse.json({ error: 'Upstream API unreachable' }, { status: 502 })
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle

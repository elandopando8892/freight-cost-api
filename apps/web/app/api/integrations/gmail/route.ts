import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

function configuredRatewareApiUrl() {
  const value = process.env.RATEWARE_GMAIL_API_URL
  if (!value) return { url: null, error: 'Gmail integration is not configured for this environment.' }

  try {
    const url = new URL(value)
    const isLocalReceiver =
      process.env.NODE_ENV !== 'production' &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    if ((url.protocol !== 'https:' && !isLocalReceiver) || url.username || url.password) {
      return { url: null, error: 'Gmail integration requires a trusted HTTPS Rateware endpoint.' }
    }
    return { url: url.toString(), error: null }
  } catch {
    return { url: null, error: 'Gmail integration requires a valid Rateware endpoint.' }
  }
}

async function sessionToken() {
  const { isAuthenticated, getAccessTokenRaw } = getKindeServerSession()
  if (!(await isAuthenticated())) return null
  return (await getAccessTokenRaw()) ?? null
}

async function ratewareRequest(token: string, body: Record<string, unknown>) {
  const { url, error } = configuredRatewareApiUrl()
  if (!url) return NextResponse.json({ configured: false, error }, { status: 503 })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const text = await response.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      return NextResponse.json({ error: 'Rateware Gmail service returned an invalid response.' }, { status: 502 })
    }
    return NextResponse.json(data, { status: response.status, headers: { 'cache-control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Rateware Gmail service is unreachable.' }, { status: 502 })
  }
}

export async function GET() {
  const token = await sessionToken()
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  return ratewareRequest(token, { action: 'list_gmail_connections' })
}

export async function POST(request: NextRequest) {
  const token = await sessionToken()
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const payload = await request.json().catch(() => ({})) as { operation?: string }
  if (payload.operation === 'start') {
    return ratewareRequest(token, {
      action: 'start_gmail_oauth',
      // Rateware accepts this return target only when its explicit allowlist contains this app origin.
      redirect_after: new URL('/settings?gmail=connected', request.url).toString(),
    })
  }
  if (payload.operation === 'disconnect') return ratewareRequest(token, { action: 'disconnect_gmail_connection' })
  return NextResponse.json({ error: 'Unsupported Gmail integration operation.' }, { status: 400 })
}

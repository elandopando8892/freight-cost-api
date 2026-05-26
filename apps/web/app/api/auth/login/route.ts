import { type NextRequest, NextResponse } from 'next/server'
import { apiLogin, ApiError } from '@/lib/api'

const SESSION = process.env.SESSION_COOKIE_NAME ?? 'fcm_session'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'email + password required' }, { status: 400 })
  }
  try {
    const { token } = await apiLogin(body.email, body.password)
    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: SESSION,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Match the API's JWT expiry (7d default).
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err) {
    const status = err instanceof ApiError ? (err.status === 401 ? 401 : 502) : 500
    return NextResponse.json({ error: 'Invalid credentials' }, { status })
  }
}

import { type NextRequest, NextResponse } from 'next/server'

const SESSION = process.env.SESSION_COOKIE_NAME ?? 'fcm_session'

/**
 * Auth gate — anything matched by `config.matcher` requires a session cookie.
 * Login page + /api/auth/* are excluded so they remain reachable for sign-in/out.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION)?.value
  if (token) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // Protect everything EXCEPT: /login, /api/auth/*, Next assets, and favicon.
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}

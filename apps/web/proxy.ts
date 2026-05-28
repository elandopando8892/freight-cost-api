import { withAuth } from '@kinde-oss/kinde-auth-nextjs/middleware'

/**
 * Auth gate via Kinde. Any matched route requires a Kinde session; unauthenticated
 * users are redirected to /login (which hosts the Kinde Sign in / Sign up links).
 *
 * Excluded from the matcher (handled elsewhere):
 *  - /login            → the public sign-in landing
 *  - /api/auth/*        → Kinde's own login/logout/callback handler
 *  - /api/v1/*          → BFF proxy; it self-guards and returns JSON 401 so the
 *                         client fetcher can react, instead of an HTML redirect
 *  - Next assets / favicon / svgs
 */
export default withAuth(
  async function proxy() {
    // No extra logic — withAuth handles the redirect-to-login gate.
  },
  {
    loginPage: '/login',
    isReturnToCurrentPage: true,
  },
)

export const config = {
  matcher: ['/((?!login|api/auth|api/v1|_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}

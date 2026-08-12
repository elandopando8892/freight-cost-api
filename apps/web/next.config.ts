import path from 'node:path'
import type { NextConfig } from 'next'

// Report-only first: this lets staging surface violations from Kinde and the
// Quote Desk's sandboxed srcDoc preview before CSP is enforced in production.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.kinde.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: contentSecurityPolicyReportOnly,
  },
]

const nextConfig: NextConfig = {
  // Keep Turbopack inside this monorepo instead of inferring C:\Users\andre
  // from unrelated lockfiles higher in the filesystem.
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig

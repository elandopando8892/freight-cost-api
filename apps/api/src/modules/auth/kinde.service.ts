import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { prisma } from '../../config/prisma.js'
import { createSet, activateSet } from '../assumptions/assumptions.service.js'

const ISSUER = (process.env.KINDE_ISSUER_URL ?? '').replace(/\/$/, '')
const AUDIENCE = process.env.KINDE_AUDIENCE ?? ''

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!ISSUER) throw new Error('KINDE_ISSUER_URL not configured')
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`))
  return jwks
}

export interface KindeClaims extends JWTPayload {
  sub: string
}

/** Verify a Kinde-issued access token against the published JWKS (signature, iss, aud, exp). */
export async function verifyKindeToken(token: string): Promise<KindeClaims> {
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: ISSUER,
    ...(AUDIENCE ? { audience: AUDIENCE } : {}),
  })
  if (!payload.sub) throw new Error('Token missing sub')
  return payload as KindeClaims
}

interface KindeProfile { email: string; firstName?: string; lastName?: string }

/** Fetch the user's profile (email/name) from Kinde's OIDC user_profile endpoint. */
async function fetchKindeProfile(token: string): Promise<KindeProfile> {
  const res = await fetch(`${ISSUER}/oauth2/v2/user_profile`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Kinde user_profile ${res.status}`)
  const d = (await res.json()) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  return {
    email: str(d.preferred_email) ?? str(d.email) ?? '',
    firstName: str(d.first_name) ?? str(d.given_name),
    lastName: str(d.last_name) ?? str(d.family_name),
  }
}

export interface ResolvedUser { id: string; orgId: string; role: string; kindeId: string }

/**
 * Map a Kinde subject to our User/Organization. Auto-provisions on first sight:
 * creates a fresh Organization + ADMIN User. Subsequent calls are a fast lookup.
 */
export async function resolveUser(kindeSub: string, token: string): Promise<ResolvedUser> {
  const existing = await prisma.user.findUnique({ where: { kindeId: kindeSub } })
  if (existing) {
    return { id: existing.id, orgId: existing.orgId, role: existing.role, kindeId: kindeSub }
  }

  const profile = await fetchKindeProfile(token).catch(() => ({ email: '' } as KindeProfile))
  const email = profile.email || `${kindeSub}@kinde.local`
  const orgName = profile.email ? `${profile.email.split('@')[0]}'s org` : 'New org'

  // Link a pre-existing user with the same email (e.g. legacy password account).
  const byEmail = await prisma.user.findUnique({ where: { email } })
  if (byEmail) {
    const linked = await prisma.user.update({ where: { id: byEmail.id }, data: { kindeId: kindeSub } })
    return { id: linked.id, orgId: linked.orgId, role: linked.role, kindeId: kindeSub }
  }

  try {
    const user = await prisma.user.create({
      data: { kindeId: kindeSub, email, role: 'ADMIN', org: { create: { name: orgName, country: 'MX' } } },
    })
    await seedDefaultSet(user.orgId)
    return { id: user.id, orgId: user.orgId, role: user.role, kindeId: kindeSub }
  } catch {
    // Race: another concurrent request just provisioned this subject — re-read.
    const raced = await prisma.user.findUnique({ where: { kindeId: kindeSub } })
    if (raced) return { id: raced.id, orgId: raced.orgId, role: raced.role, kindeId: kindeSub }
    throw new Error('Failed to provision user')
  }
}

/**
 * Give a freshly provisioned org an active default assumption set (same defaults
 * the "New set" button seeds) so it can quote immediately. Best-effort: if it
 * fails the user still exists and can create a set from the UI.
 */
async function seedDefaultSet(orgId: string): Promise<void> {
  try {
    const set = await createSet(orgId, { name: 'Default — D2D Base', notes: 'Auto-created on first sign-in' })
    await activateSet(orgId, set.id)
  } catch {
    // non-fatal — leave the org without an active set; UI can create one
  }
}

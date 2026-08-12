import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { Section, type Role } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'
import { acceptPendingOrganizationInvitation } from '../org/organization-invitations.service.js'
import { normalizeInvitationEmail } from '../org/organization-invitations.js'

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

export interface ResolvedUser { id: string; orgId: string; role: Role; kindeId: string }

/**
 * Map a Kinde subject to our User/Organization. Auto-provisions on first sight:
 * creates a fresh Organization + ADMIN User. Subsequent calls are a fast lookup.
 */
export async function resolveUser(kindeSub: string, token: string): Promise<ResolvedUser> {
  const existing = await prisma.user.findUnique({ where: { kindeId: kindeSub } })
  if (existing) {
    await ensureActiveSet(existing.orgId)
    return { id: existing.id, orgId: existing.orgId, role: existing.role, kindeId: kindeSub }
  }

  const profile = await fetchKindeProfile(token).catch(() => ({ email: '' } as KindeProfile))
  const email = normalizeInvitationEmail(profile.email || `${kindeSub}@kinde.local`)
  const orgName = profile.email ? `${profile.email.split('@')[0]}'s org` : 'New org'

  // Link a pre-existing user with the same email (e.g. legacy password account).
  const byEmail = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
  if (byEmail) {
    if (byEmail.kindeId && byEmail.kindeId !== kindeSub) {
      throw new Error('Email is already linked to another Kinde identity')
    }
    const linked = await prisma.user.update({ where: { id: byEmail.id }, data: { kindeId: kindeSub } })
    await ensureActiveSet(linked.orgId)
    return { id: linked.id, orgId: linked.orgId, role: linked.role, kindeId: kindeSub }
  }

  const invited = await acceptPendingOrganizationInvitation(kindeSub, email)
  if (invited) {
    await ensureActiveSet(invited.orgId)
    return invited
  }

  try {
    // Atomic: user + org + active default set + params in one write, so any request
    // that sees the user also sees an active set (no first-load race window).
    const user = await prisma.user.create({
      data: {
        kindeId: kindeSub,
        email,
        role: 'ADMIN',
        org: {
          create: {
            name: orgName,
            country: 'MX',
            assumptionSets: {
              create: {
                name: 'Default — D2D Base',
                notes: 'Auto-created on sign-up',
                isActive: true,
                params: { create: defaultParamsCreate() },
              },
            },
          },
        },
      },
    })
    return { id: user.id, orgId: user.orgId, role: user.role, kindeId: kindeSub }
  } catch {
    // Race: another concurrent request just provisioned this subject — re-read.
    const raced = await prisma.user.findUnique({ where: { kindeId: kindeSub } })
    if (raced) {
      await ensureActiveSet(raced.orgId)
      return { id: raced.id, orgId: raced.orgId, role: raced.role, kindeId: kindeSub }
    }
    throw new Error('Failed to provision user')
  }
}

/** Default assumption params (V3.0) for seeding a fresh set. */
function defaultParamsCreate() {
  return DEFAULT_ASSUMPTIONS.map((a) => ({
    section: a.section as Section,
    field: a.field,
    value: a.value,
    unit: a.unit,
    low: a.low ?? null,
    high: a.high ?? null,
    updateFrequency: a.updateFrequency,
    costBehavior: a.costBehavior,
    activation: a.activation,
  }))
}

/**
 * Ensure the org has an active assumption set so it can quote. Common case is a
 * single cheap SELECT that returns early. Also heals orgs provisioned before
 * atomic seeding existed: activates an existing set, or creates a default one.
 * Best-effort — never throws into the auth path.
 * (Can be dropped from the hot path once all orgs are known-healthy.)
 */
async function ensureActiveSet(orgId: string): Promise<void> {
  try {
    const active = await prisma.assumptionSet.findFirst({ where: { orgId, isActive: true }, select: { id: true } })
    if (active) return
    const anySet = await prisma.assumptionSet.findFirst({ where: { orgId }, select: { id: true }, orderBy: { createdAt: 'asc' } })
    if (anySet) {
      await prisma.assumptionSet.update({ where: { id: anySet.id }, data: { isActive: true } })
      return
    }
    await prisma.assumptionSet.create({
      data: {
        orgId,
        name: 'Default — D2D Base',
        notes: 'Auto-created on first sign-in',
        isActive: true,
        params: { create: defaultParamsCreate() },
      },
    })
  } catch {
    // non-fatal — leave as-is; the UI can create/activate a set
  }
}

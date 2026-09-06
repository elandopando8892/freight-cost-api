import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { Section, type Role } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { DEFAULT_ASSUMPTIONS } from "../../data/default-assumptions.js";
import { acceptPendingOrganizationInvitation } from "../org/organization-invitations.service.js";
import { normalizeInvitationEmail } from "../org/organization-invitations.js";

function configuredIssuer() {
  const projectUrl = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!projectUrl) throw new Error("SUPABASE_URL not configured");
  const url = new URL(projectUrl);
  if (
    url.protocol !== "https:" &&
    url.hostname !== "127.0.0.1" &&
    url.hostname !== "localhost"
  ) {
    throw new Error("SUPABASE_URL must use HTTPS");
  }
  const expectedProjectRef = process.env.SUPABASE_EXPECTED_PROJECT_REF?.trim();
  if (
    expectedProjectRef &&
    url.hostname !== `${expectedProjectRef}.supabase.co`
  ) {
    throw new Error("SUPABASE_URL does not match the approved project");
  }
  return `${url.toString().replace(/\/$/, "")}/auth/v1`;
}

function configuredPublishableKey() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_PUBLISHABLE_KEY not configured");
  return key;
}

let cachedIssuer = "";
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function verifierConfig() {
  const issuer = configuredIssuer();
  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedIssuer = issuer;
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return {
    issuer,
    audience: process.env.SUPABASE_JWT_AUDIENCE || "authenticated",
    jwks: cachedJwks,
  };
}

export interface SupabaseClaims extends JWTPayload {
  sub: string;
  email: string;
  role: "authenticated";
  session_id: string;
  is_anonymous: false;
}

/** Verify signature, issuer, audience, expiry and permanent-user claims. */
export async function verifySupabaseToken(token: string): Promise<SupabaseClaims> {
  const { issuer, audience, jwks } = verifierConfig();
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  if (
    !payload.sub ||
    typeof payload.email !== "string" ||
    !payload.email ||
    payload.role !== "authenticated" ||
    typeof payload.session_id !== "string" ||
    !payload.session_id ||
    payload.is_anonymous === true
  ) {
    throw new Error("Supabase token is missing permanent authenticated-user claims");
  }
  return payload as SupabaseClaims;
}

export interface ResolvedUser {
  id: string;
  orgId: string;
  role: Role;
  supabaseId: string;
}

type SupabaseAuthUser = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
};

/** Confirm the email with the Auth server before it can link or select a tenant. */
async function verifiedEmailForFirstLink(token: string, claims: SupabaseClaims) {
  const response = await fetch(`${configuredIssuer()}/user`, {
    method: "GET",
    headers: {
      apikey: configuredPublishableKey(),
      authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Supabase user verification failed");

  const user = (await response.json()) as SupabaseAuthUser;
  const claimEmail = normalizeInvitationEmail(claims.email);
  const verifiedEmail =
    typeof user.email === "string" ? normalizeInvitationEmail(user.email) : "";
  if (
    user.id !== claims.sub ||
    !verifiedEmail ||
    verifiedEmail !== claimEmail ||
    typeof user.email_confirmed_at !== "string" ||
    !user.email_confirmed_at
  ) {
    throw new Error("Supabase identity does not have a confirmed matching email");
  }
  return verifiedEmail;
}

/** Resolve Supabase identity while preserving internal user, tenant and role IDs. */
export async function resolveUser(
  claims: SupabaseClaims,
  token: string,
): Promise<ResolvedUser> {
  const supabaseId = claims.sub;
  const existing = await prisma.user.findUnique({ where: { supabaseId } });
  if (existing) {
    await ensureActiveSet(existing.orgId);
    return { id: existing.id, orgId: existing.orgId, role: existing.role, supabaseId };
  }

  const email = await verifiedEmailForFirstLink(token, claims);

  const byEmail = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (byEmail) {
    if (byEmail.supabaseId && byEmail.supabaseId !== supabaseId) {
      throw new Error("Email is already linked to another Supabase identity");
    }
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: { supabaseId },
    });
    await ensureActiveSet(linked.orgId);
    return { id: linked.id, orgId: linked.orgId, role: linked.role, supabaseId };
  }

  const invited = await acceptPendingOrganizationInvitation(supabaseId, email);
  if (invited) {
    await ensureActiveSet(invited.orgId);
    return invited;
  }

  try {
    const user = await prisma.user.create({
      data: {
        supabaseId,
        email,
        role: "ADMIN",
        org: {
          create: {
            name: `${email.split("@")[0]}'s org`,
            country: "MX",
            assumptionSets: {
              create: {
                name: "Default — D2D Base",
                notes: "Auto-created on sign-up",
                isActive: true,
                params: { create: defaultParamsCreate() },
              },
            },
          },
        },
      },
    });
    return { id: user.id, orgId: user.orgId, role: user.role, supabaseId };
  } catch {
    const raced = await prisma.user.findUnique({ where: { supabaseId } });
    if (raced) {
      await ensureActiveSet(raced.orgId);
      return { id: raced.id, orgId: raced.orgId, role: raced.role, supabaseId };
    }
    throw new Error("Failed to provision user");
  }
}

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
  }));
}

async function ensureActiveSet(orgId: string): Promise<void> {
  try {
    const active = await prisma.assumptionSet.findFirst({
      where: { orgId, isActive: true },
      select: { id: true },
    });
    if (active) return;
    const anySet = await prisma.assumptionSet.findFirst({
      where: { orgId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (anySet) {
      await prisma.assumptionSet.update({ where: { id: anySet.id }, data: { isActive: true } });
      return;
    }
    await prisma.assumptionSet.create({
      data: {
        orgId,
        name: "Default — D2D Base",
        notes: "Auto-created on first sign-in",
        isActive: true,
        params: { create: defaultParamsCreate() },
      },
    });
  } catch {
    // Best effort: the UI can create or activate a set if the repair cannot run.
  }
}

/**
 * Service credentials (contract fcm.quote-by-route.v1) exercised through the
 * real Fastify app with Fastify inject(). Prisma, Kinde and the pricing
 * internals are mocked so only routing + authentication behaviour is under test.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const SERVICE_SECRET = "marketplace-test-secret-0123456789";
const SERVICE_ORG = "cmarketplaceorg0000000001";
const ORPHAN_SECRET = "orphan-client-secret-0123456789";
const ORPHAN_ORG = "corphanorg000000000000001";
const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const prisma = vi.hoisted(() => ({
  organization: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  equipmentConfig: { findMany: vi.fn() },
  $queryRaw: vi.fn(),
}));
vi.mock("../src/config/prisma.js", () => ({ prisma }));

vi.mock("../src/modules/auth/kinde.service.js", () => ({
  verifyKindeToken: vi.fn(async (t: string) => {
    if (t === "valid-kinde-token") return { sub: "kinde-sub-1" };
    throw new Error("invalid token");
  }),
  resolveUser: vi.fn(async () => ({
    id: "user-1",
    orgId: "org-kinde",
    role: "ADMIN",
    kindeId: "kinde-sub-1",
  })),
}));

vi.mock("../src/config/env.js", async () => {
  const { parseServiceApiClients } = await import(
    "../src/config/service-clients.js"
  );
  const { createHash: hash } = await import("node:crypto");
  const digest = (v: string) => hash("sha256").update(v, "utf8").digest("hex");
  return {
    env: {
      DATABASE_URL: "postgresql://mock",
      NODE_ENV: "test",
      RELEASE_SHA: "abc1234",
      RATE_LIMIT_MAX: 240,
      RATE_LIMIT_WINDOW: "1 minute",
      CRON_SECRET: "test-cron-secret",
      KINDE_ISSUER_URL: "https://test.kinde.com",
      KINDE_AUDIENCE: "https://test-api",
      SERVICE_API_CLIENTS: parseServiceApiClients(
        [
          `marketplace:${digest("marketplace-test-secret-0123456789")}:cmarketplaceorg0000000001:VIEWER`,
          `orphan:${digest("orphan-client-secret-0123456789")}:corphanorg000000000000001:OPERATOR`,
        ].join(","),
      ),
    },
  };
});

// Pricing internals: only the orgId that reaches them matters here.
const resolveRoute = vi.hoisted(() => vi.fn());
const resolveCalculationContext = vi.hoisted(() => vi.fn());
vi.mock("../src/modules/engine/lane-resolver.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveRoute,
  mexLegForPolicy: (leg: unknown) => leg,
}));
vi.mock("../src/modules/cost-bases/cost-bases.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveCalculationContext,
  assertCalculationOverrides: () => undefined,
}));
vi.mock("../src/modules/engine/engine.calculator.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  calculate: vi.fn(() => ({ totals: { mock: true } })),
}));

const { buildApp } = await import("../src/app.js");
const { verifyKindeToken, resolveUser } = await import(
  "../src/modules/auth/kinde.service.js"
);

const quoteBody = {
  outboundLocation: "Monterrey, NL",
  inboundLocation: "Dallas, TX",
  operation: "D2D Export",
};

describe("SERVICE_API_CLIENTS authentication", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.organization.findUnique.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        where.id === SERVICE_ORG ? { id: SERVICE_ORG } : null,
    );
    prisma.equipmentConfig.findMany.mockResolvedValue([]);
    resolveRoute.mockResolvedValue({
      mexLeg: { baseKm: 250 },
      usaLeg: { loadedMiles: 300 },
      warnings: [],
    });
    resolveCalculationContext.mockResolvedValue({
      costBase: { id: "base-1", scope: "CROSS_BORDER" },
      set: null,
      defaultPolicy: "OPERATIONAL_V3",
      applicabilityProfile: null,
    });
  });

  const quote = (token: string) =>
    app.inject({
      method: "POST",
      url: "/engine/quote-by-route",
      headers: { authorization: `Bearer ${token}` },
      payload: quoteBody,
    });

  it("accepts a valid service token on quote-by-route using the client's organization", async () => {
    const res = await quote(SERVICE_SECRET);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ costBaseId: "base-1", warnings: [] });
    expect(resolveRoute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: SERVICE_ORG }),
    );
    expect(resolveCalculationContext).toHaveBeenCalledWith(
      SERVICE_ORG,
      expect.anything(),
    );
    // No Kinde verification and no user/org provisioning for service clients.
    expect(verifyKindeToken).not.toHaveBeenCalled();
    expect(resolveUser).not.toHaveBeenCalled();
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: SERVICE_ORG },
      select: { id: true },
    });
  });

  it("accepts a valid service token on GET /catalog/*", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/equipment",
      headers: { authorization: `Bearer ${SERVICE_SECRET}` },
    });
    expect(res.statusCode).toBe(200);
    expect(verifyKindeToken).not.toHaveBeenCalled();
  });

  it.each([
    ["POST", "/engine/calculate"],
    ["GET", "/quotes"],
    ["GET", "/auth/me"],
  ] as const)(
    "rejects a valid service token on a route outside the allowlist (%s %s)",
    async (method, url) => {
      const res = await app.inject({
        method,
        url,
        headers: { authorization: `Bearer ${SERVICE_SECRET}` },
        ...(method === "POST" ? { payload: { operation: "D2D Export" } } : {}),
      });
      expect(res.statusCode).toBe(401);
      expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    },
  );

  it("falls through to Kinde for an unknown token and returns 401", async () => {
    const res = await quote("not-a-service-or-kinde-token");

    expect(res.statusCode).toBe(401);
    expect(verifyKindeToken).toHaveBeenCalledWith(
      "not-a-service-or-kinde-token",
    );
    expect(resolveRoute).not.toHaveBeenCalled();
  });

  it("keeps Kinde behaviour unchanged on the same route", async () => {
    const res = await quote("valid-kinde-token");

    expect(res.statusCode).toBe(200);
    expect(resolveRoute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-kinde" }),
    );
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("fails closed when the client's organization does not exist", async () => {
    const res = await quote(ORPHAN_SECRET);

    expect(res.statusCode).toBe(401);
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: ORPHAN_ORG },
      select: { id: true },
    });
    expect(verifyKindeToken).not.toHaveBeenCalled();
    expect(resolveRoute).not.toHaveBeenCalled();
  });

  it("rejects a request without a bearer token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/quote-by-route",
      payload: quoteBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it("uses the hashed secret, not the hash itself, as the credential", async () => {
    const res = await quote(sha256(SERVICE_SECRET));
    expect(res.statusCode).toBe(401);
  });
});

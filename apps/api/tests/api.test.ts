/**
 * Integration tests using Fastify inject() — no real DB needed.
 * Prisma client is mocked so all HTTP logic, auth, routing, and
 * validation are exercised without a live PostgreSQL connection.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// ── Mock Prisma BEFORE importing app ─────────────────────────────────────────
vi.mock("../src/config/prisma.js", () => {
  const org = {
    id: "org-1",
    name: "Test Carrier",
    country: "MX",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const user = {
    id: "user-1",
    orgId: "org-1",
    email: "test@carrier.com",
    passwordHash: "",
    role: "ADMIN",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const assumptionSet = {
    id: "set-1",
    orgId: "org-1",
    name: "Base Q1",
    version: 1,
    isActive: true,
    notes: null,
    status: "DRAFT",
    sourceVersionId: null,
    publishedAt: null,
    publishedById: null,
    _count: { params: 210 },
    auditEvents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    params: [],
  };
  const lane = {
    id: "lane-1",
    orgId: "org-1",
    laneKey: "abc123",
    origin: "Monterrey, NL",
    destination: "Laredo, TX",
    equipmentId: "eq-1",
    operationType: "D2D Export",
    serviceType: "One Way",
    config: "Single",
    isD2D: true,
    isDrayage: false,
    isRoundtrip: false,
    isBackhaul: false,
    baseKm: 250,
    returnKm: null,
    loadedMiles: null,
    transitDays: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const equipment = {
    id: "eq-1",
    truckType: "Truck Trailer",
    trailerType: "Dry Van",
    config: "Single",
    operationType: "D2D Export",
    serviceType: "One Way",
    driverType: "Interstate",
    dispatchService: null,
    fuelEfficiencyFactor: 1.0,
    fixedCostFactor: 1.0,
    maintTiresFactor: 1.0,
    driverFactor: 1.0,
  };
  const costBase = {
    id: "base-1",
    orgId: "org-1",
    code: "XB-MX-US",
    name: "Cross-border Base",
    description: null,
    scope: "CROSS_BORDER",
    status: "ACTIVE",
    defaultPolicy: "WORKBOOK_V3",
    currency: "USD",
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    versions: [
      { ...assumptionSet, costBaseId: "base-1", _count: { params: 210 } },
    ],
    _count: { lanes: 1, quotes: 1 },
  };
  const productionRoute = {
    id: "route-1",
    orgId: "org-1",
    routeKey:
      "CROSS_BORDER | D2D EXPORT | ONE WAY | MTY | DAL | NL | TX | TRUCK | TRAILER | SINGLE | COMPANY",
    code: "XB-1",
    origin: "Monterrey, NL",
    destination: "Dallas, TX",
    mexBorder: "Nuevo Laredo, Tamaulipas",
    usaBorder: "Laredo, TX",
    geography: "CROSS_BORDER",
    operation: "D2D Export",
    service: "One Way",
    truckType: "Truck",
    trailerType: "Trailer",
    config: "Single",
    driverType: "Company",
    suggestedCostBaseId: "base-1",
    confirmedCostBaseId: null,
    confirmedAssumptionSetId: null,
    status: "DRAFT",
    notes: null,
    revision: 1,
    supersedesRouteId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    suggestedCostBase: {
      id: "base-1",
      code: "XB-MX-US",
      name: "Cross-border Base",
      scope: "CROSS_BORDER",
      status: "ACTIVE",
    },
    confirmedCostBase: null,
    confirmedAssumptionSet: null,
    supersedesRoute: null,
    auditEvents: [],
  };

  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      }),
      update: vi.fn().mockResolvedValue({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      }),
    },
    organization: {
      create: vi.fn().mockResolvedValue(org),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    organizationInvitation: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({
        id: "invite-1",
        email: "pilot@example.com",
        role: "ADMIN",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      }),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    costBase: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([costBase]),
      findFirst: vi.fn().mockResolvedValue(costBase),
      findFirstOrThrow: vi.fn().mockResolvedValue(costBase),
      create: vi.fn().mockResolvedValue(costBase),
      update: vi.fn().mockResolvedValue(costBase),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    assumptionSet: {
      findMany: vi.fn().mockResolvedValue([assumptionSet]),
      create: vi.fn().mockResolvedValue(assumptionSet),
      findFirstOrThrow: vi
        .fn()
        .mockResolvedValue({ ...assumptionSet, params: [] }),
      findFirst: vi.fn().mockResolvedValue({ ...assumptionSet, params: [] }),
      update: vi.fn().mockResolvedValue(assumptionSet),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(assumptionSet),
    },
    assumptionParam: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue({
        id: "p-1",
        section: "FUEL",
        field: "Diesel MX",
        value: 30,
      }),
    },
    assumptionVersionAudit: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    equipmentConfig: {
      findMany: vi.fn().mockResolvedValue([equipment]),
      findFirstOrThrow: vi.fn().mockResolvedValue(equipment),
      findUnique: vi.fn().mockResolvedValue(equipment),
      findUniqueOrThrow: vi.fn().mockResolvedValue(equipment),
      upsert: vi.fn().mockResolvedValue(equipment),
    },
    cityMX: { findMany: vi.fn().mockResolvedValue([]) },
    zipMarket: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    lane: {
      findMany: vi.fn().mockResolvedValue([lane]),
      findFirstOrThrow: vi.fn().mockResolvedValue(lane),
      upsert: vi.fn().mockResolvedValue(lane),
      update: vi.fn().mockResolvedValue(lane),
      delete: vi.fn().mockResolvedValue(lane),
    },
    productionRoute: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([productionRoute]),
      create: vi.fn().mockResolvedValue(productionRoute),
      findFirstOrThrow: vi.fn().mockResolvedValue(productionRoute),
      update: vi.fn().mockResolvedValue(productionRoute),
    },
    productionRouteAuditEvent: {
      create: vi.fn().mockResolvedValue({ id: "route-audit-1" }),
    },
    carrierProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    rateBook: {
      count: vi.fn().mockResolvedValue(0),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: "ratebook-1",
        code: "XB-2026",
        status: "PUBLISHED",
      }),
    },
    approvalRequest: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ratewareDelivery: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    scenarioReview: { count: vi.fn().mockResolvedValue(0) },
    pilotDecision: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: "pilot-decision-1",
        outcome: "NO_GO",
        rationale: "QA window not authorized.",
        evidenceReady: false,
        evidenceBlockers: 1,
        evidenceWarnings: 0,
        evidenceAt: new Date(),
        createdAt: new Date(),
        decidedBy: { id: user.id, email: user.email, role: user.role },
      }),
    },
    pilotVerification: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "pilot-verification-1",
        kind: "STAGING_AUTH_BFF_SMOKE",
        outcome: "PASS",
        releaseId: "abc1234",
        executedAt: new Date(),
        summary: "Controlled staging smoke passed.",
        createdAt: new Date(),
        verifiedBy: { id: user.id, email: user.email, role: user.role },
      }),
    },
    pilotGoApproval: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "go-approval-1",
        orgId: "org-1",
        releaseId: "abc1234",
        roundId: "round-1",
        gateFingerprint: "a".repeat(64),
        rationale: "Independent review complete.",
        evidence: {},
        evidenceAt: new Date(),
        approvedById: user.id,
        decisionId: null,
        createdAt: new Date(),
        approvedBy: { id: user.id, email: user.email, role: user.role },
        decision: null,
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    marketData: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: "md-1",
        orgId: "org-1",
        type: "DIESEL_MX",
        value: 28,
        unit: "MXN/L",
        date: new Date(),
        createdAt: new Date(),
      }),
    },
    quote: {
      create: vi.fn().mockResolvedValue({ id: "q-1", orgId: "org-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: "q-1",
        laneId: "lane-1",
        assumptionSetId: "set-1",
        status: "DRAFT",
        explanation: null,
      }),
      delete: vi.fn().mockResolvedValue({ id: "q-1" }),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  prisma.$transaction.mockImplementation(async (ops: unknown) => {
    if (typeof ops === "function") return ops(prisma);
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops;
  });
  return { prisma };
});

// ── Mock Kinde token verification (no network / JWKS) ────────────────────────
// `authenticate` calls verifyKindeToken + resolveUser; the mock accepts a single
// fixed token and maps it to our seeded test user/org.
vi.mock("../src/modules/auth/kinde.service.js", () => ({
  verifyKindeToken: vi.fn(async (t: string) => {
    if (t === "valid-kinde-token") return { sub: "kinde-sub-1" };
    throw new Error("invalid token");
  }),
  resolveUser: vi.fn(async () => ({
    id: "user-1",
    orgId: "org-1",
    role: "ADMIN",
    kindeId: "kinde-sub-1",
  })),
}));

// ── Mock envalid to avoid needing a real .env ────────────────────────────────
vi.mock("../src/config/env.js", () => ({
  env: {
    DATABASE_URL: "postgresql://mock",
    PORT: 3001,
    NODE_ENV: "test",
    RELEASE_SHA: "abc1234",
    RATE_LIMIT_MAX: 240,
    RATE_LIMIT_WINDOW: "1 minute",
    EIA_API_KEY: "",
    CRON_SECRET: "test-cron-secret",
    KINDE_ISSUER_URL: "https://test.kinde.com",
    KINDE_AUDIENCE: "https://test-api",
    OPENAI_API_KEY: "unit-test-provider-key",
    OPENAI_KEY_ROTATED_AT: "2026-08-12T00:00:00.000Z",
    OPENAI_MODEL: "gpt-4.1-mini",
  },
}));

// ── Now import the app ───────────────────────────────────────────────────────
const { buildApp } = await import("../src/app.js");
const { resolveUser } = await import("../src/modules/auth/kinde.service.js");
const { prisma } = await import("../src/config/prisma.js");
const { calculate } = await import("../src/modules/engine/engine.calculator.js");
const { buildQuoteCalculationSnapshot } = await import(
  "../src/modules/quotes/quote-snapshot.js"
);

const pilotQuoteInput = {
  policy: "OPERATIONAL_V3" as const,
  operation: "Intra-Mex",
  service: "One Way",
  equipment: {
    truckType: "Truck Trailer",
    trailer: "Dry Van",
    config: "Single",
    driver: "B1",
  },
  params: {},
  fxRate: 17.5,
  mexLeg: {
    baseKm: 250,
    routeExpensesMxn: 0,
    baseHours: 4,
    route: "Mostly Straight",
    operation: "Intra-Mex",
    service: "One Way",
    equipment: {
      truckType: "Truck Trailer",
      trailer: "Dry Van",
      config: "Single",
      driver: "B1",
    },
  },
};
const pilotQuoteResult = calculate(pilotQuoteInput);
const pilotQuoteExplanation = {
  snapshot: buildQuoteCalculationSnapshot(pilotQuoteInput, pilotQuoteResult),
  decision: { disposition: "READY" },
  lineage: {
    policy: "OPERATIONAL_V3",
    costBase: {
      id: "base-1",
      code: "MX",
      name: "Mexico",
      scope: "INTRA_MEX",
      status: "ACTIVE",
    },
    set: {
      id: "set-1",
      name: "Mexico",
      version: 1,
      status: "PUBLISHED",
    },
  },
};

let app: FastifyInstance;
// Fixed token recognised by the mocked verifyKindeToken (see vi.mock above).
const token = "valid-kinde-token";

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
describe("Health", () => {
  it("GET /health → 200 ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.release).toBe("abc1234");
    expect(body.ts).toBeDefined();
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect(res.headers["x-release-id"]).toBe("abc1234");
  });

  it("GET /ready â†’ 200 only when the database probe succeeds", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: "ready",
      database: "connected",
      release: "abc1234",
    });
  });

  it("GET /ready â†’ 503 when the database probe fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({
      status: "not_ready",
      database: "unavailable",
      release: "abc1234",
    });
    expect(res.headers["x-request-id"]).toBeTruthy();
  });
});

describe("Organization invitations", () => {
  it("previews an ADMIN invitation without writing or sending email", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.organizationInvitation.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.organizationInvitation.upsert).mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/org/invitations/preview",
      headers: { authorization: `Bearer ${token}` },
      payload: { email: " Pilot@Example.com ", role: "ADMIN" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      eligible: true,
      action: "CREATE_PENDING",
      email: "pilot@example.com",
      role: "ADMIN",
      confirmation: "INVITE_MEMBER:org-1:pilot@example.com",
      emailDelivery: "NOT_SENT",
    });
    expect(prisma.organizationInvitation.upsert).not.toHaveBeenCalled();
  });

  it("creates only after exact tenant and email confirmation", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.organizationInvitation.findUnique).mockResolvedValueOnce(null);
    const blocked = await app.inject({
      method: "POST",
      url: "/org/invitations",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        email: "pilot@example.com",
        role: "ADMIN",
        confirmation: "INVITE_MEMBER:other-org:pilot@example.com",
      },
    });
    expect(blocked.statusCode).toBe(409);

    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.organizationInvitation.findUnique).mockResolvedValueOnce(null);
    const created = await app.inject({
      method: "POST",
      url: "/org/invitations",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        email: "pilot@example.com",
        role: "ADMIN",
        confirmation: "INVITE_MEMBER:org-1:pilot@example.com",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().emailDelivery).toBe("NOT_SENT");
    expect(prisma.organizationInvitation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "pilot@example.com" },
        create: expect.objectContaining({
          orgId: "org-1",
          invitedById: "user-1",
          role: "ADMIN",
        }),
      }),
    );
  });

  it("does not reveal that an email belongs to another tenant", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      orgId: "other-org",
    } as never);
    vi.mocked(prisma.organizationInvitation.findUnique).mockResolvedValueOnce(null);
    const res = await app.inject({
      method: "POST",
      url: "/org/invitations/preview",
      headers: { authorization: `Bearer ${token}` },
      payload: { email: "member@other.example", role: "ADMIN" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      eligible: false,
      reason: "EMAIL_UNAVAILABLE",
      email: "member@other.example",
    });
    expect(res.body).not.toContain("other-org");
  });

  it("revokes only a pending invitation from the caller tenant", async () => {
    vi.mocked(prisma.organizationInvitation.updateMany).mockResolvedValueOnce({
      count: 1,
    });
    const res = await app.inject({
      method: "DELETE",
      url: "/org/invitations/ckx11111111111111111111111",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
    expect(prisma.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "ckx11111111111111111111111",
        orgId: "org-1",
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });
  });
});

describe("Production route catalog", () => {
  it("does not allow a draft route without a confirmed published version into production", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/production/routes/route-1/produce",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/cannot enter production/i);
  });

  it("does not allow a draft production route to create a governed quote", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/production/routes/route-1/quotes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/only a route in production/i);
  });

  it("does not replace a route until it is already in production", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/production/routes/route-1/replacements",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        confirmedCostBaseId: "ckx11111111111111111111111",
        confirmedAssumptionSetId: "ckx22222222222222222222222",
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/only a route in production/i);
  });

  it("requires an explicit base and published version when proposing a replacement", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/production/routes/route-1/replacements",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("Quote replay", () => {
  it("labels pre-snapshot historical quotes instead of claiming reproducibility", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/quotes/q-1/replay",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(
      /does not have a reproducible calculation snapshot/i,
    );
  });
});

describe("Quote confirmation", () => {
  it("requires reproducible evidence before a human can confirm a quote", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/quotes/q-1/confirm",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Reviewed by pricing." },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/no reproducible calculation snapshot/i);
  });
});

describe("Rateware handoff queue", () => {
  it("lists only the local confirmed-handoff queue without performing an external write", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/integration/rateware/quotes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      contractVersion: "fcm.rateware-handoff.v1",
      total: 0,
      ready: 0,
      data: [],
    });
  });

  it("does not make a Rateware delivery attempt without an approved request", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/integration/rateware/ratebooks/ratebook-1/deliver",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/requires an approved delivery request/i);
  });

  it("exports Rateware delivery evidence without attempting an external write", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/integration/rateware/ratebooks/ratebook-1/deliveries/evidence.csv",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.body).toContain("Payload Checksum");
  });
});

describe("Pilot decision ledger", () => {
  it("does not auto-provision an unknown staging actor during read-only preflight", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockClear();
    const res = await app.inject({
      method: "GET",
      url: "/pilot/staging-context",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/provisioned/i);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("returns a privacy-bounded identity context for staging actor checks", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "user-1",
      orgId: "org-1",
      role: "ADMIN",
      kindeId: "kinde-sub-1",
    } as never);
    const res = await app.inject({
      method: "GET",
      url: "/pilot/staging-context",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      userId: "user-1",
      orgId: "org-1",
      role: "ADMIN",
      releaseId: "abc1234",
    });
    expect(res.body).not.toContain("email");
    expect(res.body).not.toContain("kinde");
  });

  it("records a human NO_GO together with an evaluated evidence snapshot", async () => {
    vi.mocked(prisma.pilotGoApproval.updateMany).mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/pilot/decisions",
      headers: { authorization: `Bearer ${token}` },
      payload: { outcome: "NO_GO", rationale: "QA window not authorized." },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().policy).toBe("DECISION_RECORD_ONLY_NO_EXECUTION");
    expect(prisma.pilotGoApproval.updateMany).toHaveBeenCalledWith({
      where: { orgId: "org-1", decisionId: null },
      data: { decisionId: "pilot-decision-1" },
    });
  });

  it("does not accept GO while the current readiness has blockers", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pilot/decisions",
      headers: { authorization: `Bearer ${token}` },
      payload: { outcome: "GO", rationale: "Attempting to bypass blockers." },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/no blockers/i);
  });

  it("requires two distinct non-verifier admins before recording GO", async () => {
    const migrationRows = [
      "20260811002100_scenario_review_packets",
      "20260811002200_scenario_review_draft_lineage",
      "20260811002300_pilot_decision_ledger",
      "20260811002400_rateware_delivery_approval_trace",
      "20260811002500_customer_quote_email_outbox",
      "20260812000100_pilot_verification_evidence",
      "20260812000200_pilot_go_dual_approval",
    ].map((migration_name) => ({ migration_name }));
    const approvalStore: Array<Record<string, any>> = [];
    const createApproval = vi.mocked(prisma.pilotGoApproval.create);
    const findApproval = vi.mocked(prisma.pilotGoApproval.findFirst);
    const listApprovals = vi.mocked(prisma.pilotGoApproval.findMany);

    vi.mocked(prisma.carrierProfile.findUnique).mockResolvedValue({
      legalName: "Test Carrier",
      primaryContactName: "QA Owner",
      primaryContactEmail: "qa@example.com",
    } as never);
    vi.mocked(prisma.costBase.count).mockResolvedValue(1);
    vi.mocked(prisma.productionRoute.count).mockResolvedValue(1);
    vi.mocked(prisma.quote.findMany).mockResolvedValue([
      { explanation: pilotQuoteExplanation },
    ] as never);
    vi.mocked(prisma.rateBook.count).mockResolvedValue(1);
    vi.mocked(prisma.$queryRaw).mockResolvedValue(migrationRows);
    vi.mocked(prisma.pilotVerification.findFirst).mockImplementation(
      async (query: any) => {
        const isSmoke = query.where.kind === "STAGING_AUTH_BFF_SMOKE";
        return {
          id: isSmoke ? "smoke-pass-1" : "human-pass-1",
          kind: query.where.kind,
          outcome: "PASS",
          releaseId: "abc1234",
          executedAt: new Date("2026-08-12T10:00:00.000Z"),
          verifiedById: isSmoke ? "verifier-smoke" : "verifier-human",
          createdAt: new Date("2026-08-12T10:01:00.000Z"),
        } as never;
      },
    );
    findApproval.mockImplementation(async (query: any) => {
      const where = query.where;
      if (where.decision?.is?.outcome === "GO") {
        return (approvalStore.find(
          (item) =>
            item.gateFingerprint === where.gateFingerprint &&
            item.decision?.outcome === "GO",
        ) ?? null) as never;
      }
      if (where.roundId && where.approvedById) {
        return (approvalStore.find(
          (item) =>
            item.roundId === where.roundId &&
            item.approvedById === where.approvedById,
        ) ?? null) as never;
      }
      return (approvalStore.find(
        (item) =>
          item.gateFingerprint === where.gateFingerprint &&
          item.decisionId === null,
      ) ?? null) as never;
    });
    createApproval.mockImplementation(async (query: any) => {
      const data = query.data;
      const approval = {
        ...data,
        id: `go-approval-${approvalStore.length + 1}`,
        decisionId: null,
        createdAt: new Date(Date.now() + approvalStore.length),
        approvedBy: {
          id: data.approvedById,
          email: `${data.approvedById}@example.com`,
          role: "ADMIN",
        },
        decision: null,
      };
      approvalStore.push(approval);
      return approval as never;
    });
    listApprovals.mockImplementation(async (query: any) => {
      if (!query.where?.roundId) return approvalStore as never;
      return approvalStore.filter(
        (item) =>
          item.roundId === query.where.roundId && item.decisionId === null,
      ) as never;
    });

    try {
      const first = await app.inject({
        method: "POST",
        url: "/pilot/decisions",
        headers: { authorization: `Bearer ${token}` },
        payload: { outcome: "GO", rationale: "First independent approval." },
      });
      expect(first.statusCode).toBe(202);
      expect(first.json()).toMatchObject({
        state: "PENDING_SECOND_APPROVAL",
        approvalCount: 1,
        requiredApprovals: 2,
        decision: null,
      });

      const duplicate = await app.inject({
        method: "POST",
        url: "/pilot/decisions",
        headers: { authorization: `Bearer ${token}` },
        payload: { outcome: "GO", rationale: "Duplicate approval attempt." },
      });
      expect(duplicate.statusCode).toBe(409);
      expect(duplicate.json().error).toMatch(/second distinct administrator/i);

      vi.mocked(resolveUser).mockResolvedValueOnce({
        id: "user-2",
        orgId: "org-1",
        role: "ADMIN",
        kindeId: "kinde-sub-2",
      });
      vi.mocked(prisma.pilotDecision.create).mockResolvedValueOnce({
        id: "pilot-go-decision-1",
        outcome: "GO",
        rationale: "Dual approval complete.",
        evidenceReady: true,
        evidenceBlockers: 0,
        evidenceWarnings: 1,
        evidenceAt: new Date(),
        createdAt: new Date(),
        decidedBy: { id: "user-2", email: "user-2@example.com", role: "ADMIN" },
      } as never);
      const second = await app.inject({
        method: "POST",
        url: "/pilot/decisions",
        headers: { authorization: `Bearer ${token}` },
        payload: { outcome: "GO", rationale: "Second independent approval." },
      });
      expect(second.statusCode).toBe(201);
      expect(second.json()).toMatchObject({
        state: "GO_RECORDED",
        approvalCount: 2,
        requiredApprovals: 2,
        decision: { id: "pilot-go-decision-1", outcome: "GO" },
      });
      const goWrite = vi.mocked(prisma.pilotDecision.create).mock.calls.at(-1)?.[0];
      expect(goWrite?.data.evidence).toMatchObject({
        goApprovalPolicy: "TWO_DISTINCT_ADMINS_NOT_SELECTED_VERIFIERS",
        goApprovals: [
          { approvedById: "user-1" },
          { approvedById: "user-2" },
        ],
      });
      expect(approvalStore).toHaveLength(2);
      expect(new Set(approvalStore.map((item) => item.approvedById)).size).toBe(2);
    } finally {
      vi.mocked(prisma.carrierProfile.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.costBase.count).mockResolvedValue(0);
      vi.mocked(prisma.productionRoute.count).mockResolvedValue(0);
      vi.mocked(prisma.quote.findMany).mockResolvedValue([]);
      vi.mocked(prisma.rateBook.count).mockResolvedValue(0);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      vi.mocked(prisma.pilotVerification.findFirst).mockResolvedValue(null);
      findApproval.mockReset().mockResolvedValue(null);
      listApprovals.mockReset().mockResolvedValue([]);
      createApproval.mockReset();
    }
  });
});

describe("Pilot verification ledger", () => {
  it("records a complete staging smoke as evidence without creating a GO", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/pilot/verifications",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        kind: "STAGING_AUTH_BFF_SMOKE",
        outcome: "PASS",
        releaseId: "abc1234",
        executedAt: new Date().toISOString(),
        summary: "Controlled staging smoke passed.",
        checks: [
          { key: "WEB_LOGIN", status: "PASS" },
          { key: "WEB_CSP_REPORT_ONLY", status: "PASS" },
          { key: "BFF_UNAUTHENTICATED", status: "PASS" },
          { key: "API_HEALTH", status: "PASS" },
          { key: "API_READY", status: "PASS" },
          { key: "API_CORS", status: "PASS" },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().policy).toBe("VERIFICATION_EVIDENCE_ONLY_NO_RELEASE_AUTHORIZATION");
  });

  it("rejects evidence for another release and future-dated evidence", async () => {
    const basePayload = {
      kind: "STAGING_AUTH_BFF_SMOKE",
      outcome: "PASS",
      summary: "Controlled staging smoke passed.",
      checks: [
        { key: "WEB_LOGIN", status: "PASS" },
        { key: "WEB_CSP_REPORT_ONLY", status: "PASS" },
        { key: "BFF_UNAUTHENTICATED", status: "PASS" },
        { key: "API_HEALTH", status: "PASS" },
        { key: "API_READY", status: "PASS" },
        { key: "API_CORS", status: "PASS" },
      ],
    };
    const wrongRelease = await app.inject({
      method: "POST",
      url: "/pilot/verifications",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ...basePayload,
        releaseId: "def5678",
        executedAt: new Date().toISOString(),
      },
    });
    expect(wrongRelease.statusCode).toBe(422);
    expect(wrongRelease.json().error).toMatch(/RELEASE_SHA/i);

    const future = await app.inject({
      method: "POST",
      url: "/pilot/verifications",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ...basePayload,
        releaseId: "abc1234",
        executedAt: "2099-01-01T00:00:00.000Z",
      },
    });
    expect(future.statusCode).toBe(422);
    expect(future.json().error).toMatch(/futuro/i);
  });

  it("scopes staging evidence lookup to the authenticated organization and normalized release", async () => {
    vi.mocked(prisma.pilotVerification.findFirst).mockClear();
    vi.mocked(resolveUser).mockResolvedValueOnce({
      id: "user-2",
      orgId: "org-2",
      role: "ADMIN",
      kindeId: "kinde-sub-2",
    });

    const res = await app.inject({
      method: "GET",
      url: "/pilot/readiness",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const calls = vi.mocked(prisma.pilotVerification.findFirst).mock.calls;
    expect(calls).toHaveLength(2);
    for (const [query] of calls) {
      expect(query.where).toMatchObject({
        orgId: "org-2",
        releaseId: { equals: "abc1234", mode: "insensitive" },
      });
    }
  });
});

describe("Canonical parameter catalog", () => {
  it("GET /catalog/parameters exposes the integration-safe 210-definition registry", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/parameters",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(210);
    expect(res.json().data[0].key).toMatch(/^fcm\.v3\./);
  });

  it("filters catalog parameters without requiring database state", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/parameters?section=FUEL&kind=ASSUMPTION&q=diesel",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBeGreaterThan(0);
    expect(
      res
        .json()
        .data.every(
          (definition: { section: string; kind: string }) =>
            definition.section === "FUEL" && definition.kind === "ASSUMPTION",
        ),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
describe("Auth (Kinde)", () => {
  it("GET /auth/me without token → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me with an unrecognised token → 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer not-a-valid-token" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me with valid Kinde token → 200 (resolved user)", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "user-1",
      orgId: "org-1",
      kindeId: "kinde-sub-1",
      email: "test@carrier.com",
      passwordHash: null,
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe("user-1");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLE AUTHORIZATION
// ─────────────────────────────────────────────────────────────────────────────
describe("Role authorization", () => {
  const useRole = (role: "ADMIN" | "OPERATOR" | "VIEWER") => {
    vi.mocked(resolveUser).mockResolvedValueOnce({
      id: "user-1",
      orgId: "org-1",
      role,
      kindeId: "kinde-sub-1",
    });
  };

  it("VIEWER may read assumption sets", async () => {
    useRole("VIEWER");
    const res = await app.inject({
      method: "GET",
      url: "/assumptions/sets",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("VIEWER may not create assumption sets", async () => {
    useRole("VIEWER");
    const res = await app.inject({
      method: "POST",
      url: "/assumptions/sets",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Forbidden set" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("Forbidden");
  });

  it("OPERATOR may create operational lanes", async () => {
    useRole("OPERATOR");
    const res = await app.inject({
      method: "POST",
      url: "/lanes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        origin: "Monterrey, NL",
        destination: "Laredo, TX",
        operationType: "D2D Export",
        serviceType: "One Way",
        config: "Single",
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it("OPERATOR may not change organization settings", async () => {
    useRole("OPERATOR");
    const res = await app.inject({
      method: "PUT",
      url: "/org",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Not allowed" },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ASSUMPTIONS
// ─────────────────────────────────────────────────────────────────────────────
describe("Assumptions", () => {
  it("GET /assumptions/sets → 200 list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/assumptions/sets",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("POST /assumptions/sets → 201 created", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/assumptions/sets",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Q2 2026 Base", notes: "Test set" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe("Base Q1"); // mocked value
  });

  it("POST /assumptions/sets without name → 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/assumptions/sets",
      headers: { authorization: `Bearer ${token}` },
      payload: { notes: "Missing name" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /assumptions/sets/set-1/params → 200 grouped params", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/assumptions/sets/set-1/params",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /assumptions/sets/set-1/params → 200 updates values", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/assumptions/sets/set-1/params",
      headers: { authorization: `Bearer ${token}` },
      payload: [
        { section: "FUEL", field: "Diesel MX", value: 30 },
        { section: "FINANCE", field: "Tipo de Cambio", value: 18.0 },
      ],
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /assumptions/sets/set-1/params with invalid section → 400", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/assumptions/sets/set-1/params",
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: "INVALID_SECTION", field: "Diesel MX", value: 30 }],
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH cost-card section (COST_CAPITAL) → 200 with warnings array", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/assumptions/sets/set-1/params",
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: "COST_CAPITAL", field: "PU Tracto", value: 240000 }],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("params");
    expect(Array.isArray(body.warnings)).toBe(true);
  });

  it("PATCH out-of-range value → 200 but flags a warning", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/assumptions/sets/set-1/params",
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: "FINANCE", field: "Tipo de Cambio", value: 999 }], // recommended high is 20
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(
      body.warnings.some(
        (w: { field: string }) => w.field === "Tipo de Cambio",
      ),
    ).toBe(true);
  });

  it("POST /assumptions/sets/set-1/params/reset → 200", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/assumptions/sets/set-1/params/reset",
      headers: { authorization: `Bearer ${token}` },
      payload: { fields: [{ section: "FUEL", field: "Diesel MX" }] },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────────────────────────────────────
describe("Cost bases and versions", () => {
  it("GET /cost-bases returns bases with versions and route usage", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/cost-bases",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].scope).toBe("CROSS_BORDER");
    expect(res.json()[0].versions[0]._count.params).toBe(210);
  });

  it("POST /cost-bases creates an initial 210-parameter version", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.costBase.create).mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/cost-bases",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        code: "xb-2026",
        name: "Cross-border 2026",
        scope: "CROSS_BORDER",
        isDefault: true,
      },
    });
    expect(res.statusCode).toBe(201);
    const create = vi.mocked(prisma.costBase.create).mock.calls[0][0].data;
    expect(create.code).toBe("XB-2026");
    expect(create.versions?.create.params.create).toHaveLength(210);
  });

  it("POST /cost-bases/:id/versions clones a new inactive version", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/cost-bases/base-1/versions",
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(201);
  });

  it("activates a version only inside its own base", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.assumptionSet.updateMany).mockClear();
    vi.mocked(prisma.assumptionSet.findFirstOrThrow).mockResolvedValueOnce({
      id: "set-1",
      orgId: "org-1",
      costBaseId: "base-1",
      isActive: true,
      status: "PUBLISHED",
    } as never);
    const res = await app.inject({
      method: "POST",
      url: "/cost-bases/base-1/versions/set-1/activate",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(
      vi.mocked(prisma.assumptionSet.updateMany).mock.calls[0][0].where,
    ).toMatchObject({ orgId: "org-1", costBaseId: "base-1" });
  });

  it("requires an approval note to publish and records the approval", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.assumptionVersionAudit.create).mockClear();
    const invalid = await app.inject({
      method: "POST",
      url: "/cost-bases/base-1/versions/set-1/publish",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "x" },
    });
    expect(invalid.statusCode).toBe(400);

    const res = await app.inject({
      method: "POST",
      url: "/cost-bases/base-1/versions/set-1/publish",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Approved after Q3 cost review" },
    });
    expect(res.statusCode).toBe(200);
    expect(
      vi.mocked(prisma.assumptionSet.update).mock.calls.at(-1)?.[0].data,
    ).toMatchObject({ status: "PUBLISHED", publishedById: "user-1" });
    expect(
      vi.mocked(prisma.assumptionVersionAudit.create).mock.calls[0][0].data,
    ).toMatchObject({
      setId: "set-1",
      actorId: "user-1",
      action: "PUBLISHED",
      note: "Approved after Q3 cost review",
    });
  });

  it("rejects direct parameter changes on a published version", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.assumptionSet.findFirstOrThrow).mockResolvedValueOnce({
      id: "set-1",
      orgId: "org-1",
      costBaseId: "base-1",
      isActive: true,
      status: "PUBLISHED",
    } as never);
    const res = await app.inject({
      method: "PATCH",
      url: "/assumptions/sets/set-1/params",
      headers: { authorization: `Bearer ${token}` },
      payload: [{ section: "FUEL", field: "Diesel MX", value: 25 }],
    });
    expect(res.statusCode).toBe(409);
  });

  it("only activates published versions and keeps archive history", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.assumptionSet.findFirstOrThrow).mockResolvedValueOnce({
      id: "set-1",
      orgId: "org-1",
      costBaseId: "base-1",
      isActive: true,
      status: "DRAFT",
    } as never);
    const draft = await app.inject({
      method: "POST",
      url: "/cost-bases/base-1/versions/set-1/activate",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(draft.statusCode).toBe(409);

    vi.mocked(prisma.assumptionVersionAudit.create).mockClear();
    vi.mocked(prisma.assumptionSet.findFirstOrThrow).mockResolvedValueOnce({
      id: "set-1",
      orgId: "org-1",
      costBaseId: "base-1",
      isActive: false,
      status: "PUBLISHED",
    } as never);
    const archived = await app.inject({
      method: "POST",
      url: "/cost-bases/base-1/versions/set-1/archive",
      headers: { authorization: `Bearer ${token}` },
      payload: { note: "Superseded by approved Q4 costs" },
    });
    expect(archived.statusCode).toBe(200);
    expect(
      vi.mocked(prisma.assumptionVersionAudit.create).mock.calls[0][0].data,
    ).toMatchObject({
      action: "ARCHIVED",
      note: "Superseded by approved Q4 costs",
    });
  });

  it("uses the base active version and default policy in a calculation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        costBaseId: "base-1",
        operation: "D2D Export",
        service: "One Way",
        equipment: {
          truckType: "Truck Trailer",
          trailer: "Flatbed",
          config: "Single",
          driver: "B1",
        },
        mex: {
          baseKm: 225,
          routeExpensesMxn: 0,
          baseHours: 0,
          route: "Straight & Danger",
        },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().costBaseId).toBe("base-1");
    expect(res.json().assumptionSetId).toBe("set-1");
    expect(res.json().policy).toBe("WORKBOOK_V3");
  });

  it("rejects using a cross-border base for a drayage route", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        costBaseId: "base-1",
        operation: "Drayage",
        drayage: {
          loadedMiles: 30,
          dieselUsdGal: 5,
          fscUsdMile: 0.8,
          outState: "TX",
        },
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it("tags a saved lane with the selected compatible base", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.lane.upsert).mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/lanes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        costBaseId: "base-1",
        origin: "Monterrey, NL",
        destination: "Laredo, TX",
        operationType: "D2D Export",
        serviceType: "One Way",
        config: "Single",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(
      vi.mocked(prisma.lane.upsert).mock.calls[0][0].create.costBaseId,
    ).toBe("base-1");
  });

  it("persists base, exact version, and policy on a saved quote", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.quote.create).mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/quotes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        costBaseId: "base-1",
        operation: "D2D Export",
        service: "One Way",
        equipment: {
          truckType: "Truck Trailer",
          trailer: "Flatbed",
          config: "Single",
          driver: "B1",
        },
        mex: {
          baseKm: 225,
          routeExpensesMxn: 0,
          baseHours: 0,
          route: "Straight & Danger",
        },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(vi.mocked(prisma.quote.create).mock.calls[0][0].data).toMatchObject({
      costBaseId: "base-1",
      assumptionSetId: "set-1",
      calculationPolicy: "WORKBOOK_V3",
    });
  });
});

describe("Catalog", () => {
  it("GET /catalog/coverage returns the 16-section matrix for each active base", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/coverage",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().catalogTotal).toBe(210);
    expect(res.json().sections).toHaveLength(16);
    expect(res.json().bases[0].counts).toMatchObject({
      total: 210,
      missing: 210,
    });
    expect(res.json().bases[0].parameters).toHaveLength(210);
  });

  it("GET /catalog/equipment → 200 list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/equipment",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("GET /catalog/cities/mx → 200 list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/cities/mx",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MARKET
// ─────────────────────────────────────────────────────────────────────────────
describe("Market", () => {
  it("GET /market → 200 with null entries (no data yet)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/market",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /market → 201 creates entry", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/market",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "DIESEL_MX",
        value: 28.5,
        unit: "MXN/L",
        date: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it("POST /market with invalid type → 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/market",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "DIESEL_INVALID",
        value: 28,
        unit: "MXN/L",
        date: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LANES
// ─────────────────────────────────────────────────────────────────────────────
describe("Lanes", () => {
  it("GET /lanes → 200 list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/lanes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("POST /lanes → 201 upsert lane", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/lanes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        origin: "Monterrey, NL",
        destination: "Laredo, TX",
        operationType: "D2D Export",
        serviceType: "One Way",
        config: "Single",
        isD2D: true,
        baseKm: 250,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.origin).toBe("Monterrey, NL");
  });

  it("POST /lanes missing required fields → 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/lanes",
      headers: { authorization: `Bearer ${token}` },
      payload: { origin: "Monterrey" }, // missing destination, operationType, serviceType
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE CALCULATE (HTTP layer)
// ─────────────────────────────────────────────────────────────────────────────
describe("Engine /calculate", () => {
  const crossborderPayload = {
    operation: "D2D Export",
    service: "One Way",
    equipment: {
      truckType: "Truck Trailer",
      trailer: "Flatbed",
      config: "Single",
      driver: "B1",
    },
    mex: {
      baseKm: 225,
      routeExpensesMxn: 0,
      baseHours: 0,
      route: "Straight & Danger",
    },
    usa: {
      loadedMiles: 435,
      dieselUsdGal: 5.152,
      fscUsdMile: 0.8,
      originCondition: "Very Tight",
      destCondition: "Very Tight",
    },
  };

  it("POST /engine/calculate → 200, Monterrey→Dallas Flatbed = $2,700 (post-E2)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: crossborderPayload,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.mexLeg.requiredTariffUsd).toBe(1300);
    expect(body.usaLeg.flatUsd).toBeCloseTo(1391, 0);
    expect(body.freightBaselineUsd).toBe(2700);
    expect(body.policy).toBe("OPERATIONAL_V3");
  });

  it("POST /engine/calculate can reproduce the source workbook explicitly", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...crossborderPayload, policy: "WORKBOOK_V3" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.policy).toBe("WORKBOOK_V3");
    expect(body.mexLeg.requiredTariffUsd).toBe(1200);
    expect(body.freightBaselineUsd).toBe(2600);
  });

  it("POST /engine/calculate rejects unknown calculation policies", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: { ...crossborderPayload, policy: "SILENT_HYBRID" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /engine/calculate MX-only lane runs only MEX leg", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        operation: "Intra-Mex",
        equipment: { trailer: "Dry Van" },
        mex: { baseKm: 300, baseHours: 0 },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.mexLeg).not.toBeNull();
    expect(body.usaLeg).toBeNull();
  });

  it("POST /engine/calculate without token → 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      payload: crossborderPayload,
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /engine/calculate missing operation → 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: { mex: { baseKm: 225 } },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /engine/calculate with no legs → 422", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: { operation: "D2D Export" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("D2D Import without service defaults to Backhaul (UT 0.10)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        operation: "D2D Import",
        equipment: { trailer: "Dry Van" },
        mex: { baseKm: 910 },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().mexLeg.utMargin).toBe(0.1); // backhaul default applied
  });

  it("explicit service overrides the default (D2D Import One Way → UT 0.30)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/engine/calculate",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        operation: "D2D Import",
        service: "One Way",
        equipment: { trailer: "Dry Van" },
        mex: { baseKm: 910 },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().mexLeg.utMargin).toBe(0.3); // carrier override
  });

  it("POST /quotes persists the selected calculation policy", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.quote.create).mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/quotes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        policy: "WORKBOOK_V3",
        operation: "Intra-Mex",
        service: "One Way",
        equipment: {
          truckType: "Truck Trailer",
          trailer: "Dry Van",
          config: "Single",
          driver: "B1",
        },
        mex: {
          baseKm: 225,
          routeExpensesMxn: 0,
          baseHours: 0,
          route: "Straight & Danger",
        },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(
      vi.mocked(prisma.quote.create).mock.calls[0][0].data.calculationPolicy,
    ).toBe("WORKBOOK_V3");
    expect(
      vi.mocked(prisma.quote.create).mock.calls[0][0].data.auditEvents,
    ).toMatchObject({
      create: {
        action: "CREATED",
        actorId: "user-1",
        payload: { source: "MANUAL" },
      },
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CRON (fuel auto-refresh) — auth guard only; success path hits EIA network
// ─────────────────────────────────────────────────────────────────────────────
describe("Cron /cron/fuel", () => {
  it("GET /cron/fuel without secret → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/cron/fuel" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /cron/fuel with wrong secret → 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/cron/fuel",
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /cron/fuel-history without secret → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/cron/fuel-history" });
    expect(res.statusCode).toBe(401);
  });
});

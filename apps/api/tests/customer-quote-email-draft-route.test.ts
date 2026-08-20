import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

const quote = {
  id: "quote-1",
  orgId: "org-1",
  clientName: "Acme",
  contactName: "Ana",
  contactEmail: "ana@acme.test",
  quoteType: "Spot",
  goodsValue: null,
  validUntil: new Date("2026-08-20T00:00:00.000Z"),
  lines: [
    {
      origin: "Monterrey",
      destination: "Laredo",
      equipment: "Truck Trailer",
      config: "Single",
      operation: "D2D Export",
      service: "One Way",
      tariff: 1200,
      currency: "USD",
      borderCrossing: "Nuevo Laredo",
      distance: "1250",
    },
  ],
};

vi.mock("../src/middleware/authenticate.js", () => ({
  authenticate: async (request: { user?: { sub: string; orgId: string; role: string } }) => {
    request.user = { sub: "user-1", orgId: "org-1", role: "ADMIN" };
  },
}));

vi.mock("../src/middleware/authorize.js", () => ({
  requireRole: () => async () => undefined,
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: {
    customerQuote: {
      findFirstOrThrow: vi.fn().mockResolvedValue(quote),
      findFirst: vi.fn(),
    },
    customerQuoteTemplate: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: "system:marksman-xbf-proposal",
        name: "MARKSMAN XBF — Propuesta comercial",
        subjectTemplate: "subject",
        htmlTemplate: "<p>ok</p>",
      }),
    },
    customerQuoteEmailDraft: {
      create: vi.fn().mockResolvedValue({
        id: "draft-1",
        status: "PREPARED",
        toEmail: "ana@acme.test",
        subject: "Propuesta",
        payloadChecksum: "c",
        createdAt: new Date("2026-08-11T12:00:00.000Z"),
      }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: "admin@heymarksman.com" }),
    },
  },
}));

const { customerQuotesRoutes } = await import(
  "../src/modules/customer-quotes/customer-quotes.routes.js"
);

describe("customer quote Gmail draft route", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(customerQuotesRoutes);
    await app.ready();
  });

  it("returns not found when selecting a missing custom template", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.customerQuoteTemplate.findFirst).mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/customer-quotes/quote-1/email-drafts",
      headers: { authorization: "Bearer x" },
      payload: { templateId: "custom-missing" },
    });

    expect(res.statusCode).toBe(404);
    expect((await res.json()).message).toContain("not found");
  });

  it("allows preparing a system template without touching storage", async () => {
    const { prisma } = await import("../src/config/prisma.js");
    vi.mocked(prisma.customerQuoteTemplate.findFirst).mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/customer-quotes/quote-1/email-drafts",
      headers: { authorization: "Bearer x" },
      payload: { templateId: "system:marksman-xbf-proposal" },
    });

    expect(res.statusCode).toBe(201);
    expect((await res.json()).status).toBe("PREPARED");
  });
});

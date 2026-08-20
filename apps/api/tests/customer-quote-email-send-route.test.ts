import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { ZodError } from "zod";

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

const draft = {
  id: "draft-1",
  customerQuoteId: "quote-1",
  orgId: "org-1",
  templateId: "system:marksman-xbf-proposal",
  templateName: "MARKSMAN XBF — Propuesta comercial",
  toEmail: "ana@acme.test",
  subject: "subject-snapshot",
  status: "PREPARED",
  payloadChecksum: "checksum-current",
  createdAt: new Date("2026-08-11T12:00:00.000Z"),
  customerQuote: { ...quote, contactEmail: "ana@acme.test", id: "quote-1" },
  createdBy: { email: "sales@heymarksman.com" },
};

const deliveryModuleMocks = vi.hoisted(() => ({
  deliverCustomerQuoteEmail: vi.fn(),
  reconcileCustomerQuoteEmailDelivery: vi.fn(),
}));

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
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    customerQuoteTemplate: {
      findFirstOrThrow: vi.fn().mockResolvedValue({
        id: "system:marksman-xbf-proposal",
        name: "MARKSMAN XBF — Propuesta comercial",
        subjectTemplate: "subject",
        htmlTemplate: "<p>ok</p>",
      }),
    },
    customerQuoteEmailDraft: {
      findFirstOrThrow: vi.fn().mockResolvedValue(draft),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: "admin@heymarksman.com" }),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../src/modules/customer-quotes/customer-quote-email-outbox.js", () => ({
  customerQuoteEmailPayloadChecksum: vi.fn(() => "checksum-current"),
}));

vi.mock("../src/modules/customer-quotes/customer-quote-email-delivery.js", () =>
  deliveryModuleMocks,
);

const { customerQuotesRoutes } = await import(
  "../src/modules/customer-quotes/customer-quotes.routes.js"
);
const deliveryMock = deliveryModuleMocks.deliverCustomerQuoteEmail;
const reconciliationMock =
  deliveryModuleMocks.reconcileCustomerQuoteEmailDelivery;

describe("customer quote gmail send route checks payload freshness", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked((await import("../src/config/prisma.js")).prisma.customerQuoteEmailDraft.findFirstOrThrow).mockResolvedValue(
      { ...draft, payloadChecksum: "checksum-current" },
    );
    vi.mocked((await import("../src/config/prisma.js")).prisma.customerQuote.findFirstOrThrow).mockResolvedValue(
      quote,
    );
    app = Fastify({ logger: false });
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof ZodError)
        return reply.status(400).send({ error: "Validation error" });
      return reply
        .status((error as Error & { statusCode?: number }).statusCode ?? 500)
        .send({ message: error.message });
    });
    await app.register(customerQuotesRoutes);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("rejects send when the draft payload changed since preparation", async () => {
    vi.mocked((await import("../src/config/prisma.js")).prisma.customerQuoteEmailDraft.findFirstOrThrow)
      .mockResolvedValue({ ...draft, payloadChecksum: "checksum-stale" });

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: "checksum-stale" },
    });

    expect(res.statusCode).toBe(409);
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("accepts send when checksums match expected draft payload", async () => {
    vi.mocked(deliveryMock).mockResolvedValueOnce({
      delivery: { ...draft, status: "SENT" },
      duplicate: false,
    } as never);

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: "checksum-current" },
    });

    expect(res.statusCode).toBe(200);
    expect(deliveryMock).toHaveBeenCalledTimes(1);
  });

  it("accepts send with no expected payload checksum for backward compatibility", async () => {
    vi.mocked(deliveryMock).mockResolvedValueOnce({
      delivery: { ...draft, status: "SENT" },
      duplicate: false,
    } as never);

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
    });

    expect(res.statusCode).toBe(200);
    expect(deliveryMock).toHaveBeenCalledTimes(1);
  });

  it("rejects send when the quote has no contact email", async () => {
    vi.mocked((await import("../src/config/prisma.js")).prisma.customerQuoteEmailDraft.findFirstOrThrow)
      .mockResolvedValue({
        ...draft,
        customerQuote: { ...draft.customerQuote, contactEmail: null },
      } as typeof draft);

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: "checksum-current" },
    });

    expect(res.statusCode).toBe(409);
    expect((await res.json()).message).toContain("recipient email");
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("rejects send when the quote has no lines", async () => {
    vi.mocked((await import("../src/config/prisma.js")).prisma.customerQuoteEmailDraft.findFirstOrThrow)
      .mockResolvedValue({
        ...draft,
        customerQuote: { ...draft.customerQuote, lines: [] },
      } as typeof draft);

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: "checksum-current" },
    });

    expect(res.statusCode).toBe(409);
    expect((await res.json()).message).toContain("no route lines");
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("rejects send when authorization header is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      payload: { expectedPayloadChecksum: "checksum-current" },
    });

    expect(res.statusCode).toBe(401);
    expect((await res.json()).message).toContain("Kinde bearer token");
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("rejects malformed expectedPayloadChecksum when non-string", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: 123 },
    });

    expect(res.statusCode).toBe(400);
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("rejects unknown fields in send payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: "checksum-current", extra: "block" },
    });

    expect(res.statusCode).toBe(400);
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("rejects stale UI session token when expected checksum does not match current draft", async () => {
    vi.mocked((await import("../src/config/prisma.js")).prisma.customerQuoteEmailDraft.findFirstOrThrow)
      .mockResolvedValue({ ...draft, payloadChecksum: "checksum-current" });

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/send",
      headers: { authorization: "Bearer x" },
      payload: { expectedPayloadChecksum: "checksum-from-old-session" },
    });

    expect(res.statusCode).toBe(409);
    expect((await res.json()).message).toContain("La sesión de envío cambió");
    expect(deliveryMock).not.toHaveBeenCalled();
  });

  it("reconciles an uncertain delivery through the authenticated Rateware contract", async () => {
    reconciliationMock.mockResolvedValueOnce({
      delivery: { ...draft, status: "FAILED" },
      outcome: "NOT_ATTEMPTED",
      retryable: true,
    });

    const res = await app.inject({
      method: "POST",
      url: "/customer-quote-email-drafts/draft-1/reconcile",
      headers: { authorization: "Bearer x" },
    });

    expect(res.statusCode).toBe(200);
    expect(reconciliationMock).toHaveBeenCalledWith({
      orgId: "org-1",
      actorId: "user-1",
      actorBearer: "Bearer x",
      draftId: "draft-1",
    });
  });
});

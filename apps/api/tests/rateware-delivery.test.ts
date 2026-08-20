import { beforeEach, describe, expect, it, vi } from "vitest";

const ratewareDelivery = {
  findUnique: vi.fn(),
  upsert: vi.fn(),
};

vi.mock("../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    RATEWARE_API_URL: "http://127.0.0.1:8787/receive",
  },
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: { ratewareDelivery },
}));

const { deliverRateBookToRateware } = await import(
  "../src/modules/ratebooks/rateware-delivery.js"
);
const { buildRatewareDeliveryEnvelope } = await import(
  "../src/modules/ratebooks/rateware-delivery-envelope.js"
);

const book = {
  id: "rb-1",
  code: "XBF-XB-PILOT-2026-08",
  name: "XBF Cross-border Pilot",
  currency: "USD",
  effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
  effectiveUntil: null,
  status: "PUBLISHED",
  publishedAt: new Date("2026-08-12T20:00:00.000Z"),
  publicationNote: "Approved pilot RateBook.",
  updatedAt: new Date("2026-08-12T20:01:00.000Z"),
  costBase: {
    id: "base-1",
    code: "XBF-XB-PILOT",
    name: "XBF Cross-border Pilot",
    scope: "CROSS_BORDER",
    status: "ACTIVE",
  },
  set: {
    id: "set-1",
    name: "Pilot assumptions",
    version: 1,
    status: "PUBLISHED",
  },
  entries: [
    {
      sourceQuoteId: "quote-1",
      sourceQuoteVersion: 1,
      sourceProductionRouteId: "route-1",
      origin: "Monterrey, NL",
      destination: "Dallas, TX",
      operation: "D2D Export",
      service: "One Way",
      equipment: "Dry Van",
      config: "Single",
      publishedTariff: 2100,
      currency: "USD",
      sourceTariffUsd: 2100,
      sourceTariffMxn: 39900,
      fxRateUsed: 19,
    },
  ],
};

const deliveryEnvelope = buildRatewareDeliveryEnvelope({
  orgId: "org-1",
  book,
});

const deliveryInput = {
  orgId: "org-1",
  actorId: "admin-1",
  actorBearer: "Bearer test-kinde-token",
  approvalRequestId: "approval-1",
  approvedPayloadChecksum: deliveryEnvelope.payloadChecksum,
  book,
};

describe("Rateware delivery transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ratewareDelivery.findUnique.mockResolvedValue(null);
    ratewareDelivery.upsert.mockImplementation(
      ({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: "delivery-1", ...create }),
    );
  });

  it("retries an ambiguous failure with the exact same envelope", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection reset after receive."))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accepted: true,
            duplicate: true,
            receipt_id: "receipt-1",
            payload_checksum: deliveryEnvelope.payloadChecksum,
            receiver_revision: "receiver-deployment-1",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deliverRateBookToRateware(deliveryInput)).rejects.toThrow(
      "Connection reset after receive.",
    );
    const retry = await deliverRateBookToRateware(deliveryInput);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstRequest = fetchMock.mock.calls[0][1] as RequestInit;
    const secondRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(secondRequest.body).toBe(firstRequest.body);
    expect(
      (secondRequest.headers as Record<string, string>)["x-idempotency-key"],
    ).toBe(
      (firstRequest.headers as Record<string, string>)["x-idempotency-key"],
    );
    expect(retry.duplicate).toBe(true);
    expect(ratewareDelivery.upsert).toHaveBeenCalledTimes(2);
    expect(ratewareDelivery.upsert.mock.calls[1][0].create).toMatchObject({
      remotePayloadChecksum: deliveryEnvelope.payloadChecksum,
      receiverRevision: "receiver-deployment-1",
    });
  });

  it("fails closed when Rateware acknowledges a different payload checksum", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            accepted: true,
            duplicate: false,
            receipt_id: "receipt-drifted",
            payload_checksum: "f".repeat(64),
            receiver_revision: "receiver-deployment-2",
          }),
          { status: 202, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(deliverRateBookToRateware(deliveryInput)).rejects.toThrow(
      "Rateware receipt checksum does not match",
    );
    expect(ratewareDelivery.upsert).toHaveBeenCalledTimes(1);
    expect(ratewareDelivery.upsert.mock.calls[0][0].create).toMatchObject({
      status: "FAILED",
      receiptId: "receipt-drifted",
      remotePayloadChecksum: "f".repeat(64),
      receiverRevision: "receiver-deployment-2",
    });
  });

  it("does not transmit a revision already confirmed locally", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    ratewareDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
      status: "DELIVERED",
    });

    const result = await deliverRateBookToRateware(deliveryInput);

    expect(result.duplicate).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ratewareDelivery.upsert).not.toHaveBeenCalled();
  });
});

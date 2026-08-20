import { describe, expect, it } from "vitest";
import { buildRatewareDeliveryEnvelope } from "../src/modules/ratebooks/rateware-delivery-envelope.js";

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

describe("Rateware delivery envelope", () => {
  it("keeps the idempotency key, payload and checksum stable across retries", () => {
    const first = buildRatewareDeliveryEnvelope({ orgId: "org-1", book });
    const retry = buildRatewareDeliveryEnvelope({ orgId: "org-1", book });

    expect(retry).toEqual(first);
    expect(first.payload.source.organizationId).toBe("org-1");
    expect(first.payload.source.exportedAt).toBe(
      book.updatedAt.toISOString(),
    );
    expect(first.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(first.payloadChecksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("creates a new envelope when the local RateBook revision changes", () => {
    const first = buildRatewareDeliveryEnvelope({ orgId: "org-1", book });
    const next = buildRatewareDeliveryEnvelope({
      orgId: "org-1",
      book: {
        ...book,
        updatedAt: new Date("2026-08-12T20:02:00.000Z"),
      },
    });

    expect(next.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(next.payloadChecksum).not.toBe(first.payloadChecksum);
  });

  it("changes the tenant-bound envelope when only payload lineage changes", () => {
    const first = buildRatewareDeliveryEnvelope({ orgId: "org-1", book });
    const drifted = buildRatewareDeliveryEnvelope({
      orgId: "org-1",
      book: {
        ...book,
        costBase: { ...book.costBase, name: "Renamed after approval" },
      },
    });

    expect(drifted.payloadChecksum).not.toBe(first.payloadChecksum);
    expect(drifted.idempotencyKey).not.toBe(first.idempotencyKey);
  });
});

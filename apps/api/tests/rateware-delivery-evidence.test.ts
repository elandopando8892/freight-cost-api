import { describe, expect, it } from "vitest";
import { ratewareDeliveryEvidenceCsv } from "../src/modules/ratebooks/rateware-delivery-evidence.js";

describe("Rateware delivery evidence export", () => {
  it("exports approval and receipt evidence without spreadsheet formula execution", () => {
    const csv = ratewareDeliveryEvidenceCsv({
      generatedAt: new Date("2026-08-11T20:00:00.000Z"),
      rateBookCode: "XB-2026",
      deliveries: [
        {
          id: "delivery-1",
          status: "DELIVERED",
          attemptedAt: new Date("2026-08-11T19:00:00.000Z"),
          deliveredAt: new Date("2026-08-11T19:00:01.000Z"),
          responseCode: 202,
          receiptId: "receipt-1",
          payloadChecksum: "abc123",
          remotePayloadChecksum: "abc123",
          receiverRevision: "receiver-deployment-1",
          error: "=none",
          approvalRequest: {
            id: "approval-1",
            status: "APPROVED",
            requestNote: "Send package",
            decisionNote: "Reviewed",
            reviewedAt: new Date("2026-08-11T18:00:00.000Z"),
            requestedBy: { email: "operator@example.com" },
            reviewedBy: { email: "admin@example.com" },
          },
        },
      ],
    });
    expect(csv).toContain('"Receipt ID"');
    expect(csv).toContain('"receipt-1"');
    expect(csv).toContain('"Remote Payload Checksum"');
    expect(csv).toContain('"receiver-deployment-1"');
    expect(csv).toContain('"\'=none"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});

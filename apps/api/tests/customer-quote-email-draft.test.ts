import { describe, expect, it } from "vitest";
import {
  buildRatewareCustomerQuoteEmailDraftContract,
  customerQuoteEmailPayloadChecksum,
} from "../src/modules/customer-quotes/customer-quote-email-outbox.js";

describe("customer quote Gmail outbox checksum", () => {
  it("changes whenever any prepared message field changes", () => {
    const base = {
      toEmail: "buyer@example.com",
      subject: "CQ-1",
      html: "<p>Quote</p>",
      text: "Quote",
    };
    expect(customerQuoteEmailPayloadChecksum(base)).not.toBe(
      customerQuoteEmailPayloadChecksum({ ...base, subject: "CQ-2" }),
    );
  });

  it("maps a prepared draft into a non-sending Rateware contract", () => {
    const payloadChecksum = customerQuoteEmailPayloadChecksum({
      toEmail: "buyer@example.com",
      subject: "CQ-1",
      html: "<p>Quote</p>",
      text: "Quote",
    });
    const contract = buildRatewareCustomerQuoteEmailDraftContract({
      id: "email-draft-1",
      customerQuoteId: "quote-1",
      templateId: "template-1",
      templateName: "Proposal",
      toEmail: "buyer@example.com",
      subject: "CQ-1",
      htmlBody: "<p>Quote</p>",
      textBody: "Quote",
      payloadChecksum,
      status: "PREPARED",
      createdAt: new Date("2026-08-11T12:00:00.000Z"),
      customerQuote: { folio: "CQ-2026-ABC123" },
      createdBy: { email: "operator@example.com" },
    });

    expect(contract).toMatchObject({
      contractVersion: "fcm.rateware-gmail-draft.v1",
      mode: "READ_ONLY",
      governance: { delivery: "NOT_SENT", payloadChecksum },
      recipient: { email: "buyer@example.com" },
    });
  });
});

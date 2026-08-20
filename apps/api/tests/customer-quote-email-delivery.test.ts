import { beforeEach, describe, expect, it, vi } from "vitest";

const customerQuoteEmailDraft = {
  findFirstOrThrow: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
};

const transactionClient = {
  customerQuoteEmailDraft,
  $queryRaw: vi.fn(),
};

const prismaMock = {
  customerQuoteEmailDraft,
  $transaction: vi.fn(
    (callback: (client: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  ),
};

vi.mock("../src/config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    RATEWARE_API_URL: "http://127.0.0.1:8787/receive",
  },
}));

vi.mock("../src/config/prisma.js", () => ({
  prisma: prismaMock,
}));

const {
  buildCustomerQuoteEmailDeliveryEnvelope,
  deliverCustomerQuoteEmail,
  reconcileCustomerQuoteEmailDelivery,
} =
  await import(
    "../src/modules/customer-quotes/customer-quote-email-delivery.js"
  );

const draft = {
  id: "draft-1",
  orgId: "org-1",
  customerQuoteId: "quote-1",
  templateId: "template-1",
  templateName: "Propuesta",
  toEmail: "buyer@example.com",
  subject: "Cotización CQ-1",
  htmlBody: "<p>Quote</p>",
  textBody: "Quote",
  payloadChecksum: "a".repeat(64),
  status: "PREPARED" as const,
  createdAt: new Date("2026-08-14T12:00:00.000Z"),
  customerQuote: { folio: "CQ-1", status: "APPROVED" },
  createdBy: { email: "sales@heymarksman.com" },
};

const input = {
  orgId: "org-1",
  actorId: "admin-1",
  actorBearer: "Bearer kinde-token",
  draftId: "draft-1",
};

describe("customer quote Gmail delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    customerQuoteEmailDraft.findFirstOrThrow.mockResolvedValue(draft);
    customerQuoteEmailDraft.findFirst.mockResolvedValue(null);
    customerQuoteEmailDraft.updateMany.mockResolvedValue({ count: 1 });
    customerQuoteEmailDraft.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...draft, ...data }),
    );
  });

  it("builds a stable delivery key for the immutable prepared payload", () => {
    const first = buildCustomerQuoteEmailDeliveryEnvelope({
      orgId: "org-1",
      actorId: "admin-1",
      draft,
    });
    const second = buildCustomerQuoteEmailDeliveryEnvelope({
      orgId: "org-1",
      actorId: "admin-2",
      draft,
    });
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(first.payload).toMatchObject({
      contractVersion: "fcm.rateware-gmail-send.v1",
      mode: "DELIVER",
      sourceOrganizationId: "org-1",
      prepared: { governance: { payloadChecksum: "a".repeat(64) } },
    });
  });

  it("claims once and persists the durable Rateware and Gmail receipt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accepted: true,
          receipt_id: "receipt-1",
          provider_message_id: "gmail-message-1",
          provider_thread_id: "gmail-thread-1",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverCustomerQuoteEmail(input);

    expect(customerQuoteEmailDraft.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SENDING" }) }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.action).toBe("send_fcm_customer_quote_email");
    expect((request.headers as Record<string, string>)["x-idempotency-key"]).toBe(
      body.idempotency_key,
    );
    expect(result.delivery).toMatchObject({
      status: "SENT",
      receiptId: "receipt-1",
      providerMessageId: "gmail-message-1",
    });
  });

  it("blocks blind retries when provider acceptance is uncertain", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection reset")));

    await expect(deliverCustomerQuoteEmail(input)).rejects.toMatchObject({
      deliveryUnknown: true,
    });
    expect(customerQuoteEmailDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DELIVERY_UNKNOWN" }),
      }),
    );
  });

  it("does not send a proposal that has not been approved", async () => {
    customerQuoteEmailDraft.findFirstOrThrow.mockResolvedValue({
      ...draft,
      customerQuote: { ...draft.customerQuote, status: "REVIEW" },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(deliverCustomerQuoteEmail(input)).rejects.toThrow(
      "Only an approved customer quote can be sent.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(customerQuoteEmailDraft.updateMany).not.toHaveBeenCalled();
  });

  it("rejects provider payload missing durable receipt and marks delivery as unknown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accepted: true, duplicate: true }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deliverCustomerQuoteEmail(input)).rejects.toMatchObject({
      statusCode: 502,
    });
    expect(customerQuoteEmailDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DELIVERY_UNKNOWN" }),
      }),
    );
  });

  it("does not send a draft already in progress", async () => {
    customerQuoteEmailDraft.findFirstOrThrow.mockResolvedValue({
      ...draft,
      status: "SENDING",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(deliverCustomerQuoteEmail(input)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns duplicate and keeps no extra calls when draft is already sent", async () => {
    customerQuoteEmailDraft.findFirstOrThrow.mockResolvedValue({
      ...draft,
      status: "SENT",
      receiptId: "receipt-1",
      sentAt: new Date("2026-08-14T13:00:00.000Z"),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverCustomerQuoteEmail(input);

    expect(result.duplicate).toBe(true);
    expect(result.delivery).toMatchObject({ status: "SENT", receiptId: "receipt-1" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a second draft while the same payload has an uncertain delivery", async () => {
    customerQuoteEmailDraft.findFirst.mockResolvedValue({
      id: "draft-unknown",
      status: "DELIVERY_UNKNOWN",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(deliverCustomerQuoteEmail(input)).rejects.toMatchObject({
      statusCode: 409,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(customerQuoteEmailDraft.updateMany).not.toHaveBeenCalled();
  });

  it("reconciles an attempt that never reached Gmail as retryable FAILED", async () => {
    customerQuoteEmailDraft.findFirstOrThrow.mockResolvedValue({
      ...draft,
      status: "DELIVERY_UNKNOWN",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            reconciled: true,
            outcome: "NOT_ATTEMPTED",
            retryable: true,
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await reconcileCustomerQuoteEmailDelivery(input);

    expect(result).toMatchObject({ outcome: "NOT_ATTEMPTED", retryable: true });
    expect(customerQuoteEmailDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("reconciles a durable Gmail receipt as SENT without sending again", async () => {
    customerQuoteEmailDraft.findFirstOrThrow.mockResolvedValue({
      ...draft,
      status: "DELIVERY_UNKNOWN",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          reconciled: true,
          outcome: "SENT",
          retryable: false,
          receipt_id: "receipt-2",
          provider_message_id: "gmail-message-2",
          provider_thread_id: "gmail-thread-2",
          sent_at: "2026-08-20T09:11:55.384Z",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await reconcileCustomerQuoteEmailDelivery(input);

    expect(result).toMatchObject({ outcome: "SENT", retryable: false });
    expect(customerQuoteEmailDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENT",
          receiptId: "receipt-2",
          providerMessageId: "gmail-message-2",
        }),
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).action).toBe(
      "reconcile_fcm_customer_quote_email",
    );
  });
});

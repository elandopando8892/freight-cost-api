import { createHash } from "node:crypto";
import { z } from "zod";

export function customerQuoteEmailPayloadChecksum(payload: {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
}) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export const RatewareCustomerQuoteEmailDraftContractSchema = z.object({
  contractVersion: z.literal("fcm.rateware-gmail-draft.v1"),
  mode: z.literal("READ_ONLY"),
  source: z.object({
    system: z.literal("Freight Cost Model"),
    emailDraftId: z.string(),
    customerQuoteId: z.string(),
    folio: z.string(),
    preparedAt: z.string().datetime(),
  }),
  governance: z.object({
    status: z.literal("PREPARED"),
    delivery: z.literal("NOT_SENT"),
    payloadChecksum: z.string().length(64),
    template: z.object({ id: z.string(), name: z.string() }),
  }),
  recipient: z.object({ email: z.string().email() }),
  message: z.object({
    subject: z.string(),
    html: z.string(),
    text: z.string(),
  }),
  preparedBy: z.object({ email: z.string().email() }),
});

export function buildRatewareCustomerQuoteEmailDraftContract(draft: {
  id: string;
  customerQuoteId: string;
  templateId: string;
  templateName: string;
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  payloadChecksum: string;
  status: "PREPARED";
  createdAt: Date;
  customerQuote: { folio: string };
  createdBy: { email: string };
}) {
  return RatewareCustomerQuoteEmailDraftContractSchema.parse({
    contractVersion: "fcm.rateware-gmail-draft.v1",
    mode: "READ_ONLY",
    source: {
      system: "Freight Cost Model",
      emailDraftId: draft.id,
      customerQuoteId: draft.customerQuoteId,
      folio: draft.customerQuote.folio,
      preparedAt: draft.createdAt.toISOString(),
    },
    governance: {
      status: draft.status,
      delivery: "NOT_SENT",
      payloadChecksum: draft.payloadChecksum,
      template: { id: draft.templateId, name: draft.templateName },
    },
    recipient: { email: draft.toEmail },
    message: {
      subject: draft.subject,
      html: draft.htmlBody,
      text: draft.textBody,
    },
    preparedBy: { email: draft.createdBy.email },
  });
}

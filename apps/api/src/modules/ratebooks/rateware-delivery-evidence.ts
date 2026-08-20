export type RatewareDeliveryEvidenceRow = {
  id: string;
  status: string;
  attemptedAt: Date;
  deliveredAt: Date | null;
  responseCode: number | null;
  receiptId: string | null;
  payloadChecksum: string;
  remotePayloadChecksum: string | null;
  receiverRevision: string | null;
  error: string | null;
  approvalRequest: {
    id: string;
    status: string;
    requestNote: string;
    decisionNote: string | null;
    reviewedAt: Date | null;
    requestedBy: { email: string };
    reviewedBy: { email: string } | null;
  } | null;
};

function csvCell(value: string | number | null) {
  const safe = String(value ?? "").replace(/^[=+\-@]/, "'$&");
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Read-only audit artifact. It excludes bearer tokens and idempotency keys. */
export function ratewareDeliveryEvidenceCsv(input: {
  generatedAt: Date;
  rateBookCode: string;
  deliveries: RatewareDeliveryEvidenceRow[];
}) {
  const header = [
    "Generated At",
    "RateBook",
    "Delivery ID",
    "Status",
    "Attempted At",
    "Delivered At",
    "HTTP Response",
    "Receipt ID",
    "Payload Checksum",
    "Remote Payload Checksum",
    "Receiver Revision",
    "Approval ID",
    "Approval Status",
    "Requested By",
    "Reviewed By",
    "Reviewed At",
    "Approval Decision",
    "Delivery Error",
  ];
  const rows = input.deliveries.map((delivery) => [
    input.generatedAt.toISOString(),
    input.rateBookCode,
    delivery.id,
    delivery.status,
    delivery.attemptedAt.toISOString(),
    delivery.deliveredAt?.toISOString() ?? null,
    delivery.responseCode,
    delivery.receiptId,
    delivery.payloadChecksum,
    delivery.remotePayloadChecksum,
    delivery.receiverRevision,
    delivery.approvalRequest?.id ?? null,
    delivery.approvalRequest?.status ?? null,
    delivery.approvalRequest?.requestedBy.email ?? null,
    delivery.approvalRequest?.reviewedBy?.email ?? null,
    delivery.approvalRequest?.reviewedAt?.toISOString() ?? null,
    delivery.approvalRequest?.decisionNote ?? null,
    delivery.error,
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

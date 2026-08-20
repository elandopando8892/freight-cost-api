export type ApprovedRatewareDelivery = {
  id: string;
  reviewedAt: Date | null;
  payloadChecksum: string | null;
} | null;

export function ratewareDeliveryApprovalBlocker(
  approval: ApprovedRatewareDelivery,
  currentPayloadChecksum: string,
) {
  if (!approval?.reviewedAt) {
    return "Rateware delivery requires an approved delivery request that has been explicitly reviewed.";
  }
  if (!approval.payloadChecksum) {
    return "The approved Rateware delivery is not bound to a package checksum. Create and review a new delivery request.";
  }
  if (approval.payloadChecksum !== currentPayloadChecksum) {
    return "The RateBook package changed after approval. Review and approve the current checksum before delivery.";
  }
  return null;
}

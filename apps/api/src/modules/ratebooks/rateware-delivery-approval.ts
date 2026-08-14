export type ApprovedRatewareDelivery = {
  id: string;
  reviewedAt: Date | null;
} | null;

export function ratewareDeliveryApprovalBlocker(
  approval: ApprovedRatewareDelivery,
) {
  if (!approval?.reviewedAt) {
    return "Rateware delivery requires an approved delivery request that has been explicitly reviewed.";
  }
  return null;
}

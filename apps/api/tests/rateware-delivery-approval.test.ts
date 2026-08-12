import { describe, expect, it } from "vitest";
import { ratewareDeliveryApprovalBlocker } from "../src/modules/ratebooks/rateware-delivery-approval.js";

describe("Rateware delivery approval gate", () => {
  it("does not permit an external delivery without an approved, reviewed request", () => {
    expect(ratewareDeliveryApprovalBlocker(null)).toMatch(
      /requires an approved/i,
    );
    expect(
      ratewareDeliveryApprovalBlocker({ id: "approval-1", reviewedAt: null }),
    ).toMatch(/requires an approved/i);
  });

  it("permits a delivery only after the approval record is reviewed", () => {
    expect(
      ratewareDeliveryApprovalBlocker({
        id: "approval-1",
        reviewedAt: new Date("2026-08-11T18:00:00.000Z"),
      }),
    ).toBeNull();
  });
});

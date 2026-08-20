import { describe, expect, it } from "vitest";
import { ratewareDeliveryApprovalBlocker } from "../src/modules/ratebooks/rateware-delivery-approval.js";

describe("Rateware delivery approval gate", () => {
  const checksum = "a".repeat(64);

  it("does not permit an external delivery without an approved, reviewed request", () => {
    expect(ratewareDeliveryApprovalBlocker(null, checksum)).toMatch(
      /requires an approved/i,
    );
    expect(
      ratewareDeliveryApprovalBlocker(
        { id: "approval-1", reviewedAt: null, payloadChecksum: checksum },
        checksum,
      ),
    ).toMatch(/requires an approved/i);
  });

  it("permits a delivery only when the reviewed approval is bound to the current checksum", () => {
    expect(
      ratewareDeliveryApprovalBlocker({
        id: "approval-1",
        reviewedAt: new Date("2026-08-11T18:00:00.000Z"),
        payloadChecksum: checksum,
      }, checksum),
    ).toBeNull();
  });

  it("rejects legacy or drifted approvals before any external write", () => {
    const reviewedAt = new Date("2026-08-11T18:00:00.000Z");
    expect(
      ratewareDeliveryApprovalBlocker(
        { id: "approval-legacy", reviewedAt, payloadChecksum: null },
        checksum,
      ),
    ).toMatch(/not bound to a package checksum/i);
    expect(
      ratewareDeliveryApprovalBlocker(
        { id: "approval-drifted", reviewedAt, payloadChecksum: "b".repeat(64) },
        checksum,
      ),
    ).toMatch(/changed after approval/i);
  });
});

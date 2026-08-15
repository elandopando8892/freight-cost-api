import { describe, expect, it } from "vitest";
import { customerQuoteTransitionBlocker } from "../src/modules/customer-quotes/customer-quote-lifecycle.js";

describe("customer quote lifecycle", () => {
  it("requires review before an administrator approves", () => {
    expect(
      customerQuoteTransitionBlocker({
        current: "DRAFT",
        target: "APPROVED",
        role: "ADMIN",
      }),
    ).toContain("cannot move");
    expect(
      customerQuoteTransitionBlocker({
        current: "REVIEW",
        target: "APPROVED",
        role: "ADMIN",
      }),
    ).toBeNull();
  });

  it("keeps approval administrative and archived quotes immutable", () => {
    expect(
      customerQuoteTransitionBlocker({
        current: "REVIEW",
        target: "APPROVED",
        role: "OPERATOR",
      }),
    ).toContain("administrator");
    expect(
      customerQuoteTransitionBlocker({
        current: "ARCHIVED",
        target: "REVIEW",
        role: "ADMIN",
      }),
    ).toContain("immutable");
  });
});

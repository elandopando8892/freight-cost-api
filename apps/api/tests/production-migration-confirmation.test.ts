import { describe, expect, it } from "vitest";
import {
  isProductionMigrationConfirmed,
  productionMigrationConfirmation,
} from "../src/config/production-migration-confirmation.js";

describe("production migration confirmation", () => {
  it("binds the confirmation to the exact release SHA", () => {
    expect(productionMigrationConfirmation("abc123")).toBe(
      "APPLY_PRODUCTION_MIGRATIONS:abc123",
    );
  });

  it("accepts only the exact confirmation for the release", () => {
    expect(
      isProductionMigrationConfirmed({
        confirmation: "APPLY_PRODUCTION_MIGRATIONS:abc123",
        releaseSha: "abc123",
      }),
    ).toBe(true);
    expect(
      isProductionMigrationConfirmed({
        confirmation: "APPLY_PRODUCTION_MIGRATIONS:other",
        releaseSha: "abc123",
      }),
    ).toBe(false);
  });

  it("fails closed without a release SHA", () => {
    expect(
      isProductionMigrationConfirmed({
        confirmation: "APPLY_PRODUCTION_MIGRATIONS:abc123",
      }),
    ).toBe(false);
  });
});

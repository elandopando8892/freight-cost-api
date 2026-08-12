import { describe, expect, it } from "vitest";
import {
  assertIsolatedNeonStagingTarget,
  resolveDatabaseUrl,
} from "../src/config/database-url.js";

describe("database URL isolation", () => {
  it("uses the isolated Neon URL for a Vercel Preview", () => {
    expect(
      resolveDatabaseUrl({
        VERCEL_ENV: "preview",
        DATABASE_URL: "postgresql://production",
        STAGING_DATABASE_URL: "postgresql://staging",
      }),
    ).toBe("postgresql://staging");
  });

  it("fails closed when a Preview has only the Production URL", () => {
    expect(() =>
      resolveDatabaseUrl({
        VERCEL_ENV: "preview",
        DATABASE_URL: "postgresql://production",
      }),
    ).toThrow("STAGING_DATABASE_URL is required");
  });

  it("uses DATABASE_URL outside Vercel Preview", () => {
    expect(
      resolveDatabaseUrl({
        VERCEL_ENV: "production",
        DATABASE_URL: "postgresql://production",
        STAGING_DATABASE_URL: "postgresql://staging",
      }),
    ).toBe("postgresql://production");
  });
});

describe("staging migration target guard", () => {
  it("accepts a distinct Neon staging endpoint", () => {
    expect(
      assertIsolatedNeonStagingTarget({
        expectedNeonProjectId: "ep-staging",
        productionDatabaseUrl:
          "postgresql://app:secret@ep-production.us-east-2.aws.neon.tech/fcm",
        stagingDatabaseUrl:
          "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
        stagingNeonProjectId: "ep-staging",
      }),
    ).toContain("ep-staging");
  });

  it("blocks a pooled alias of the Production target", () => {
    expect(() =>
      assertIsolatedNeonStagingTarget({
        expectedNeonProjectId: "ep-production",
        productionDatabaseUrl:
          "postgresql://app:secret@ep-production.us-east-2.aws.neon.tech/fcm",
        stagingDatabaseUrl:
          "postgresql://app:secret@ep-production-pooler.us-east-2.aws.neon.tech/fcm",
        stagingNeonProjectId: "ep-production",
      }),
    ).toThrow("must not resolve to the Production target");
  });

  it("blocks a non-Neon staging endpoint", () => {
    expect(() =>
      assertIsolatedNeonStagingTarget({
        expectedNeonProjectId: "staging",
        productionDatabaseUrl:
          "postgresql://app:secret@prod.example.com/fcm",
        stagingDatabaseUrl:
          "postgresql://app:secret@staging.example.com/fcm",
        stagingNeonProjectId: "staging",
      }),
    ).toThrow("must be a Neon endpoint");
  });

  it("accepts a redacted Production URL when the Neon resource identity matches", () => {
    expect(
      assertIsolatedNeonStagingTarget({
        expectedNeonProjectId: "broad-art-99750179",
        productionDatabaseUrl: "[SENSITIVE]",
        stagingDatabaseUrl:
          "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
        stagingNeonProjectId: "broad-art-99750179",
      }),
    ).toContain("ep-staging");
  });

  it("blocks a different Neon project identity", () => {
    expect(() =>
      assertIsolatedNeonStagingTarget({
        expectedNeonProjectId: "expected-project",
        productionDatabaseUrl: "[SENSITIVE]",
        stagingDatabaseUrl:
          "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
        stagingNeonProjectId: "unexpected-project",
      }),
    ).toThrow("project identity does not match");
  });
});

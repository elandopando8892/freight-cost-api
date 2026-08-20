import { describe, expect, it } from "vitest";
import {
  assertIsolatedNeonStagingTarget,
  resolveDatabaseUrl,
} from "../src/config/database-url.js";
import * as databaseConfig from "../src/config/database-url.js";

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
  it("accepts distinct Vercel Preview URLs without exposing a Neon project id", () => {
    expect(
      assertIsolatedNeonStagingTarget({
        productionDatabaseUrl:
          "postgresql://app:secret@ep-production.us-east-2.aws.neon.tech/fcm",
        stagingDatabaseUrl:
          "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
      }),
    ).toContain("ep-staging");
  });

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

  it("selects migrations only for the staging Preview branch", () => {
    const selectTarget = (
      databaseConfig as typeof databaseConfig & {
        resolveVercelStagingMigrationTarget?: (
          environment: Record<string, string | undefined>,
        ) => string | null;
      }
    ).resolveVercelStagingMigrationTarget;
    const environment = {
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "staging",
      VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
      DATABASE_URL:
        "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
      STAGING_DATABASE_URL:
        "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
      FCM_STAGING_MIGRATION_CONFIRMATION:
        "APPLY_STAGING_MIGRATIONS:abcdef1234567890",
    };

    expect(selectTarget?.(environment)).toBe(
      environment.STAGING_DATABASE_URL,
    );
    expect(
      selectTarget?.({ ...environment, VERCEL_GIT_COMMIT_REF: "feature/x" }),
    ).toBeNull();
    expect(
      selectTarget?.({ ...environment, VERCEL_ENV: "production" }),
    ).toBeNull();
  });

  it("fails closed when staging migration confirmation does not match the release", () => {
    const selectTarget = (
      databaseConfig as typeof databaseConfig & {
        resolveVercelStagingMigrationTarget?: (
          environment: Record<string, string | undefined>,
        ) => string | null;
      }
    ).resolveVercelStagingMigrationTarget;

    expect(() =>
      selectTarget?.({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "staging",
        VERCEL_GIT_COMMIT_SHA: "release-a",
        DATABASE_URL:
          "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
        STAGING_DATABASE_URL:
          "postgresql://app:secret@ep-staging.us-east-2.aws.neon.tech/fcm",
        FCM_STAGING_MIGRATION_CONFIRMATION:
          "APPLY_STAGING_MIGRATIONS:release-b",
      }),
    ).toThrow("confirmation");
  });
});

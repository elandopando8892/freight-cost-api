import { describe, expect, it } from "vitest";
import {
  buildReleasePreflight,
  REQUIRED_RELEASE_MIGRATIONS,
} from "../src/modules/pilot/release-preflight.js";

const validEnvironment = {
  DATABASE_URL: "postgresql://app:secret@db.example.com:5432/fcm",
  KINDE_ISSUER_URL: "https://carrier.kinde.com",
  KINDE_AUDIENCE: "https://api.example.com",
  OPENAI_API_KEY: "stored-in-secret-manager",
  OPENAI_KEY_ROTATED_AT: "2026-08-12T00:00:00.000Z",
  OPENAI_MODEL: "gpt-4.1-mini",
  RELEASE_SHA: "a4fdc1e",
  CORS_ORIGINS: "https://freight-cost-web.example.com",
};

const validWebEnvironment = {
  API_URL: "https://api.example.com",
  KINDE_CLIENT_ID: "client-id",
  KINDE_CLIENT_SECRET: "stored-in-secret-manager",
  KINDE_ISSUER_URL: "https://carrier.kinde.com",
  KINDE_AUDIENCE: "https://api.example.com",
  KINDE_SITE_URL: "https://freight-cost-web.example.com",
  KINDE_POST_LOGIN_REDIRECT_URL: "https://freight-cost-web.example.com/",
  KINDE_POST_LOGOUT_REDIRECT_URL: "https://freight-cost-web.example.com",
  KINDE_SECRET_ROTATED_AT: "2026-08-12T00:00:00.000Z",
};

describe("release preflight", () => {
  it("passes static prerequisites without requiring Rateware", () => {
    const result = buildReleasePreflight({
      environment: validEnvironment,
      webEnvironment: validWebEnvironment,
      migrationArtifacts: [...REQUIRED_RELEASE_MIGRATIONS],
      gitDirtyFileCount: 0,
      gitHead: "a4fdc1e28c9e1000000000000000000000000000",
      requireRateware: false,
      nodeVersion: "20.19.0",
    });

    expect(result.ready).toBe(true);
    expect(result.warnings).toBe(1);
  });

  it("blocks placeholders, a dirty release and missing Rateware when required", () => {
    const result = buildReleasePreflight({
      environment: {
        ...validEnvironment,
        DATABASE_URL: "postgresql://user:password@localhost/fcm",
        RELEASE_SHA: "not-a-commit",
      },
      webEnvironment: {
        ...validWebEnvironment,
        API_URL: "http://localhost:3000",
        KINDE_SECRET_ROTATED_AT: "not-a-date",
      },
      migrationArtifacts: [],
      gitDirtyFileCount: 2,
      gitHead: "a4fdc1e28c9e1000000000000000000000000000",
      requireRateware: true,
      nodeVersion: "20.14.0",
    });

    expect(result.ready).toBe(false);
    expect(result.blockers).toBeGreaterThanOrEqual(4);
  });

  it("blocks a release identifier that does not match the checked commit", () => {
    const result = buildReleasePreflight({
      environment: validEnvironment,
      webEnvironment: validWebEnvironment,
      migrationArtifacts: [...REQUIRED_RELEASE_MIGRATIONS],
      gitDirtyFileCount: 0,
      gitHead: "b4fdc1e28c9e1000000000000000000000000000",
      requireRateware: false,
      nodeVersion: "20.19.0",
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.key === "RELEASE_SHA")?.status).toBe("BLOCK");
  });

  it("blocks an implicit or malformed AI model", () => {
    const result = buildReleasePreflight({
      environment: { ...validEnvironment, OPENAI_MODEL: "" },
      webEnvironment: validWebEnvironment,
      migrationArtifacts: [...REQUIRED_RELEASE_MIGRATIONS],
      gitDirtyFileCount: 0,
      gitHead: "a4fdc1e28c9e1000000000000000000000000000",
      requireRateware: false,
      nodeVersion: "20.19.0",
    });

    expect(result.checks.find((check) => check.key === "AI_KEY")?.status).toBe("BLOCK");
  });
});

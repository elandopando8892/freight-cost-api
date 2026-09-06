import { describe, expect, it } from "vitest";
import { evaluateStagingInfrastructure } from "../src/modules/pilot/staging-infrastructure.js";

const preview = (key: string) => ({
  key,
  type: "sensitive",
  target: ["preview"],
});

const api = [
  "STAGING_DATABASE_URL",
  "NODE_ENV",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_EXPECTED_PROJECT_REF",
  "SUPABASE_JWT_AUDIENCE",
  "CORS_ORIGINS",
  "OPENAI_API_KEY",
  "OPENAI_KEY_ROTATED_AT",
  "OPENAI_MODEL",
].map(preview);
const web = [
  "API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
].map(preview);

describe("staging infrastructure gate", () => {
  it("passes only with complete Preview-only database, API and Supabase configuration", () => {
    expect(evaluateStagingInfrastructure({ api, web })).toMatchObject({
      ready: true,
      blockers: 0,
    });
  });

  it("blocks the unsafe state: only a shared database and no web Preview vars", () => {
    const result = evaluateStagingInfrastructure({
      api: [
        {
          key: "DATABASE_URL",
          type: "sensitive",
          target: ["production", "preview"],
        },
        preview("NODE_ENV"),
      ],
      web: [],
    });
    expect(result.ready).toBe(false);
    expect(
      result.checks
        .filter((check) => check.status === "BLOCK")
        .map((check) => check.key),
    ).toEqual([
      "API_PREVIEW_CONFIGURATION",
      "WEB_PREVIEW_CONFIGURATION",
      "DATABASE_ISOLATION",
      "WEB_TO_API_ISOLATION",
      "SUPABASE_AUTH_ISOLATION",
    ]);
  });

  it("accepts an isolated prefixed staging database while the legacy URL remains shared", () => {
    const result = evaluateStagingInfrastructure({
      api: [
        ...api,
        {
          key: "DATABASE_URL",
          type: "sensitive",
          target: ["production", "preview"],
        },
      ],
      web,
    });
    expect(result).toMatchObject({ ready: true, blockers: 0 });
  });

  it("blocks production-shared web API and Supabase project credentials", () => {
    const result = evaluateStagingInfrastructure({
      api,
      web: web.map((entry) =>
        ["API_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].includes(entry.key)
          ? { ...entry, target: ["production", "preview"] }
          : entry,
      ),
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toBe(2);
  });

  it("blocks a Supabase API identity shared with Production", () => {
    const result = evaluateStagingInfrastructure({
      api: api.map((entry) =>
        entry.key === "SUPABASE_URL"
          ? { ...entry, target: ["production", "preview"] }
          : entry,
      ),
      web,
    });
    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.key === "SUPABASE_AUTH_ISOLATION")?.status).toBe("BLOCK");
  });
});

import { describe, expect, it } from "vitest";
import { evaluateStagingAuthBffSmoke } from "../src/modules/pilot/staging-auth-bff-smoke.js";

const validInput = {
  webOrigin: "https://web.staging.example",
  webLogin: {
    status: 200,
    headers: {
      contentSecurityPolicyReportOnly:
        "default-src 'self'; frame-ancestors 'none'; frame-src 'self' https:",
    },
    body: null,
  },
  bffUnauthenticated: {
    status: 401,
    headers: { cacheControl: "private, no-store" },
    body: { error: "Not authenticated" },
  },
  apiHealth: { status: 200, headers: {}, body: { status: "ok", release: "abc1234" } },
  apiReady: {
    status: 200,
    headers: {},
    body: { status: "ready", database: "connected", release: "abc1234" },
  },
  apiCors: {
    status: 200,
    headers: { accessControlAllowOrigin: "https://web.staging.example" },
    body: { status: "ok" },
  },
};

describe("staging auth/BFF smoke evaluation", () => {
  it("passes only the read-only staging contract", () => {
    expect(evaluateStagingAuthBffSmoke(validInput)).toMatchObject({ ready: true });
  });

  it("blocks a readiness release mismatch and an unsafe BFF response", () => {
    const result = evaluateStagingAuthBffSmoke({
      ...validInput,
      bffUnauthenticated: { status: 401, headers: {}, body: { error: "Not authenticated" } },
      apiReady: {
        status: 200,
        headers: {},
        body: { status: "ready", database: "connected", release: "different" },
      },
    });

    expect(result.ready).toBe(false);
    expect(result.checks.filter((check) => check.status === "BLOCK").map((check) => check.key)).toEqual([
      "BFF_UNAUTHENTICATED",
      "API_READY",
    ]);
  });

  it("blocks staging when CSP Report-Only is missing its frame protections", () => {
    const result = evaluateStagingAuthBffSmoke({
      ...validInput,
      webLogin: { status: 200, headers: {}, body: null },
    });

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.key === "WEB_CSP_REPORT_ONLY")?.status).toBe("BLOCK");
  });
});

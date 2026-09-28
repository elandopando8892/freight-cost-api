import { describe, expect, it } from "vitest";
import { evaluatePreviewPair } from "../src/modules/pilot/preview-pair-gate.js";

const sha = "90c132927cb96af4e3e230f102ae0c3f8171e737";
const webUrl = "https://freight-cost-web123-elandopando8892s-projects.vercel.app";
const apiUrl = "https://freight-cost-api123-elandopando8892s-projects.vercel.app";
const input = {
  webUrl,
  apiUrl,
  web: {
    id: "dpl_web",
    projectId: "prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV",
    url: new URL(webUrl).hostname,
    readyState: "READY",
    target: null,
    env: ["API_URL"],
    meta: { gitCommitSha: sha, gitCommitRef: "codex/test", gitDirty: "0" },
  },
  api: {
    id: "dpl_api",
    projectId: "prj_mw1xLIqutlRSIG2F2BryfPqDvN2L",
    url: new URL(apiUrl).hostname,
    readyState: "READY",
    target: null,
    meta: { gitCommitSha: sha, gitCommitRef: "codex/test", gitDirty: "0" },
  },
  health: { status: 200, body: { status: "ok", release: sha } },
  ready: { status: 200, body: { status: "ready", database: "connected", release: sha } },
};

describe("Preview pair release gate", () => {
  it("passes same-commit READY Preview deployments without claiming authenticated binding", () => {
    expect(evaluatePreviewPair(input)).toMatchObject({ status: "PASS", releaseSha: sha,
      authenticatedUpstreamVerified: false, remoteMutationPerformed: false });
  });

  it("blocks a mismatched API release or code commit", () => {
    const result = evaluatePreviewPair({ ...input,
      api: { ...input.api, meta: { ...input.api.meta, gitCommitSha: "a".repeat(40) } },
    });
    expect(result.status).toBe("BLOCK");
    expect(result.checks.filter(check => check.status === "BLOCK").map(check => check.key))
      .toContain("SAME_SHA");
  });

  it("rejects wrong API project, production target and missing API_URL configuration", () => {
    const result = evaluatePreviewPair({ ...input,
      web: { ...input.web, env: [] },
      api: { ...input.api, projectId: input.web.projectId, target: "production" },
    });
    expect(result.status).toBe("BLOCK");
    expect(result.checks.filter(check => check.status === "BLOCK").map(check => check.key))
      .toEqual(["API_DEPLOYMENT", "WEB_API_URL_PRESENT"]);
  });

  it("fails closed for another team or a missing API response", () => {
    const result = evaluatePreviewPair({ ...input,
      apiUrl: "https://freight-cost-api123-other-team.vercel.app",
      health: { status: 0, body: null },
      ready: { status: 0, body: null },
    });
    expect(result.status).toBe("BLOCK");
    expect(result.observedApiHttpStatus).toEqual({ health: 0, ready: 0 });
    expect(result.checks.filter(check => check.status === "BLOCK").map(check => check.key))
      .toEqual(["API_DEPLOYMENT", "API_HEALTH_RELEASE", "API_READY_RELEASE"]);
  });
});

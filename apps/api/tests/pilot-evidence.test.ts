import { describe, expect, it } from "vitest";
import { pilotEvidenceCsv } from "../src/modules/pilot/pilot-evidence.js";

describe("pilot evidence export", () => {
  it("creates an Excel-safe, read-only CSV with one row per gate", () => {
    const csv = pilotEvidenceCsv({
      generatedAt: new Date("2026-08-11T15:30:00.000Z"),
      orgId: "org-1",
      releaseId: "abc1234",
      policy: "EVIDENCE_BACKED_RELEASE_GATE",
      ready: false,
      blockers: 1,
      warnings: 0,
      stagingVerifications: {
        smoke: {
          kind: "STAGING_AUTH_BFF_SMOKE",
          status: "PASS",
          verificationId: "smoke-1",
          outcome: "PASS",
          executedAt: new Date("2026-08-11T15:00:00.000Z"),
          verifiedById: "verifier-1",
        },
        human: {
          kind: "STAGING_AUTH_BFF_HUMAN",
          status: "MISSING",
          verificationId: null,
          outcome: null,
          executedAt: null,
          verifiedById: null,
        },
      },
      checks: [
        {
          key: "AI_KEY_ROTATION",
          status: "BLOCK",
          label: "Rotaci\u00f3n de clave AI",
          detail: "=needs attention",
          href: "/settings",
        },
      ],
    });

    expect(csv).toContain('"Generated At"');
    expect(csv).toContain('"Organization ID"');
    expect(csv).toContain('"org-1"');
    expect(csv).toContain('"Release ID"');
    expect(csv).toContain('"abc1234"');
    expect(csv).toContain('"smoke-1"');
    expect(csv).toContain('"AI_KEY_ROTATION"');
    expect(csv).toContain('"\'=needs attention"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});

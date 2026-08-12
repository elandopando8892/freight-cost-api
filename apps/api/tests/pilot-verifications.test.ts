import { describe, expect, it, vi } from "vitest";
import {
  evaluatePilotVerificationGate,
  PILOT_VERIFICATION_FUTURE_TOLERANCE_MS,
  PILOT_VERIFICATION_MAX_AGE_MS,
  pilotVerificationBlocker,
  pilotVerificationEvidence,
} from "../src/modules/pilot/pilot-verifications.js";

const smokePass = {
  kind: "STAGING_AUTH_BFF_SMOKE" as const,
  outcome: "PASS" as const,
  checks: [
    { key: "WEB_LOGIN", status: "PASS" as const },
    { key: "WEB_CSP_REPORT_ONLY", status: "PASS" as const },
    { key: "BFF_UNAUTHENTICATED", status: "PASS" as const },
    { key: "API_HEALTH", status: "PASS" as const },
    { key: "API_READY", status: "PASS" as const },
    { key: "API_CORS", status: "PASS" as const },
  ],
};

describe("pilot verification evidence", () => {
  it("accepts a complete staging smoke pass without treating it as a GO decision", () => {
    expect(pilotVerificationBlocker(smokePass)).toBeNull();
    expect(pilotVerificationEvidence(smokePass)).toMatchObject({
      schemaVersion: "fcm.pilot-verification.v1",
      outcome: "PASS",
    });
  });

  it("rejects incomplete and contradictory evidence", () => {
    expect(
      pilotVerificationBlocker({ ...smokePass, checks: smokePass.checks.slice(0, 5) }),
    ).toMatch(/exactamente/i);
    expect(
      pilotVerificationBlocker({
        ...smokePass,
        checks: smokePass.checks.map((check, index) =>
          index === 0 ? { ...check, status: "BLOCK" as const } : check,
        ),
      }),
    ).toMatch(/todos/i);
  });

  it("rejects an execution timestamp beyond the five-minute future tolerance", () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      expect(
        pilotVerificationBlocker({
          ...smokePass,
          executedAt: new Date(now + PILOT_VERIFICATION_FUTURE_TOLERANCE_MS + 1),
        }),
      ).toMatch(/futuro/i);
    } finally {
      clock.mockRestore();
    }
  });

  it("uses the latest result and invalidates stale or mismatched evidence", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const records = [
      {
        id: "smoke-pass",
        kind: "STAGING_AUTH_BFF_SMOKE" as const,
        outcome: "PASS" as const,
        releaseId: "abc1234",
        executedAt: new Date("2026-08-12T10:00:00.000Z"),
        verifiedById: "verifier-1",
        createdAt: new Date("2026-08-12T10:01:00.000Z"),
      },
      {
        id: "smoke-fail",
        kind: "STAGING_AUTH_BFF_SMOKE" as const,
        outcome: "FAIL" as const,
        releaseId: "abc1234",
        executedAt: new Date("2026-08-12T11:00:00.000Z"),
        verifiedById: "verifier-2",
        createdAt: new Date("2026-08-12T11:01:00.000Z"),
      },
      {
        id: "human-other-release",
        kind: "STAGING_AUTH_BFF_HUMAN" as const,
        outcome: "PASS" as const,
        releaseId: "different",
        executedAt: new Date("2026-08-12T11:00:00.000Z"),
        verifiedById: "verifier-3",
        createdAt: new Date("2026-08-12T11:02:00.000Z"),
      },
    ];

    expect(evaluatePilotVerificationGate(records, "abc1234", now)).toMatchObject({
      stagingSmokeVerified: false,
      stagingHumanVerified: false,
      stagingSmokeStatus: "FAIL",
      stagingHumanStatus: "MISSING",
    });
  });

  it("orders evidence by execution time even when it was registered out of order", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const gate = evaluatePilotVerificationGate(
      [
        {
          id: "pass-recorded-late",
          kind: "STAGING_AUTH_BFF_SMOKE",
          outcome: "PASS",
          releaseId: "abc1234",
          executedAt: new Date("2026-08-12T10:00:00.000Z"),
          verifiedById: "verifier-1",
          createdAt: new Date("2026-08-12T11:30:00.000Z"),
        },
        {
          id: "fail-executed-later",
          kind: "STAGING_AUTH_BFF_SMOKE",
          outcome: "FAIL",
          releaseId: "abc1234",
          executedAt: new Date("2026-08-12T11:00:00.000Z"),
          verifiedById: "verifier-2",
          createdAt: new Date("2026-08-12T11:01:00.000Z"),
        },
      ],
      "abc1234",
      now,
    );

    expect(gate).toMatchObject({
      stagingSmokeVerified: false,
      stagingSmokeStatus: "FAIL",
      stagingVerifications: {
        smoke: { verificationId: "fail-executed-later" },
      },
    });
  });

  it("requires both latest PASS results to be no more than 24 hours old", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const records = [
      {
        id: "fresh-smoke",
        kind: "STAGING_AUTH_BFF_SMOKE" as const,
        outcome: "PASS" as const,
        releaseId: "abc1234",
        executedAt: new Date("2026-08-12T11:00:00.000Z"),
        verifiedById: "verifier-1",
        createdAt: new Date("2026-08-12T11:01:00.000Z"),
      },
      {
        id: "stale-human",
        kind: "STAGING_AUTH_BFF_HUMAN" as const,
        outcome: "PASS" as const,
        releaseId: "abc1234",
        executedAt: new Date("2026-08-11T11:59:59.000Z"),
        verifiedById: "verifier-2",
        createdAt: new Date("2026-08-12T11:02:00.000Z"),
      },
    ];

    expect(evaluatePilotVerificationGate(records, "ABC1234", now)).toMatchObject({
      stagingSmokeVerified: true,
      stagingHumanVerified: false,
      stagingSmokeStatus: "PASS",
      stagingHumanStatus: "STALE",
    });
  });

  it("applies exact freshness boundaries and a deterministic id tie-break", () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    const record = (
      id: string,
      kind: "STAGING_AUTH_BFF_SMOKE" | "STAGING_AUTH_BFF_HUMAN",
      outcome: "PASS" | "FAIL",
      executedAt: Date,
    ) => ({
      id,
      kind,
      outcome,
      releaseId: "abc1234",
      executedAt,
      verifiedById: `verifier-${kind}`,
      createdAt: new Date("2026-08-12T11:00:00.000Z"),
    });

    const atBoundary = evaluatePilotVerificationGate(
      [
        record(
          "smoke-at-24h",
          "STAGING_AUTH_BFF_SMOKE",
          "PASS",
          new Date(now.getTime() - PILOT_VERIFICATION_MAX_AGE_MS),
        ),
        record(
          "human-at-plus-5m",
          "STAGING_AUTH_BFF_HUMAN",
          "PASS",
          new Date(now.getTime() + PILOT_VERIFICATION_FUTURE_TOLERANCE_MS),
        ),
      ],
      "abc1234",
      now,
    );
    expect(atBoundary).toMatchObject({
      stagingSmokeStatus: "PASS",
      stagingHumanStatus: "PASS",
    });

    const outsideBoundary = evaluatePilotVerificationGate(
      [
        record(
          "smoke-stale",
          "STAGING_AUTH_BFF_SMOKE",
          "PASS",
          new Date(now.getTime() - PILOT_VERIFICATION_MAX_AGE_MS - 1),
        ),
        record(
          "human-future",
          "STAGING_AUTH_BFF_HUMAN",
          "PASS",
          new Date(now.getTime() + PILOT_VERIFICATION_FUTURE_TOLERANCE_MS + 1),
        ),
      ],
      "abc1234",
      now,
    );
    expect(outsideBoundary).toMatchObject({
      stagingSmokeStatus: "STALE",
      stagingHumanStatus: "FUTURE",
    });

    const tied = evaluatePilotVerificationGate(
      [
        record("a-fail", "STAGING_AUTH_BFF_SMOKE", "FAIL", now),
        record("z-pass", "STAGING_AUTH_BFF_SMOKE", "PASS", now),
      ],
      "abc1234",
      now,
    );
    expect(tied.stagingVerifications.smoke.verificationId).toBe("z-pass");
    expect(tied.stagingSmokeStatus).toBe("PASS");
  });
});

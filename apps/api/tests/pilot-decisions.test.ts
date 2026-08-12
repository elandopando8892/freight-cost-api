import { describe, expect, it } from "vitest";
import {
  pilotDecisionBlocker,
  pilotDecisionEvidence,
  pilotGateFingerprint,
  pilotGoApprovalBlocker,
} from "../src/modules/pilot/pilot-decisions.js";

const blockedEvidence = {
  generatedAt: new Date("2026-08-11T15:30:00.000Z"),
  orgId: "org-1",
  releaseId: "abc1234",
  policy: "EVIDENCE_BACKED_RELEASE_GATE",
  ready: false,
  blockers: 1,
  warnings: 0,
  stagingVerifications: {
    smoke: {
      kind: "STAGING_AUTH_BFF_SMOKE" as const,
      status: "PASS" as const,
      verificationId: "smoke-1",
      outcome: "PASS" as const,
      executedAt: new Date("2026-08-11T15:00:00.000Z"),
      verifiedById: "verifier-1",
    },
    human: {
      kind: "STAGING_AUTH_BFF_HUMAN" as const,
      status: "MISSING" as const,
      verificationId: null,
      outcome: null,
      executedAt: null,
      verifiedById: null,
    },
  },
  checks: [
    {
      key: "AI_KEY_ROTATION",
      status: "BLOCK" as const,
      label: "Rotación de clave AI",
      detail: "Missing",
      href: "/settings",
    },
  ],
};

describe("pilot decision ledger policy", () => {
  it("does not let a GO record hide readiness blockers", () => {
    expect(pilotDecisionBlocker("GO", blockedEvidence)).toMatch(/no blockers/i);
  });

  it("records the evaluated snapshot rather than a mutable reference", () => {
    expect(pilotDecisionEvidence(blockedEvidence)).toEqual({
      generatedAt: "2026-08-11T15:30:00.000Z",
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
          executedAt: "2026-08-11T15:00:00.000Z",
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
          label: "Rotación de clave AI",
          detail: "Missing",
          module: "/settings",
        },
      ],
    });
  });

  it("allows NO_GO to document a deliberate stop at any state", () => {
    expect(pilotDecisionBlocker("NO_GO", blockedEvidence)).toBeNull();
  });

  it("separates selected verifiers from GO approvers", () => {
    const readyEvidence = {
      ...blockedEvidence,
      ready: true,
      blockers: 0,
      stagingVerifications: {
        smoke: blockedEvidence.stagingVerifications.smoke,
        human: {
          kind: "STAGING_AUTH_BFF_HUMAN" as const,
          status: "PASS" as const,
          verificationId: "human-1",
          outcome: "PASS" as const,
          executedAt: new Date("2026-08-11T15:05:00.000Z"),
          verifiedById: "verifier-2",
        },
      },
      checks: blockedEvidence.checks.map((check) => ({
        ...check,
        status: "PASS" as const,
      })),
    };

    expect(pilotGoApprovalBlocker("verifier-1", readyEvidence)).toMatch(
      /verifier/i,
    );
    expect(pilotGoApprovalBlocker("admin-1", readyEvidence)).toBeNull();
  });

  it("fingerprints the gate deterministically and changes when evidence changes", () => {
    const readyEvidence = {
      ...blockedEvidence,
      ready: true,
      blockers: 0,
      generatedAt: new Date("2026-08-12T00:00:00.000Z"),
      stagingVerifications: {
        smoke: blockedEvidence.stagingVerifications.smoke,
        human: {
          kind: "STAGING_AUTH_BFF_HUMAN" as const,
          status: "PASS" as const,
          verificationId: "human-1",
          outcome: "PASS" as const,
          executedAt: new Date("2026-08-11T15:05:00.000Z"),
          verifiedById: "verifier-2",
        },
      },
      checks: blockedEvidence.checks.map((check) => ({
        ...check,
        status: "PASS" as const,
      })),
    };
    const fingerprint = pilotGateFingerprint(readyEvidence);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      pilotGateFingerprint({
        ...readyEvidence,
        generatedAt: new Date("2026-08-12T00:01:00.000Z"),
      }),
    ).toBe(fingerprint);
    expect(
      pilotGateFingerprint({
        ...readyEvidence,
        stagingVerifications: {
          ...readyEvidence.stagingVerifications,
          human: {
            ...readyEvidence.stagingVerifications.human,
            verificationId: "human-2",
          },
        },
      }),
    ).not.toBe(fingerprint);
  });
});

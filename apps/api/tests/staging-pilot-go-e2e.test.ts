import { describe, expect, it } from "vitest";
import {
  evaluatePilotGoSequence,
  evaluatePilotStagingPreflight,
  stagingPilotExecutionConfirmation,
} from "../src/modules/pilot/staging-pilot-go-e2e.js";

const actor = (userId: string) => ({
  userId,
  orgId: "org-staging",
  role: "ADMIN" as const,
  releaseId: "abc1234",
});

const validInput = {
  expectedReleaseId: "abc1234",
  expectedOrgId: "org-staging",
  health: { status: 200, releaseId: "abc1234", bodyRelease: "abc1234" },
  ready: {
    status: 200,
    releaseId: "abc1234",
    bodyRelease: "abc1234",
    bodyStatus: "ready",
    database: "connected",
  },
  actors: {
    smokeVerifier: actor("verifier-smoke"),
    humanVerifier: actor("verifier-human"),
    approverOne: actor("approver-one"),
    approverTwo: actor("approver-two"),
  },
  readiness: {
    ready: true,
    releaseId: "abc1234",
    blockers: 0,
    checks: [{ key: "STAGING_SMOKE", status: "PASS" as const }],
    stagingVerifications: {
      smoke: {
        status: "PASS",
        verificationId: "smoke-1",
        verifiedById: "verifier-smoke",
      },
      human: {
        status: "PASS",
        verificationId: "human-1",
        verifiedById: "verifier-human",
      },
    },
  },
};

describe("controlled staging pilot GO E2E", () => {
  it("passes read-only preflight only for four distinct admins and selected verifiers", () => {
    expect(evaluatePilotStagingPreflight(validInput)).toMatchObject({
      ready: true,
      checks: [
        { key: "API_HEALTH", status: "PASS" },
        { key: "API_READY", status: "PASS" },
        { key: "FOUR_DISTINCT_ADMINS", status: "PASS" },
        { key: "SELECTED_VERIFIERS", status: "PASS" },
        { key: "CURRENT_RELEASE_GATE", status: "PASS" },
      ],
    });
  });

  it("blocks duplicate identities, another tenant and substituted verification authors", () => {
    const result = evaluatePilotStagingPreflight({
      ...validInput,
      actors: {
        ...validInput.actors,
        approverTwo: actor("approver-one"),
        humanVerifier: {
          ...actor("verifier-human"),
          orgId: "other-org",
        },
      },
      readiness: {
        ...validInput.readiness,
        stagingVerifications: {
          ...validInput.readiness.stagingVerifications,
          smoke: {
            ...validInput.readiness.stagingVerifications.smoke,
            verifiedById: "substituted-user",
          },
        },
      },
    });
    expect(result.ready).toBe(false);
    expect(
      result.checks
        .filter((check) => check.status === "BLOCK")
        .map((check) => check.key),
    ).toEqual(["FOUR_DISTINCT_ADMINS", "SELECTED_VERIFIERS"]);
  });

  it("requires the exact release and organization in the execution confirmation", () => {
    expect(stagingPilotExecutionConfirmation("ABC1234", "org-staging")).toBe(
      "EXECUTE_STAGING_GO:abc1234:org-staging",
    );
  });

  it("accepts only the expected 202, 409, 201 sequence and persisted dual evidence", () => {
    expect(
      evaluatePilotGoSequence({
        first: {
          status: 202,
          state: "PENDING_SECOND_APPROVAL",
          approvalCount: 1,
        },
        duplicate: {
          status: 409,
          error: "A second distinct administrator must approve this GO round.",
        },
        second: {
          status: 201,
          state: "GO_RECORDED",
          approvalCount: 2,
          decisionId: "decision-1",
        },
        decisionPersisted: true,
        linkedDistinctApprovalCount: 2,
      }),
    ).toMatchObject({ ready: true });
  });

  it("blocks a sequence that did not persist two distinct approvals", () => {
    const result = evaluatePilotGoSequence({
      first: {
        status: 202,
        state: "PENDING_SECOND_APPROVAL",
        approvalCount: 1,
      },
      duplicate: {
        status: 409,
        error: "A second distinct administrator must approve this GO round.",
      },
      second: {
        status: 201,
        state: "GO_RECORDED",
        approvalCount: 2,
        decisionId: "decision-1",
      },
      decisionPersisted: true,
      linkedDistinctApprovalCount: 1,
    });
    expect(result.ready).toBe(false);
    expect(
      result.checks.find((check) => check.key === "PERSISTED_DUAL_EVIDENCE")
        ?.status,
    ).toBe("BLOCK");
  });
});

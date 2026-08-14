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
    administrator: actor("admin-one"),
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
        verifiedById: "admin-one",
      },
      human: {
        status: "PASS",
        verificationId: "human-1",
        verifiedById: "admin-one",
      },
    },
  },
};

describe("controlled staging pilot GO E2E", () => {
  it("passes read-only preflight for the tenant administrator and selected evidence", () => {
    expect(evaluatePilotStagingPreflight(validInput)).toMatchObject({
      ready: true,
      checks: [
        { key: "API_HEALTH", status: "PASS" },
        { key: "API_READY", status: "PASS" },
        { key: "SINGLE_ADMIN_CONTEXT", status: "PASS" },
        { key: "SELECTED_VERIFIERS", status: "PASS" },
        { key: "CURRENT_RELEASE_GATE", status: "PASS" },
      ],
    });
  });

  it("blocks another tenant and substituted verification authors", () => {
    const result = evaluatePilotStagingPreflight({
      ...validInput,
      actors: {
        administrator: {
          ...actor("admin-one"),
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
    ).toEqual(["SINGLE_ADMIN_CONTEXT", "SELECTED_VERIFIERS"]);
  });

  it("requires the exact release and organization in the execution confirmation", () => {
    expect(stagingPilotExecutionConfirmation("ABC1234", "org-staging")).toBe(
      "EXECUTE_STAGING_GO:abc1234:org-staging",
    );
  });

  it("accepts a persisted single-admin GO sequence", () => {
    expect(
      evaluatePilotGoSequence({
        approval: {
          status: 201,
          state: "GO_RECORDED",
          approvalCount: 1,
          decisionId: "decision-1",
        },
        decisionPersisted: true,
        linkedApprovalCount: 1,
      }),
    ).toMatchObject({ ready: true });
  });

  it("blocks a sequence without its linked approval", () => {
    const result = evaluatePilotGoSequence({
      approval: {
        status: 201,
        state: "GO_RECORDED",
        approvalCount: 1,
        decisionId: "decision-1",
      },
      decisionPersisted: true,
      linkedApprovalCount: 0,
    });
    expect(result.ready).toBe(false);
    expect(
      result.checks.find(
        (check) => check.key === "PERSISTED_SINGLE_ADMIN_EVIDENCE",
      )
        ?.status,
    ).toBe("BLOCK");
  });
});

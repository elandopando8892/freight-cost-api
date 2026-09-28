import { describe, expect, it } from "vitest";
import {
  FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
  findCoveringRedirect,
  isFreightCostVercelPreview,
  isRecognizedFreightCostCheckoutProject,
  isVerifiedFreightCostWebDeployment,
  previewCallbackUrl,
  supabaseRedirectPatternMatches,
} from "../src/modules/pilot/oauth-preview-coverage.js";

const currentExactRedirects = [
  "https://freight-cost-web.vercel.app/auth/callback",
  "https://freight-cost-750by6gk5-elandopando8892s-projects.vercel.app/auth/callback",
  "https://freight-cost-qcpvt06i8-elandopando8892s-projects.vercel.app/auth/callback",
];

describe("OAuth preview coverage", () => {
  it("detects that a newly generated preview is outside the current exact list", () => {
    const preview =
      "https://freight-cost-next123-elandopando8892s-projects.vercel.app";

    expect(previewCallbackUrl(preview)).toBe(`${preview}/auth/callback`);
    expect(findCoveringRedirect(preview, currentExactRedirects)).toBeNull();
  });

  it("accepts the project-and-team scoped callback pattern", () => {
    const preview =
      "https://freight-cost-next123-elandopando8892s-projects.vercel.app";

    expect(
      findCoveringRedirect(preview, [FCM_SCOPED_PREVIEW_CALLBACK_PATTERN]),
    ).toBe(FCM_SCOPED_PREVIEW_CALLBACK_PATTERN);
  });

  it("does not authorize another Vercel team or an arbitrary vercel.app host", () => {
    expect(
      isFreightCostVercelPreview(
        "https://freight-cost-next123-other-team.vercel.app",
      ),
    ).toBe(false);
    expect(
      supabaseRedirectPatternMatches(
        FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
        "https://unrelated-elandopando8892s-projects.vercel.app/auth/callback",
      ),
    ).toBe(false);
    expect(
      supabaseRedirectPatternMatches(
        FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
        "https://freight-cost-next123-elandopando8892s-projects.vercel.app/other",
      ),
    ).toBe(false);
  });

  it("keeps single-star wildcards inside one hostname segment", () => {
    expect(
      supabaseRedirectPatternMatches(
        FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
        "https://freight-cost-a.b-elandopando8892s-projects.vercel.app/auth/callback",
      ),
    ).toBe(false);
  });

  it("requires the exact READY Web project deployment, not merely a similar URL", () => {
    const preview = "https://freight-cost-next123-elandopando8892s-projects.vercel.app";
    const deployment = {
      projectId: "prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV",
      url: "freight-cost-next123-elandopando8892s-projects.vercel.app",
      readyState: "READY",
      target: null,
    };
    expect(isVerifiedFreightCostWebDeployment(preview, deployment)).toBe(true);
    expect(isVerifiedFreightCostWebDeployment(preview, { ...deployment, projectId: "prj_mw1xLIqutlRSIG2F2BryfPqDvN2L" })).toBe(false);
    expect(isVerifiedFreightCostWebDeployment(preview, { ...deployment, readyState: "ERROR" })).toBe(false);
    expect(isVerifiedFreightCostWebDeployment(preview, { ...deployment, target: "production" })).toBe(false);
    expect(isVerifiedFreightCostWebDeployment(preview, { ...deployment, url: "freight-cost-other-elandopando8892s-projects.vercel.app" })).toBe(false);
  });

  it("accepts only the API or Web link from the verified team in this monorepo", () => {
    const orgId = "team_KUG1PtOwoJ16eUqxiOJ330Os";
    expect(isRecognizedFreightCostCheckoutProject({ orgId,
      projectId: "prj_mw1xLIqutlRSIG2F2BryfPqDvN2L", projectName: "freight-cost-api" })).toBe(true);
    expect(isRecognizedFreightCostCheckoutProject({ orgId,
      projectId: "prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV", projectName: "freight-cost-web" })).toBe(true);
    expect(isRecognizedFreightCostCheckoutProject({ orgId: "other-team",
      projectId: "prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV", projectName: "freight-cost-web" })).toBe(false);
    expect(isRecognizedFreightCostCheckoutProject({ orgId,
      projectId: "prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV", projectName: "unrelated" })).toBe(false);
  });
});

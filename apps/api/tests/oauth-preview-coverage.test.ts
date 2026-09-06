import { describe, expect, it } from "vitest";
import {
  FCM_SCOPED_PREVIEW_CALLBACK_PATTERN,
  findCoveringRedirect,
  isFreightCostVercelPreview,
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
});

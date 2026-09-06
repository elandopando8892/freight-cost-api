export const FCM_VERCEL_PROJECT = {
  id: "prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV",
  name: "freight-cost-web",
  teamId: "team_KUG1PtOwoJ16eUqxiOJ330Os",
  teamSlug: "elandopando8892s-projects",
} as const;

export const FCM_SUPABASE_PROJECT = {
  ref: "alqjqzqagdmcywpjtnnr",
  name: "rateware-prod",
} as const;

export const FCM_AUTH_CALLBACK_PATH = "/auth/callback";
export const FCM_SCOPED_PREVIEW_CALLBACK_PATTERN =
  `https://freight-cost-*-${FCM_VERCEL_PROJECT.teamSlug}.vercel.app${FCM_AUTH_CALLBACK_PATH}`;

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

/** Implements the wildcard behavior documented for Supabase redirect URLs. */
export function supabaseRedirectPatternMatches(
  pattern: string,
  candidate: string,
) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      expression += ".*";
      index += 1;
    } else if (character === "*") {
      expression += "[^./]*";
    } else if (character === "?") {
      expression += "[^./]";
    } else {
      expression += escapeRegex(character);
    }
  }
  return new RegExp(`^${expression}$`).test(candidate);
}

export function previewCallbackUrl(previewUrl: string) {
  const parsed = new URL(previewUrl);
  return `${parsed.origin}${FCM_AUTH_CALLBACK_PATH}`;
}

export function isFreightCostVercelPreview(previewUrl: string) {
  try {
    const parsed = new URL(previewUrl);
    const expectedHost = new RegExp(
      `^freight-cost-[a-z0-9-]+-${escapeRegex(FCM_VERCEL_PROJECT.teamSlug)}\\.vercel\\.app$`,
    );
    return (
      parsed.protocol === "https:" &&
      parsed.port === "" &&
      expectedHost.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function findCoveringRedirect(
  previewUrl: string,
  redirectAllowList: string[],
) {
  if (!isFreightCostVercelPreview(previewUrl)) return null;
  const callback = previewCallbackUrl(previewUrl);
  return (
    redirectAllowList.find((pattern) =>
      supabaseRedirectPatternMatches(pattern.trim(), callback),
    ) ?? null
  );
}

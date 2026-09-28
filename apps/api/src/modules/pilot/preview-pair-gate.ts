import {
  FCM_API_VERCEL_PROJECT,
  isFreightCostVercelPreview,
  isVerifiedFreightCostWebDeployment,
} from "./oauth-preview-coverage.js";

type Deployment = {
  id?: string;
  projectId?: string;
  url?: string;
  readyState?: string;
  target?: string | null;
  env?: string[];
  meta?: { gitCommitSha?: string; gitCommitRef?: string; gitDirty?: string };
};

type ApiProbe = {
  status: number;
  body: { status?: string; database?: string; release?: string } | null;
};

export type PreviewPairInput = {
  webUrl: string;
  apiUrl: string;
  web: Deployment;
  api: Deployment;
  health: ApiProbe;
  ready: ApiProbe;
};

export function evaluatePreviewPair(input: PreviewPairInput) {
  const webVerified = isVerifiedFreightCostWebDeployment(input.webUrl, input.web);
  const apiVerified = isFreightCostVercelPreview(input.apiUrl) &&
    input.api.projectId === FCM_API_VERCEL_PROJECT.id &&
    input.api.url === new URL(input.apiUrl).hostname &&
    input.api.readyState === "READY" &&
    input.api.target !== "production";
  const webSha = input.web.meta?.gitCommitSha;
  const apiSha = input.api.meta?.gitCommitSha;
  const sameSha = Boolean(webSha && /^[a-f0-9]{40}$/i.test(webSha) && webSha === apiSha);
  const sameRef = Boolean(input.web.meta?.gitCommitRef &&
    input.web.meta.gitCommitRef === input.api.meta?.gitCommitRef);
  const clean = input.web.meta?.gitDirty === "0" && input.api.meta?.gitDirty === "0";
  const apiUrlConfigured = input.web.env?.includes("API_URL") ?? false;
  const healthOk = input.health.status === 200 && input.health.body?.status === "ok" &&
    input.health.body.release === apiSha;
  const readyOk = input.ready.status === 200 && input.ready.body?.status === "ready" &&
    input.ready.body.database === "connected" && input.ready.body.release === apiSha;
  const checks = [
    { key: "WEB_DEPLOYMENT", pass: webVerified },
    { key: "API_DEPLOYMENT", pass: apiVerified },
    { key: "SAME_SHA", pass: sameSha },
    { key: "SAME_REF", pass: sameRef },
    { key: "CLEAN_SOURCE", pass: clean },
    { key: "WEB_API_URL_PRESENT", pass: apiUrlConfigured },
    { key: "API_HEALTH_RELEASE", pass: healthOk },
    { key: "API_READY_RELEASE", pass: readyOk },
  ].map(({ key, pass }) => ({ key, status: pass ? "PASS" : "BLOCK" }));

  return {
    schemaVersion: "fcm.preview-pair-gate.v1",
    status: checks.every(check => check.status === "PASS") ? "PASS" : "BLOCK",
    webDeploymentId: input.web.id ?? null,
    apiDeploymentId: input.api.id ?? null,
    releaseSha: sameSha ? webSha : null,
    observedApiHttpStatus: { health: input.health.status, ready: input.ready.status },
    checks,
    // Vercel exposes deployment environment key names, not the API_URL value.
    // Only an authenticated request through the Web BFF can prove the binding.
    authenticatedUpstreamVerified: false,
    remoteMutationPerformed: false,
  };
}

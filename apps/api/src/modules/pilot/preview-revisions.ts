import { z } from 'zod';
import { FCM_VERCEL_PROJECT, isFreightCostVercelPreview } from './oauth-preview-coverage.js';

const deployment = z.object({
  id: z.string().regex(/^dpl_[A-Za-z0-9]+$/),
  projectId: z.string(),
  state: z.string(),
  target: z.string().nullable(),
  url: z.string(),
  sha: z.string().regex(/^[a-f0-9]{40}$/i),
  gitDirty: z.enum(['0', '1']).optional(),
});
export const PreviewRevisionEvidence = z.object({
  observedAt: z.string().datetime(),
  teamId: z.string(),
  repository: z.string(),
  web: deployment,
  api: deployment,
});

/** Metadata alignment only: neither an authenticated test nor deployment attestation. */
export function checkPreviewRevisions(evidence: unknown, expectedSha: string, now = new Date()) {
  const reasons: string[] = [];
  const parsed = PreviewRevisionEvidence.safeParse(evidence);
  if (!/^[a-f0-9]{40}$/i.test(expectedSha)) reasons.push('EXPECTED_SHA_INVALID');
  if (!parsed.success) reasons.push('EVIDENCE_INVALID');
  if (parsed.success) {
    const data = parsed.data;
    const age = now.getTime() - Date.parse(data.observedAt);
    if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) reasons.push('EVIDENCE_STALE_OR_FUTURE');
    if (data.teamId !== FCM_VERCEL_PROJECT.teamId) reasons.push('TEAM_MISMATCH');
    if (data.repository !== 'elandopando8892/freight-cost-api') reasons.push('REPOSITORY_MISMATCH');
    for (const [role, projectId] of [
      ['web', FCM_VERCEL_PROJECT.id],
      ['api', 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L'],
    ] as const) {
      const item = data[role];
      const prefix = role.toUpperCase();
      if (item.projectId !== projectId) reasons.push(`${prefix}_PROJECT_MISMATCH`);
      if (item.state !== 'READY') reasons.push(`${prefix}_NOT_READY`);
      if (item.target !== null && item.target !== 'preview') reasons.push(`${prefix}_NOT_PREVIEW`);
      if (item.gitDirty === '1') reasons.push(`${prefix}_DIRTY_SOURCE`);
      if (item.sha.toLowerCase() !== expectedSha.toLowerCase()) reasons.push(`${prefix}_SHA_MISMATCH`);
      let validOrigin = false;
      try {
        const url = new URL(item.url);
        validOrigin = isFreightCostVercelPreview(item.url) && url.pathname === '/' &&
          !url.username && !url.password && !url.search && !url.hash;
      } catch { /* Fail closed on malformed URLs. */ }
      if (!validOrigin) reasons.push(`${prefix}_ORIGIN_INVALID`);
    }
    if (data.web.id === data.api.id || data.web.url === data.api.url) reasons.push('DEPLOYMENTS_NOT_DISTINCT');
  }
  return {
    schemaVersion: 'fcm.preview-revisions.v1',
    status: reasons.length ? 'BLOCK' : 'PASS',
    scope: 'DECLARED_DEPLOYMENT_METADATA_ONLY',
    authenticatedQa: 'PENDING',
    upstreamRouting: 'NOT_VERIFIED',
    oauthCoverage: 'NOT_VERIFIED',
    remoteMutationPerformed: false,
    reasons,
  } as const;
}

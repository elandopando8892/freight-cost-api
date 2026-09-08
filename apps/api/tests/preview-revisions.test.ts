import { describe, expect, it } from 'vitest';
import { checkPreviewRevisions } from '../src/modules/pilot/preview-revisions.js';

const sha = 'a'.repeat(40);
const now = new Date('2026-09-08T16:25:01Z');
function fixture() {
  return {
    observedAt: now.toISOString(), teamId: 'team_KUG1PtOwoJ16eUqxiOJ330Os',
    repository: 'elandopando8892/freight-cost-api',
    web: { id: 'dpl_web', projectId: 'prj_yDKQHWchDSqxPSh1RF6SJnhiwzxV', state: 'READY', target: null as string | null, url: 'https://freight-cost-webtest-elandopando8892s-projects.vercel.app', sha, gitDirty: '0' },
    api: { id: 'dpl_api', projectId: 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L', state: 'READY', target: null as string | null, url: 'https://freight-cost-apitest-elandopando8892s-projects.vercel.app', sha, gitDirty: '0' },
  };
}
describe('preview revision metadata gate', () => {
  it('passes matching metadata without claiming authenticated QA or upstream proof', () => {
    expect(checkPreviewRevisions(fixture(), sha, now)).toMatchObject({ status: 'PASS', authenticatedQa: 'PENDING', upstreamRouting: 'NOT_VERIFIED', oauthCoverage: 'NOT_VERIFIED', remoteMutationPerformed: false });
  });
  it.each(['web', 'api'] as const)('rejects old %s code', (role) => {
    const data = fixture(); data[role].sha = 'b'.repeat(40);
    expect(checkPreviewRevisions(data, sha, now).reasons).toContain(`${role.toUpperCase()}_SHA_MISMATCH`);
  });
  it.each([
    ['state', 'ERROR', 'WEB_NOT_READY'], ['target', 'production', 'WEB_NOT_PREVIEW'],
    ['gitDirty', '1', 'WEB_DIRTY_SOURCE'], ['projectId', 'other', 'WEB_PROJECT_MISMATCH'],
    ['url', 'https://other.vercel.app', 'WEB_ORIGIN_INVALID'],
    ['url', 'https://user:secret@freight-cost-webtest-elandopando8892s-projects.vercel.app', 'WEB_ORIGIN_INVALID'],
    ['url', 'https://freight-cost-webtest-elandopando8892s-projects.vercel.app/auth/callback?code=private', 'WEB_ORIGIN_INVALID'],
  ])('rejects %s=%s', (key, value, reason) => {
    const data = fixture(); Object.assign(data.web, { [key]: value });
    const result = checkPreviewRevisions(data, sha, now);
    expect(result.reasons).toContain(reason);
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it.each(['2026-09-06T16:25:01Z', '2026-09-09T16:25:01Z'])('rejects stale/future evidence %s', (observedAt) => {
    expect(checkPreviewRevisions({ ...fixture(), observedAt }, sha, now).reasons).toContain('EVIDENCE_STALE_OR_FUTURE');
  });
  it('rejects wrong team and repository', () => {
    expect(checkPreviewRevisions({ ...fixture(), teamId: 'other', repository: 'other/repo' }, sha, now).reasons).toEqual(expect.arrayContaining(['TEAM_MISMATCH', 'REPOSITORY_MISMATCH']));
  });
  it('rejects malformed evidence and short SHAs without echoing raw input', () => {
    expect(checkPreviewRevisions({ secret: 'private' }, '1234567', now).reasons).toEqual(['EXPECTED_SHA_INVALID', 'EVIDENCE_INVALID']);
  });
  it('rejects the same deployment for both roles', () => {
    const data = fixture(); data.api.id = data.web.id;
    expect(checkPreviewRevisions(data, sha, now).reasons).toContain('DEPLOYMENTS_NOT_DISTINCT');
  });
  it('does not treat omitted gitDirty metadata as verified source attestation', () => {
    const data = fixture(); Reflect.deleteProperty(data.web, 'gitDirty');
    expect(checkPreviewRevisions(data, sha, now)).toMatchObject({ status: 'PASS', scope: 'DECLARED_DEPLOYMENT_METADATA_ONLY' });
  });
});

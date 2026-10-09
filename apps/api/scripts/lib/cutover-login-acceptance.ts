import { z } from 'zod'
import { parseFcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/)
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const timestamp = z.string().datetime()
const origin = z.string().url().refine(value => {
  const url = new URL(value)
  return url.origin === value && !url.username && !url.password && (url.protocol === 'https:'
    || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
})
const identity = z.object({ email: z.string().email(), subject: z.string().uuid(), userId: id, orgId: id,
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']) }).strict()
const expectedSchema = z.object({ version: z.literal(1), releaseSha: z.string().regex(/^[a-f0-9]{40}$/),
  apiDeployment: id, webDeployment: id, webOrigin: origin, startsAt: timestamp, expiresAt: timestamp,
  users: z.array(identity).length(2),
}).strict()
const session = z.object({ phase: z.enum(['SESSION', 'RELOAD', 'RENEWAL']), at: timestamp,
  identity, httpStatus: z.literal(200), accessIssuedAt: timestamp, evidenceHash: digest }).strict()
const journey = z.object({ email: z.string().email(), provider: z.literal('SUPABASE_GOOGLE'),
  callbackOrigin: origin, callbackPath: z.literal('/auth/callback'), codeExchangeStatus: z.literal(200),
  codeExchangeAt: timestamp, codeExchangeEvidenceHash: digest,
  sessions: z.array(session).length(3),
  crossTenantReadStatus: z.literal(403), crossTenantEvidenceHash: digest,
  logoutStatus: z.literal(401), logoutAt: timestamp, logoutEvidenceHash: digest,
  viewerWriteStatus: z.literal(403).optional(), viewerWriteEvidenceHash: digest.optional(),
}).strict()
const evidenceSchema = z.object({ version: z.literal(1), kind: z.enum(['SIMULATED', 'OBSERVED']),
  releaseSha: z.string(), apiDeployment: id, webDeployment: id, webOrigin: origin,
  apiReleaseSha: z.string(), webReleaseSha: z.string(),
  journeys: z.array(journey).length(2),
  excludedAccountStatus: z.literal(403), excludedAccountEvidenceHash: digest,
  accountSwitch: z.object({ fromSubject: z.string().uuid(), toSubject: z.string().uuid(),
    resultingUserId: id, previousAccountDataAbsent: z.literal(true), at: timestamp, evidenceHash: digest }).strict(),
}).strict()

/** Validates completeness/consistency of redacted observations against a
 * separately supplied release expectation. Does not log in, call a provider,
 * authenticate evidence authors or grant permission to deploy. OBSERVED is
 * supplied provenance, never independent verification by this pure evaluator. */
export function evaluateCutoverLoginAcceptance(raw: unknown, expectedRaw?: unknown, now = Date.now()) {
  const parsed = evidenceSchema.safeParse(raw), expected = expectedSchema.safeParse(expectedRaw)
  const fail = (issues: string[]) => ({ status: 'INCOMPLETE' as const, issues, independentlyVerified: false as const })
  if (!parsed.success || !expected.success) return fail(['INVALID_EVIDENCE'])
  const e = parsed.data, x = expected.data, issues: string[] = []
  const start = Date.parse(x.startsAt), end = Date.parse(x.expiresAt)
  if (!Number.isFinite(now) || start > now || now >= end || end <= start) issues.push('EVIDENCE_WINDOW_CLOSED')
  const inWindow = (at: string) => Date.parse(at) >= start && Date.parse(at) <= now && Date.parse(at) < end
  try { parseFcmAccessScope(JSON.stringify({ version: 1, users: x.users.map(u => ({ email: u.email, subject: u.subject })) })) }
  catch { issues.push('EXPECTED_SCOPE_INVALID') }
  const owner = x.users.find(u => u.email === 'sales@heymarksman.com')
  const viewer = x.users.find(u => u.email === 'jgonzalez@xbfreight.com')
  if (!owner || !viewer || viewer.role !== 'VIEWER' || owner.orgId !== viewer.orgId || owner.userId === viewer.userId)
    issues.push('EXPECTED_MEMBERSHIP_INVALID')
  if (e.releaseSha !== x.releaseSha || e.apiReleaseSha !== x.releaseSha || e.webReleaseSha !== x.releaseSha
    || e.apiDeployment !== x.apiDeployment || e.webDeployment !== x.webDeployment || e.webOrigin !== x.webOrigin)
    issues.push('RELEASE_PAIR_MISMATCH')
  if (new Set(e.journeys.map(j => j.email)).size !== 2) issues.push('DUPLICATE_ACCOUNT')
  for (const j of e.journeys) {
    const user = x.users.find(u => u.email === j.email)
    if (!user) { issues.push('UNEXPECTED_ACCOUNT'); continue }
    if (j.callbackOrigin !== x.webOrigin) issues.push('CALLBACK_ORIGIN_MISMATCH')
    if (!inWindow(j.codeExchangeAt) || !inWindow(j.logoutAt)) issues.push('JOURNEY_OUTSIDE_WINDOW')
    const phases = ['SESSION', 'RELOAD', 'RENEWAL']
    let previous = Date.parse(j.codeExchangeAt)
    for (const [index, s] of j.sessions.entries()) {
      if (s.phase !== phases[index]) issues.push('SESSION_SEQUENCE_INVALID')
      if (Object.keys(user).some(key => s.identity[key as keyof typeof user] !== user[key as keyof typeof user]))
        issues.push('SESSION_IDENTITY_CHANGED')
      if (!inWindow(s.at) || !inWindow(s.accessIssuedAt) || Date.parse(s.at) < previous || Date.parse(s.accessIssuedAt) > Date.parse(s.at))
        issues.push('SESSION_TIME_INVALID')
      previous = Date.parse(s.at)
    }
    if (Date.parse(j.sessions[2].accessIssuedAt) <= Date.parse(j.sessions[1].accessIssuedAt)
      || Date.parse(j.sessions[2].accessIssuedAt) <= Date.parse(j.sessions[0].accessIssuedAt)) issues.push('RENEWAL_NOT_DEMONSTRATED')
    if (Date.parse(j.logoutAt) < previous) issues.push('LOGOUT_SEQUENCE_INVALID')
    if (user.role === 'VIEWER' && (j.viewerWriteStatus !== 403 || !j.viewerWriteEvidenceHash)) issues.push('VIEWER_WRITE_DENIAL_MISSING')
  }
  const sw = e.accountSwitch
  const from = x.users.find(u => u.subject === sw.fromSubject), to = x.users.find(u => u.subject === sw.toSubject)
  if (!from || !to || from.subject === to.subject || sw.resultingUserId !== to.userId || !inWindow(sw.at))
    issues.push('ACCOUNT_SWITCH_INVALID')
  if (issues.length) return fail([...new Set(issues)].sort())
  return { status: e.kind === 'SIMULATED' ? 'SIMULATION_COMPLETE' as const : 'OBSERVATIONS_COMPLETE' as const,
    issues: [], independentlyVerified: false as const }
}

import { expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { evaluateCutoverLoginAcceptance } from '../scripts/lib/cutover-login-acceptance.js'

it('rejects a READY deployment report as login acceptance', () => {
  expect(evaluateCutoverLoginAcceptance({ status: 'READY' })).toEqual({ status: 'INCOMPLETE', issues: ['INVALID_EVIDENCE'], independentlyVerified: false })
})

const now = Date.parse('2026-10-08T12:20:00Z')
function fixture() {
  const users = [
    { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001', userId: 'owner', orgId: 'original-org', role: 'ADMIN' },
    { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002', userId: 'viewer', orgId: 'original-org', role: 'VIEWER' },
  ]
  const expected = { version: 1, releaseSha: 'a'.repeat(40), apiDeployment: 'api-a', webDeployment: 'web-a',
    webOrigin: 'https://fcm.example.invalid', startsAt: '2026-10-08T12:00:00.000Z', expiresAt: '2026-10-08T12:30:00.000Z', users }
  const hash = 'b'.repeat(64)
  const evidence = { version: 1, kind: 'SIMULATED', releaseSha: expected.releaseSha, apiDeployment: expected.apiDeployment,
    webDeployment: expected.webDeployment, webOrigin: expected.webOrigin, apiReleaseSha: expected.releaseSha, webReleaseSha: expected.releaseSha,
    journeys: users.map(u => ({ email: u.email, provider: 'SUPABASE_GOOGLE', callbackOrigin: expected.webOrigin,
      callbackPath: '/auth/callback', codeExchangeStatus: 200, codeExchangeAt: '2026-10-08T12:01:00.000Z', codeExchangeEvidenceHash: hash,
      sessions: ['SESSION', 'RELOAD', 'RENEWAL'].map((phase, i) => ({ phase, at: `2026-10-08T12:0${i + 2}:00.000Z`,
        identity: { ...u }, httpStatus: 200, accessIssuedAt: i === 2 ? '2026-10-08T12:04:00.000Z' : '2026-10-08T12:01:00.000Z', evidenceHash: hash })),
      crossTenantReadStatus: 403, crossTenantEvidenceHash: hash, logoutStatus: 401,
      logoutAt: '2026-10-08T12:05:00.000Z', logoutEvidenceHash: hash,
      viewerWriteStatus: 403 as number | undefined, viewerWriteEvidenceHash: hash as string | undefined })),
    excludedAccountStatus: 403, excludedAccountEvidenceHash: hash,
    accountSwitch: { fromSubject: users[0].subject, toSubject: users[1].subject, resultingUserId: 'viewer',
      previousAccountDataAbsent: true, at: '2026-10-08T12:10:00.000Z', evidenceHash: hash },
  }
  return { expected, evidence }
}

it('reports synthetic journeys as simulation, never independent OAuth verification', () => {
  const f = fixture()
  expect(evaluateCutoverLoginAcceptance(f.evidence, f.expected, now)).toEqual({ status: 'SIMULATION_COMPLETE', issues: [], independentlyVerified: false })
  f.evidence.kind = 'OBSERVED'
  expect(evaluateCutoverLoginAcceptance(f.evidence, f.expected, now)).toEqual({ status: 'OBSERVATIONS_COMPLETE', issues: [], independentlyVerified: false })
})

it.each(['refresh', 'missing-reload', 'role', 'tenant', 'subject', 'user-id', 'duplicate', 'viewer-write',
  'callback', 'release', 'deployment', 'future', 'expired', 'switch', 'logout', 'excluded', 'scope', 'secrets'])('rejects %s evidence', kind => {
  const f = fixture(), e = f.evidence, x = f.expected
  if (kind === 'refresh') e.journeys[0].sessions[2].accessIssuedAt = e.journeys[0].sessions[1].accessIssuedAt
  if (kind === 'missing-reload') e.journeys[0].sessions.splice(1, 1)
  if (kind === 'role') e.journeys[1].sessions[2].identity.role = 'ADMIN'
  if (kind === 'tenant') e.journeys[1].sessions[1].identity.orgId = 'other-org'
  if (kind === 'subject') e.journeys[1].sessions[1].identity.subject = x.users[0].subject
  if (kind === 'user-id') e.journeys[0].sessions[1].identity.userId = 'new-owner'
  if (kind === 'duplicate') e.journeys[1] = structuredClone(e.journeys[0])
  if (kind === 'viewer-write') e.journeys[1].viewerWriteStatus = undefined
  if (kind === 'callback') e.journeys[0].callbackOrigin = 'https://other.example.invalid'
  if (kind === 'release') e.apiReleaseSha = 'c'.repeat(40)
  if (kind === 'deployment') e.apiDeployment = 'api-other'
  if (kind === 'future') e.journeys[0].sessions[1].at = '2026-10-08T12:21:00.000Z'
  if (kind === 'expired') x.expiresAt = '2026-10-08T12:20:00.000Z'
  if (kind === 'switch') e.accountSwitch.resultingUserId = 'owner'
  if (kind === 'logout') e.journeys[0].logoutStatus = 200
  if (kind === 'excluded') e.excludedAccountStatus = 200
  if (kind === 'scope') x.users[1].email = 'historical@example.invalid'
  if (kind === 'secrets') Object.assign(e, { accessToken: 'must-not-be-accepted-or-echoed' })
  const result = evaluateCutoverLoginAcceptance(e, x, now)
  expect(result.status).toBe('INCOMPLETE')
  expect(result.issues.length).toBeGreaterThan(0)
  expect(JSON.stringify(result)).not.toContain('must-not-be-accepted-or-echoed')
})

it.each(['OBSERVED', 'SIMULATED', 'INVALID'])('runs the offline CLI for %s without exposing supplied evidence', kind => {
  const f = fixture(), directory = mkdtempSync(resolve(process.platform === 'win32' ? 'D:/andre/validation' : tmpdir(), 'fcm-login-cli-'))
  f.evidence.kind = kind
  if (kind === 'INVALID') Object.assign(f.evidence, { accessToken: 'synthetic-secret-must-not-echo' })
  // Move the synthetic fixed chronology into the current CLI evaluation window.
  const shift = Date.now() - now
  const body = (value: unknown) => JSON.stringify(value, (_key, item) =>
    typeof item === 'string' && /^2026-10-08T12:/.test(item) ? new Date(Date.parse(item) + shift).toISOString() : item)
  const expectedPath = resolve(directory, 'expected.json'), evidencePath = resolve(directory, 'evidence.json')
  writeFileSync(expectedPath, body(f.expected), { flag: 'wx' })
  writeFileSync(evidencePath, body(f.evidence), { flag: 'wx' })
  const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/check-cutover-login-evidence.ts'), expectedPath, evidencePath],
    { encoding: 'utf8', windowsHide: true, timeout: 15000 })
  expect(result.error).toBeUndefined()
  expect(result.status).toBe(kind === 'OBSERVED' ? 0 : 1)
  expect(JSON.parse(result.stdout).status).toBe(kind === 'OBSERVED' ? 'OBSERVATIONS_COMPLETE' : kind === 'SIMULATED' ? 'SIMULATION_COMPLETE' : 'INCOMPLETE')
  expect(result.stdout + result.stderr).not.toContain('synthetic-secret-must-not-echo')
  expect(result.stdout).not.toContain('sales@')
}, 20000)

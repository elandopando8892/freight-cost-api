import type { CutoverAuthMatch, CutoverUserInventory } from './production-cutover-plan.js'
import { parseFcmAccessScope, type FcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'
import { createHash } from 'node:crypto'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const stableRows = <T>(rows: T[]) => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

/** Review-only partition: all historical rows remain bound to the snapshot.
 * This is NOT an executable replacement for the legacy all-row SQL guard. */
export function buildScopedAccessPlan(input: { users: CutoverUserInventory[]; scope: FcmAccessScope; authMatches: CutoverAuthMatch[] }) {
  const scope = parseFcmAccessScope(JSON.stringify(input.scope))
  const users = input.users.map(u => ({ id: u.id, emailHash: u.emailHash, orgId: u.orgId,
    role: u.role, identityFingerprint: u.identityFingerprint }))
  const issues: string[] = []
  const hashes = new Set<string>(), ids = new Set<string>()
  for (const user of users) {
    if (!user.id?.trim() || !user.orgId?.trim() || !user.role?.trim() ||
        !/^[a-f0-9]{64}$/.test(user.emailHash) || !/^[a-f0-9]{64}$/.test(user.identityFingerprint))
      issues.push('USER_INCOMPLETE_INVENTORY')
    if (hashes.has(user.emailHash) || ids.has(user.id)) issues.push('USER_DUPLICATE_INVENTORY')
    hashes.add(user.emailHash); ids.add(user.id)
  }
  const proposedExistingMappings: (CutoverUserInventory & { supabaseId: string })[] = []
  const membershipRequired: { emailHash: string; supabaseId: string }[] = []
  const activeHashes = new Set(scope.users.map(u => sha(u.email)))
  for (const binding of scope.users) {
    const emailHash = sha(binding.email)
    const matches = input.authMatches.filter(m => m.emailHash === emailHash)
    if (matches.length !== 1 || matches[0].verified !== true || matches[0].supabaseId !== binding.subject) {
      issues.push('APPROVED_IDENTITY_NOT_UNIQUELY_VERIFIED')
      continue
    }
    const row = users.find(u => u.emailHash === emailHash)
    if (row) proposedExistingMappings.push({ ...row, supabaseId: binding.subject })
    else membershipRequired.push({ emailHash, supabaseId: binding.subject })
  }
  const historicalUsers = users.filter(u => !activeHashes.has(u.emailHash))
  const reviewReady = issues.length === 0
  return { schemaVersion: 'fcm.scoped-access-plan.v1', reviewReady,
    proposedExistingMappings: reviewReady ? proposedExistingMappings : [],
    membershipRequired: reviewReady ? membershipRequired : [], historicalUsers,
    issues: [...new Set(issues)], inventoryFingerprint: sha(JSON.stringify({ version: 1,
      scope: stableRows(scope.users), users: stableRows(users), authMatches: stableRows(input.authMatches),
    })), historicalFinalizationBlocked: historicalUsers.length > 0, writesAuthorized: false as const }
}

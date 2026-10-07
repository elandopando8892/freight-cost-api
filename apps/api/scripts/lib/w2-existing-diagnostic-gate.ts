export const W2_EXISTING_START = '2026-10-05T06:34:50.000Z'
export const W2_EXISTING_DEADLINE = '2026-10-05T06:54:50.000Z'
export const W2_EXISTING_PREVIOUS_MARKER = 'FCM_W2_REVIEW_20261004:2026-10-05T06:56:18.000Z'
export const W2_EXISTING_MARKER = `FCM_W2_EXISTING_DIAGNOSTIC:${W2_EXISTING_DEADLINE}`
export const W2_EXISTING_AUTHORITY = `human-autorizo:${W2_EXISTING_START}:same-qa:one-rollback:${W2_EXISTING_DEADLINE}`
export function assertExistingDiagnosticOpen(authority: string | undefined, now = Date.now()) {
  if (authority !== W2_EXISTING_AUTHORITY) throw new Error('Scoped human authority reference required')
  if (!Number.isFinite(now) || now < Date.parse(W2_EXISTING_START) || now >= Date.parse(W2_EXISTING_DEADLINE))
    throw new Error('W2 gate outside authorized window')
}
export function assertExistingDiagnosticRole(role: { marker: string; login: boolean; sessions: number } | undefined) {
  // New marker is a durable consumed reservation. Never resume/retry this gate.
  if (!role || role.marker !== W2_EXISTING_PREVIOUS_MARKER || role.login || role.sessions !== 0)
    throw new Error('Existing diagnostic role ownership/state differs')
}

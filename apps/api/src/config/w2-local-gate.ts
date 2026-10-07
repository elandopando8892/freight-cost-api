/** Temporary W2 launcher policy, never enabled by the normal API server. */
export const W2_GATE_ROLE = 'fcm_w2_local_20261004'
// Human-authorized persistence QA amendment: 45 minutes from 00:11:18 Mexico, Oct 5.
// Previous windows expired; their evidence/consumption is preserved.
// This is not a rolling deadline and a restart does not renew it.
export const W2_GATE_DEADLINE = '2026-10-05T06:56:18.000Z'
export const W2_GATE_MARKER = `FCM_W2_REVIEW_20261004:${W2_GATE_DEADLINE}`
export function assertW2GateOpen(now = Date.now()) {
  if (!Number.isFinite(now) || now < Date.parse('2026-10-05T06:11:18.000Z') || now >= Date.parse(W2_GATE_DEADLINE))
    throw new Error('W2 gate outside authorized window')
}
export const W2_GATE_TABLES = ['User', 'Organization', 'CostBase', 'AssumptionSet', 'AssumptionParam', 'CostBaseAuditEvent'] as const
export const W2_GATE_EVENT_COLUMNS = ['id', 'orgId', 'costBaseId', 'action', 'actorId', 'note', 'payload', 'createdAt'] as const
export function w2GatePath(baseId: string, versionId: string) {
  if (![baseId, versionId].every(id => /^[a-zA-Z0-9_-]+$/.test(id))) throw new Error('Invalid gate IDs')
  return `/cost-bases/${baseId}/versions/${versionId}/wizard`
}
export function w2GateRequestAllowed(method: string, rawUrl: string, baseId: string, versionId: string) {
  const path = rawUrl.split('?', 1)[0]
  return (method === 'GET' && ['/health', '/ready', '/auth/me'].includes(path))
    || (['GET', 'PUT'].includes(method) && path === w2GatePath(baseId, versionId))
}
export function w2GateRoleSql(password: string, expiresAt: string) {
  if (!/^[a-f0-9]{64}$/.test(password) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiresAt)) throw new Error('Invalid role inputs')
  return [
    `CREATE ROLE ${W2_GATE_ROLE} LOGIN PASSWORD '${password}' VALID UNTIL '${expiresAt}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION CONNECTION LIMIT 2`,
    `GRANT CONNECT ON DATABASE neondb TO ${W2_GATE_ROLE}`,
    `GRANT USAGE ON SCHEMA public TO ${W2_GATE_ROLE}`,
    `GRANT SELECT ON TABLE ${W2_GATE_TABLES.map(t => `public."${t}"`).join(', ')} TO ${W2_GATE_ROLE}`,
    `GRANT UPDATE ("id") ON TABLE public."Organization", public."AssumptionSet" TO ${W2_GATE_ROLE}`,
    `GRANT INSERT (${W2_GATE_EVENT_COLUMNS.map(c => `"${c}"`).join(', ')}) ON TABLE public."CostBaseAuditEvent" TO ${W2_GATE_ROLE}`,
    `ALTER ROLE ${W2_GATE_ROLE} SET statement_timeout = '10000ms'`,
    `ALTER ROLE ${W2_GATE_ROLE} SET idle_in_transaction_session_timeout = '10000ms'`,
    `COMMENT ON ROLE ${W2_GATE_ROLE} IS '${W2_GATE_MARKER}'`,
  ]
}

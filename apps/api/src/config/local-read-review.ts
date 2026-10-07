/** Scoped, temporary runtime policy. Never enabled by the standard server. */
export const LOCAL_READ_ROLE = 'fcm_local_read_20260930'
export const LOCAL_READ_HOST = 'ep-autumn-thunder-av6e9bsh.c-11.us-east-1.aws.neon.tech'
export const LOCAL_READ_EXPIRES = '2026-10-02T03:16:49.930Z'
export const LOCAL_READ_TABLES = [
  'User', 'Organization', 'CostBase', 'AssumptionSet', 'AssumptionParam',
  'AssumptionVersionAudit', 'CostBaseAuditEvent', 'ScenarioReview',
  'Quote', 'Lane', 'ProductionRoute', 'CarrierProfile', 'RateBook',
  'RegionDiesel', 'FscIndex', 'UsaFuel', 'DieselHistory',
] as const

const paths = new Set([
  '/health', '/ready', '/auth/me', '/org', '/cost-bases',
  '/cost-bases/operational-segments', '/cost-bases/presets',
  '/market/fuel', '/quotes', '/onboarding/carrier',
])

export function localReadRequestAllowed(method: string, rawUrl: string, googleReview = false) {
  // Compare the exact pathname. No wildcard/proxy/encoded alias authorization.
  const path = rawUrl.split('?', 1)[0]
  return (method === 'GET' && paths.has(path)) || (googleReview && (
    (method === 'GET' && path === '/routing/google-basic/config') ||
    (method === 'POST' && ['/routing/google-basic/map-reservation', '/routing/google-basic/candidate'].includes(path))
  ))
}

export function assertLocalReadEnvironment(environment: NodeJS.ProcessEnv, googleReview = false) {
  if (environment.NODE_ENV !== 'development' || environment.VERCEL_ENV !== 'preview' ||
      environment.FCM_PREVIEW_EXISTING_USERS_ONLY !== 'true' ||
      environment.SUPABASE_EXPECTED_PROJECT_REF !== 'alqjqzqagdmcywpjtnnr' ||
      environment.SUPABASE_URL !== 'https://alqjqzqagdmcywpjtnnr.supabase.co' ||
      environment.OPENAI_API_KEY || environment.RATEWARE_API_URL || environment.CRON_SECRET ||
      (googleReview ? environment.FCM_GOOGLE_ROUTE_REVIEW_ENABLED !== 'true' ||
        !/^AIza[A-Za-z0-9_-]{35}$/.test(environment.GOOGLE_ROUTES_API_KEY ?? '')
        : environment.GOOGLE_ROUTES_API_KEY || environment.FCM_GOOGLE_ROUTE_REVIEW_ENABLED === 'true')) {
    throw new Error('Local read-only runtime configuration rejected')
  }
  const url = new URL(environment.STAGING_DATABASE_URL ?? '')
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname !== LOCAL_READ_HOST || url.pathname !== '/neondb' ||
      url.username !== LOCAL_READ_ROLE || !url.password) {
    throw new Error('Local read-only database target rejected')
  }
}

export function localReadPasswordResetSql(password: string) {
  if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('Invalid scoped role password')
  // Deliberately no VALID UNTIL, grants, ownership, membership or other roles.
  return `ALTER ROLE ${LOCAL_READ_ROLE} PASSWORD '${password}'`
}

export function localReadRoleSql(password: string, expiresAt: string) {
  if (!/^[a-f0-9]{64}$/.test(password) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiresAt)) {
    throw new Error('Invalid scoped role credential arguments')
  }
  return [
    `CREATE ROLE ${LOCAL_READ_ROLE} LOGIN PASSWORD '${password}' VALID UNTIL '${expiresAt}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION CONNECTION LIMIT 4`,
    `GRANT CONNECT ON DATABASE neondb TO ${LOCAL_READ_ROLE}`,
    `GRANT USAGE ON SCHEMA public TO ${LOCAL_READ_ROLE}`,
    `GRANT SELECT ON TABLE ${LOCAL_READ_TABLES.map(table => `public."${table}"`).join(', ')} TO ${LOCAL_READ_ROLE}`,
    `ALTER ROLE ${LOCAL_READ_ROLE} SET default_transaction_read_only = on`,
    `ALTER ROLE ${LOCAL_READ_ROLE} SET statement_timeout = '10000ms'`,
  ]
}

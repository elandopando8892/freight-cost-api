import { describe, expect, it } from 'vitest'
import { assertLocalReadEnvironment, LOCAL_READ_HOST, LOCAL_READ_ROLE, LOCAL_READ_TABLES, localReadRequestAllowed, localReadRoleSql, localReadPasswordResetSql } from '../src/config/local-read-review.js'

const safeEnvironment = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'development', VERCEL_ENV: 'preview', FCM_PREVIEW_EXISTING_USERS_ONLY: 'true',
  SUPABASE_EXPECTED_PROJECT_REF: 'alqjqzqagdmcywpjtnnr',
  SUPABASE_URL: 'https://alqjqzqagdmcywpjtnnr.supabase.co',
  STAGING_DATABASE_URL: `postgresql://${LOCAL_READ_ROLE}:synthetic@${LOCAL_READ_HOST}/neondb`,
})

describe('scoped local read review', () => {
  it.each(['/health', '/ready', '/org', '/auth/me', '/cost-bases', '/market/fuel', '/quotes?limit=5', '/onboarding/carrier', '/cost-bases/operational-segments', '/cost-bases/presets'])('allows only reviewed GET %s', path => {
    expect(localReadRequestAllowed('GET', path)).toBe(true)
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])('rejects %s even on a read path', method => {
    expect(localReadRequestAllowed(method, '/quotes')).toBe(false)
  })
  it.each(['/cron/fuel', '/assistant', '/routing/google-basic/candidate', '/routing/google-basic/config', '/quotes/id', '/quotes/', '/%71uotes', '/cost-bases/../quotes', 'https://example.com/quotes'])('rejects unreviewed path %s', path => {
    expect(localReadRequestAllowed('GET', path)).toBe(false)
  })
  it('accepts the exact limited local environment', () => {
    expect(() => assertLocalReadEnvironment(safeEnvironment())).not.toThrow()
  })
  it.each([
    ['NODE_ENV', 'production'], ['VERCEL_ENV', 'production'], ['FCM_PREVIEW_EXISTING_USERS_ONLY', 'false'],
    ['SUPABASE_EXPECTED_PROJECT_REF', 'other'], ['SUPABASE_URL', 'https://other.supabase.co'],
    ['OPENAI_API_KEY', 'synthetic'], ['RATEWARE_API_URL', 'https://example.com'],
    ['CRON_SECRET', 'synthetic'], ['GOOGLE_ROUTES_API_KEY', 'synthetic'], ['FCM_GOOGLE_ROUTE_REVIEW_ENABLED', 'true'],
    ['STAGING_DATABASE_URL', `postgresql://neondb_owner:synthetic@${LOCAL_READ_HOST}/neondb`],
    ['STAGING_DATABASE_URL', `postgresql://${LOCAL_READ_ROLE}:synthetic@localhost/neondb`],
  ])('fails closed on %s=%s', (key, value) => {
    expect(() => assertLocalReadEnvironment({ ...safeEnvironment(), [key]: value })).toThrow()
  })
  it('builds only scoped grants with no table writes, ownership, membership or future grants', () => {
    const sql = localReadRoleSql('a'.repeat(64), '2026-10-02T00:00:00.000Z').join('\n')
    expect(sql).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION')
    expect(sql).toContain('GRANT SELECT ON TABLE')
    expect(sql).toContain('default_transaction_read_only = on')
    expect(sql).not.toMatch(/GRANT (ALL|UPDATE|INSERT|DELETE|CREATE)|ALL TABLES|DEFAULT PRIVILEGES|BYPASSRLS\s*(;|$)/)
    expect(LOCAL_READ_TABLES).not.toContain('_prisma_migrations')
    expect(LOCAL_READ_TABLES).not.toContain('TireCohortV2ResearchSnapshot')
  })
  it('rejects SQL interpolation outside fixed credential formats', () => {
    expect(() => localReadRoleSql("'; DROP ROLE x;--", '2026-10-02T00:00:00.000Z')).toThrow()
    expect(() => localReadRoleSql('a'.repeat(64), "';--")).toThrow()
  })
  it('resets only the scoped password, never expiry or grants', () => {
    expect(localReadPasswordResetSql('a'.repeat(64))).toBe(`ALTER ROLE ${LOCAL_READ_ROLE} PASSWORD '${'a'.repeat(64)}'`)
    expect(() => localReadPasswordResetSql("';--")).toThrow()
  })
  it('explicit Google scope permits only the two effect endpoints and config', () => {
    expect(localReadRequestAllowed('GET','/routing/google-basic/config',true)).toBe(true)
    expect(localReadRequestAllowed('POST','/routing/google-basic/map-reservation',true)).toBe(true)
    expect(localReadRequestAllowed('POST','/routing/google-basic/candidate',true)).toBe(true)
    for (const path of ['/quotes','/org','/cron/fuel','/routing/google-basic/candidate/','/%72outing/google-basic/candidate']) {
      expect(localReadRequestAllowed('POST',path,true)).toBe(false)
    }
    expect(localReadRequestAllowed('PUT','/routing/google-basic/candidate',true)).toBe(false)
  })
  it('requires explicit development, separate provider flag and valid server key even with opt-in', () => {
    const environment = {...safeEnvironment(),GOOGLE_ROUTES_API_KEY:`AIza${'x'.repeat(35)}`,FCM_GOOGLE_ROUTE_REVIEW_ENABLED:'true'}
    expect(()=>assertLocalReadEnvironment(environment,true)).not.toThrow()
    expect(()=>assertLocalReadEnvironment(environment)).toThrow()
    for (const change of [{NODE_ENV:'production'},{FCM_GOOGLE_ROUTE_REVIEW_ENABLED:'false'},{GOOGLE_ROUTES_API_KEY:''},{GOOGLE_ROUTES_API_KEY:'synthetic'},{OPENAI_API_KEY:'synthetic'}]) {
      expect(()=>assertLocalReadEnvironment({...environment,...change},true)).toThrow()
    }
  })
})

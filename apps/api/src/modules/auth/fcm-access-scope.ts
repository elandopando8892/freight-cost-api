export type FcmAccessBinding = { email: string; subject: string }
export type FcmAccessScope = { version: 1; users: FcmAccessBinding[] }
type FcmAccessErrorCode = 'FCM_ACCESS_SCOPE_INVALID' | 'FCM_ACCESS_SCOPE_REQUIRED' | 'FCM_ACCESS_NOT_AUTHORIZED'
  | 'FCM_SCOPED_IDENTITY_LINK_MISMATCH' | 'FCM_SCOPED_MEMBERSHIP_REQUIRED'
export class FcmAccessPolicyError extends Error {
  readonly httpStatus: 403 | 503
  constructor(code: FcmAccessErrorCode) {
    super(code)
    this.name = 'FcmAccessPolicyError'
    this.httpStatus = code === 'FCM_ACCESS_SCOPE_INVALID' || code === 'FCM_ACCESS_SCOPE_REQUIRED' ? 503 : 403
  }
}
const approvedEmails = new Set(['sales@heymarksman.com', 'jgonzalez@xbfreight.com'])
const canonicalEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''
const exactKeys = (value: unknown, keys: string[]) => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))

/** App-local pilot policy, not Supabase shared metadata or a role assignment. */
export function parseFcmAccessScope(raw: string): FcmAccessScope {
  try {
    if (typeof raw !== 'string' || !raw || raw.length > 4096) throw new Error()
    const value = JSON.parse(raw)
    if (!exactKeys(value, ['version', 'users']) || value.version !== 1 || !Array.isArray(value.users)
        || value.users.length !== 2) throw new Error()
    const users = value.users.map((user: unknown) => {
      if (!exactKeys(user, ['email', 'subject'])) throw new Error()
      const { email, subject } = user as FcmAccessBinding
      if (!approvedEmails.has(canonicalEmail(email)) || typeof subject !== 'string'
          || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(subject)) throw new Error()
      return { email: canonicalEmail(email), subject: subject.toLowerCase() }
    }) as FcmAccessBinding[]
    if (new Set(users.map(u => u.email)).size !== 2 || new Set(users.map(u => u.subject)).size !== 2) throw new Error()
    return { version: 1, users }
  } catch { throw new FcmAccessPolicyError('FCM_ACCESS_SCOPE_INVALID') }
}

export function assertFcmAccess(claims: { sub?: unknown; email?: unknown }, env: Record<string, string | undefined>): FcmAccessBinding | null {
  if (env.FCM_AUTH_SCOPE_REQUIRED !== undefined && !['true', 'false'].includes(env.FCM_AUTH_SCOPE_REQUIRED))
    throw new FcmAccessPolicyError('FCM_ACCESS_SCOPE_INVALID')
  const raw = env.FCM_AUTH_ACCESS_SCOPE
  if (raw === undefined) {
    if (env.VERCEL_ENV === 'production' || env.FCM_AUTH_SCOPE_REQUIRED === 'true')
      throw new FcmAccessPolicyError('FCM_ACCESS_SCOPE_REQUIRED')
    return null
  }
  const binding = parseFcmAccessScope(raw).users.find(u => u.subject === claims.sub && u.email === canonicalEmail(claims.email))
  if (!binding) throw new FcmAccessPolicyError('FCM_ACCESS_NOT_AUTHORIZED')
  return binding
}

export function assertFcmUserLink(binding: FcmAccessBinding | null, row: { supabaseId?: string; email?: string }): void {
  if (binding && (row.supabaseId !== binding.subject || canonicalEmail(row.email) !== binding.email))
    throw new FcmAccessPolicyError('FCM_SCOPED_IDENTITY_LINK_MISMATCH')
}

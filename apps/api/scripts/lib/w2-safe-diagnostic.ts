import { Prisma } from '@prisma/client'

/** Deliberately excludes messages, stacks, SQL, credentials and arbitrary metadata. */
export const W2_PREPARATION_PHASES = ['input', 'transaction', 'source-check', 'clone', 'binding', 'role', 'commit', 'rollback', 'verified-target', 'read-only-child', 'connect', 'read-only-transaction', 'wizard-read', 'wizard-save'] as const
const guardReasons: Readonly<Record<string,string>> = Object.freeze({
  'W2 gate outside authorized window': 'WINDOW_CLOSED',
  'Scoped human authority reference required': 'AUTHORITY_MISSING',
  'Scoped human approval reference missing': 'AUTHORITY_MISSING',
  'Diagnostic-only authority': 'DIAGNOSTIC_ONLY',
  'W2 preview target required': 'TARGET_MISMATCH',
  'Role expiry outside scope': 'ROLE_EXPIRY',
  'W2 source inventory changed': 'SOURCE_CHANGED',
  'W2 source canonical inventory changed': 'CANONICAL_INVENTORY',
  'W2 base inventory changed': 'BASE_INVENTORY',
  'W2 linked admin required': 'LINKED_ADMIN',
  'W2 catalog changed': 'CATALOG_CHANGED',
  'Invalid role inputs': 'ROLE_INPUTS',
  'W2 clone economic mismatch': 'CLONE_MISMATCH',
  'Inventory changed': 'INVENTORY_CHANGED',
  'Source changed since authorized preflight': 'SOURCE_CHANGED',
  'CLI required': 'CLI_MISSING',
  'Ambiguous staging configuration': 'TARGET_AMBIGUOUS',
  'Unsafe scope': 'TARGET_SCOPE',
  'Project changed': 'TARGET_CHANGED',
  'Target changed': 'TARGET_CHANGED',
  'Role attributes differ':'ROLE_ATTRIBUTES_DIFFER',
  'Effective table/column privileges differ':'EFFECTIVE_PRIVILEGES_DIFFER',
  'Additional write capability':'ADDITIONAL_WRITE_CAPABILITY',
  'Direct endpoint required': 'TARGET_CHANGED',
  'STORED_CONTEXT_OR_REFERENCE_MISMATCH':'STORED_CONTEXT_OR_REFERENCE_MISMATCH',
  'STORED_NATIVE_VALUE_MISMATCH':'STORED_NATIVE_VALUE_MISMATCH',
  'STORED_REVISION_INVALID':'STORED_REVISION_INVALID',
  'WIZARD_REVIEW_HISTORY_CONFLICT':'WIZARD_REVIEW_HISTORY_CONFLICT',
})
const reasons=new Set(Object.values(guardReasons))
const sqlStates=new Set(['42501','42601','42703','42P01','23503','23505','55P03','57014','25P02'])
const transactionReasons=new Set(['ACQUISITION_TIMEOUT','ALREADY_STARTED','NOT_FOUND','COMMITTED','ROLLED_BACK','EXPIRED'])
/** Prisma 5.22 engine strings, pinned to 605197351a3c8bdd595af2d2a9bc3025bca48ea2.
 * Classify only known metadata. Never return the original error/message or SQL. */
function transactionDiagnostic(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code!=='P2028' || typeof error.meta?.error!=='string') return {}
  const detail=error.meta.error
  const exact: Record<string,string>={
    'Unable to start a transaction in the given time.':'ACQUISITION_TIMEOUT',
    'Attempted to start a transaction inside of a transaction.':'ALREADY_STARTED',
    "Transaction not found. Transaction ID is invalid, refers to an old closed transaction Prisma doesn't have information about anymore, or was obtained before disconnecting.":'NOT_FOUND',
  }
  if (Object.hasOwn(exact,detail)) return {transactionReason:exact[detail]}
  const expired=/^Transaction already closed: A (?:query|batch query|commit) cannot be executed on an expired transaction\. The timeout for this transaction was (\d{1,9}) ms, however (\d{1,9}) ms passed since the start of the transaction\. Consider increasing the interactive transaction timeout or doing less work in the transaction\.$/.exec(detail)
  if(expired) return {transactionReason:'EXPIRED',transactionTimeoutMs:Number(expired[1]),transactionElapsedMs:Number(expired[2])}
  if(/^Transaction already closed: A (?:query|batch query|commit) cannot be executed on a committed transaction\.$/.test(detail)) return {transactionReason:'COMMITTED'}
  if(/^Transaction already closed: A (?:query|batch query|commit) cannot be executed on a transaction that was rolled back\.$/.test(detail)) return {transactionReason:'ROLLED_BACK'}
  return {}
}
export type W2PreparationPhase = typeof W2_PREPARATION_PHASES[number]
export function w2SafeDiagnostic(phase: W2PreparationPhase, error: unknown) {
  const value = error !== null && typeof error === 'object' ? error as { code?: unknown; errorCode?: unknown; message?: unknown } : {}
  const code = typeof value.code === 'string' ? value.code : value.errorCode
  const reason=typeof value.message==='string' && Object.hasOwn(guardReasons,value.message) ? guardReasons[value.message] : undefined
  const sqlState=error instanceof Prisma.PrismaClientKnownRequestError && code==='P2010'
    && typeof error.meta?.code==='string' && sqlStates.has(error.meta.code) ? error.meta.code : undefined
  return { event: 'W2_PREPARATION_STOPPED' as const, phase,
    code: typeof code === 'string' && /^P\d{4}$/.test(code) ? code : 'UNKNOWN',
    ...(error instanceof Prisma.PrismaClientValidationError ? { category:'PRISMA_VALIDATION' as const } : {}),
    ...(reason ? {reason} : {}), ...(sqlState ? {sqlState} : {}), ...transactionDiagnostic(error) }
}
/** Accept only the child's narrow diagnostic schema; never forward raw stderr. */
export function w2ChildDiagnostic(error: unknown) {
  const value = error !== null && typeof error === 'object' ? error as { code?: unknown; stderr?: unknown } : {}
  if (value.code === 'ETIMEDOUT') return { event: 'W2_CHILD_STOPPED', code: 'ETIMEDOUT' }
  if (typeof value.stderr !== 'string' || value.stderr.length > 4096) return undefined
  for (const line of value.stderr.split(/\r?\n/)) {
    try {
      const candidate = JSON.parse(line)
      if (candidate?.event === 'W2_PREPARATION_STOPPED' && W2_PREPARATION_PHASES.includes(candidate.phase)
        && typeof candidate.code === 'string' && /^(P\d{4}|UNKNOWN)$/.test(candidate.code))
        return { event: 'W2_PREPARATION_STOPPED', phase: candidate.phase as W2PreparationPhase, code: candidate.code,
          ...(candidate.category==='PRISMA_VALIDATION' ? {category:'PRISMA_VALIDATION' as const} : {}),
          ...(reasons.has(candidate.reason) ? {reason:candidate.reason as string} : {}),
          ...(candidate.code==='P2010' && sqlStates.has(candidate.sqlState) ? {sqlState:candidate.sqlState as string} : {}),
          ...(candidate.code==='P2028' && transactionReasons.has(candidate.transactionReason) ? {
            transactionReason:candidate.transactionReason as string,
            ...(candidate.transactionReason==='EXPIRED' && [candidate.transactionTimeoutMs,candidate.transactionElapsedMs].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=999999999)
              ? {transactionTimeoutMs:candidate.transactionTimeoutMs as number,transactionElapsedMs:candidate.transactionElapsedMs as number}:{}),
          } : {}) }
    } catch { /* Ignore raw output, including malformed or secret-bearing lines. */ }
  }
  return undefined
}

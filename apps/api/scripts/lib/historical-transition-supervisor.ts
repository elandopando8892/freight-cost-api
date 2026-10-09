import { createHash } from 'node:crypto'
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { z } from 'zod'
import { buildHistoricalMigrationPackage, verifyHistoricalCoexistence } from './historical-migration-package.js'
import type { ProductionCutoverPlanInput, CutoverMigrationRecord } from './production-cutover-plan.js'
import type { FcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'

const hash = z.string().regex(/^[a-f0-9]{64}$/)
const instant = z.string().datetime()
const contractSchema = z.object({
  version: z.literal(1), targetFingerprint: hash, releaseSha: z.string().regex(/^[a-f0-9]{40}$/),
  packageFingerprint: hash, planFingerprint: hash, authorityReference: z.string().regex(/^[a-zA-Z0-9:_-]{1,160}$/),
  startsAt: instant, expiresAt: instant,
}).strict()
export type TransitionContract = z.infer<typeof contractSchema>
type Input = ProductionCutoverPlanInput & { scope: FcmAccessScope }
const bindingSchema = contractSchema.extend({ observedAt: instant, maintenanceUntil: instant }).strict()
type Binding = z.infer<typeof bindingSchema>
const restoreSchema = z.object({ binding: bindingSchema, archiveHash: hash,
  sourceDataHash: hash, restoredDataHash: hash, sourceSchemaHash: hash, restoredSchemaHash: hash,
}).strict()
export type RestoreEvidence = z.infer<typeof restoreSchema>

/** Transport boundary, not an implementation or proof of provider access.
 * The adapter must enforce the deadline, authenticate observations, fence ALL
 * application writers throughout backup/migration, and preserve any failed
 * native migration. It must never retry, resolve or provision Auth identities.
 * No production adapter is registered by this module. */
export interface HistoricalTransitionPort {
  inspect(contract: Readonly<TransitionContract>, signal: AbortSignal): Promise<{ binding: Binding; input: Input; schema: string }>
  backupAndRestore(contract: Readonly<TransitionContract>, signal: AbortSignal): Promise<RestoreEvidence>
  migrateAndInspect(contract: Readonly<TransitionContract>, bundle: ReturnType<typeof buildHistoricalMigrationPackage>, signal: AbortSignal): Promise<{
    binding: Binding; ledger: CutoverMigrationRecord[]; driftSql: string;
    preservedDataHash: string; originalLedgerRowsPreserved: boolean;
  }>
}
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const resultSchema = z.object({ version: z.literal(1), contractHash: hash,
  status: z.literal('SCHEMA_VERIFIED'), archiveHash: hash,
  realLoginValidated: z.literal(false), promotionValidated: z.literal(false),
}).strict()
const eventSchema = z.object({ contractHash: hash, at: instant,
  phase: z.enum(['RESERVED', 'BACKUP_UNCERTAIN', 'BACKUP_VERIFIED', 'MIGRATION_UNCERTAIN', 'SCHEMA_VERIFIED']),
  result: resultSchema.optional(),
}).strict()

/** Durable single-host coordinator. The target, rather than run/release IDs,
 * keys the reservation. Crashes/errors leave it in place; exact completed
 * replay returns evidence without contacting the provider. Its file journal
 * does NOT fence other hosts or database clients; that belongs to the adapter.
 * Hashes and references bind supplied evidence, not human identity/consent. */
export async function superviseHistoricalTransition(options: {
  contract: TransitionContract; directory: string; port: HistoricalTransitionPort; now?: () => number;
}) {
  const contract = Object.freeze(contractSchema.parse(options.contract))
  const contractHash = sha(contract), now = options.now ?? Date.now
  let previous = Date.parse(contract.startsAt)
  const clock = () => {
    const value = now()
    if (!Number.isFinite(value) || value < previous) throw new Error('TRANSITION_CLOCK_INVALID')
    if (value >= Date.parse(contract.expiresAt) || Date.parse(contract.expiresAt) <= Date.parse(contract.startsAt))
      throw new Error('TRANSITION_WINDOW_CLOSED')
    previous = value
    return new Date(value).toISOString()
  }
  clock()
  if (!isAbsolute(options.directory)) throw new Error('TRANSITION_JOURNAL_LOCATION_INVALID')
  const root = realpathSync(options.directory)
  const directory = resolve(root, contract.targetFingerprint), journal = resolve(directory, 'events.jsonl')
  try { mkdirSync(directory, { mode: 0o700 }) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw new Error('TRANSITION_RESERVATION_FAILED')
    // A missing/truncated journal or a crash between mkdir and the first event
    // is an uncertain attempt. Never repair, adopt or resume it automatically.
    try {
      const events = readFileSync(journal, 'utf8').trim().split('\n').map(line => eventSchema.parse(JSON.parse(line)))
      const last = events.at(-1)!, phases = ['RESERVED', 'BACKUP_UNCERTAIN', 'BACKUP_VERIFIED', 'MIGRATION_UNCERTAIN', 'SCHEMA_VERIFIED']
      if (events.length === phases.length && events.every((e, i) => e.contractHash === contractHash && e.phase === phases[i]
        && Date.parse(e.at) >= Date.parse(i ? events[i - 1].at : contract.startsAt) && Date.parse(e.at) <= previous)
        && last.phase === 'SCHEMA_VERIFIED'
        && last.result?.contractHash === contractHash) return { ...last.result, replayed: true }
    } catch { /* opaque journal failures are intentionally fail-closed */ }
    throw new Error('TRANSITION_ALREADY_ATTEMPTED')
  }
  const record = (phase: z.infer<typeof eventSchema>['phase'], result?: z.infer<typeof resultSchema>) => {
    const fd = openSync(journal, 'a', 0o600)
    try { writeFileSync(fd, JSON.stringify({ contractHash, at: clock(), phase, ...(result ? { result } : {}) }) + '\n'); fsyncSync(fd) }
    finally { closeSync(fd) }
  }
  const checkBinding = (value: Binding) => {
    const binding = bindingSchema.parse(value), at = Date.parse(clock())
    const { observedAt, maintenanceUntil, ...observed } = binding
    if (sha(observed) !== contractHash || Date.parse(observedAt) > at || Date.parse(observedAt) < at - 60000
      || Date.parse(maintenanceUntil) < Date.parse(contract.expiresAt)) throw new Error('TRANSITION_BINDING_INVALID')
  }
  const invoke = async <T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const remaining = Date.parse(contract.expiresAt) - Date.parse(clock())
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('OPERATION_DEADLINE')) }, Math.min(remaining, 120000))
      })])
    } finally { if (timer) clearTimeout(timer) }
  }
  record('RESERVED')
  // Fixed error codes prevent SQL, connection strings or raw adapter errors
  // reaching the journal/console. Any failure retains the reservation.
  try {
    const snapshot = await invoke(signal => options.port.inspect(contract, signal))
    checkBinding(snapshot.binding)
    const input = structuredClone(snapshot.input)
    const bundle = buildHistoricalMigrationPackage(input, snapshot.schema)
    if (bundle.fingerprint !== contract.packageFingerprint || bundle.planFingerprint !== contract.planFingerprint)
      throw new Error('PACKAGE_CHANGED')
    record('BACKUP_UNCERTAIN')
    const backup = restoreSchema.parse(await invoke(signal => options.port.backupAndRestore(contract, signal)))
    checkBinding(backup.binding)
    if (backup.sourceDataHash !== backup.restoredDataHash || backup.sourceSchemaHash !== backup.restoredSchemaHash)
      throw new Error('RESTORE_MISMATCH')
    record('BACKUP_VERIFIED')
    // Refresh the complete source after backup before launching native Prisma.
    const refreshed = await invoke(signal => options.port.inspect(contract, signal))
    checkBinding(refreshed.binding)
    if (buildHistoricalMigrationPackage(refreshed.input, refreshed.schema).fingerprint !== bundle.fingerprint)
      throw new Error('INVENTORY_CHANGED')
    record('MIGRATION_UNCERTAIN')
    const after = await invoke(signal => options.port.migrateAndInspect(contract, structuredClone(bundle), signal))
    checkBinding(after.binding)
    if (after.preservedDataHash !== backup.sourceDataHash || after.originalLedgerRowsPreserved !== true)
      throw new Error('HISTORICAL_DATA_CHANGED')
    verifyHistoricalCoexistence(input, after.ledger, after.driftSql)
    const result = resultSchema.parse({ version: 1, contractHash, status: 'SCHEMA_VERIFIED',
      archiveHash: backup.archiveHash, realLoginValidated: false, promotionValidated: false })
    record('SCHEMA_VERIFIED', result)
    return { ...result, replayed: false }
  } catch { throw new Error('TRANSITION_STOPPED_REVIEW_JOURNAL') }
}

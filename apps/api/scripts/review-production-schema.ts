import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireInstalled = createRequire(import.meta.url)
const apiRoot = fileURLToPath(new URL('../', import.meta.url))
export type SchemaRunner = (executable: string, args: string[], options: {
  cwd: string; env: NodeJS.ProcessEnv; encoding: 'utf8'; windowsHide: boolean;
  timeout: number; maxBuffer: number; stdio: ['ignore', 'pipe', 'pipe'];
}) => { status: number | null; stdout?: string | null; stderr?: string | null }

/** Runs only installed Prisma read-only comparisons. No URL in argv, .env
 * export, shadow database, migration application, seed, retry or server start.
 * The credential is supplied by the verified API Production build environment.
 */
export function reviewProductionSchema(
  run: SchemaRunner = spawnSync, sourceEnv: NodeJS.ProcessEnv = process.env,
  emit: (value: string) => void = console.log,
) {
  if (sourceEnv.VERCEL_ENV !== 'production') throw new Error('PRODUCTION_SCHEMA_REVIEW_SCOPE_REQUIRED')
  let target: URL
  try { target = new URL(sourceEnv.DATABASE_URL ?? '') } catch { throw new Error('PRODUCTION_DATABASE_URL_REQUIRED') }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !target.hostname.endsWith('.neon.tech'))
    throw new Error('PRODUCTION_NEON_DATASOURCE_REQUIRED')
  if (sourceEnv.VERCEL_PROJECT_ID && sourceEnv.VERCEL_PROJECT_ID !== 'prj_mw1xLIqutlRSIG2F2BryfPqDvN2L')
    throw new Error('PRODUCTION_API_PROJECT_MISMATCH')
  const env: NodeJS.ProcessEnv = { DATABASE_URL: sourceEnv.DATABASE_URL,
    CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: 'true' }
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR'])
    if (sourceEnv[key] !== undefined) env[key] = sourceEnv[key]
  const hidden = [sourceEnv.DATABASE_URL!, target.password]
  try { hidden.push(decodeURIComponent(target.password)) } catch { /* Already redact the encoded form. */ }
  const redact = (value: string) => hidden.filter(Boolean).reduce((s, secret) => s.split(secret).join('[REDACTED]'),
    value.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[REDACTED_DB_URL]'))
  const commands = [
    ['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma',
      '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'],
    ['migrate', 'status', '--schema', 'prisma/schema.prisma'],
  ]
  for (const [index, command] of commands.entries()) {
    const result = run(process.execPath, [requireInstalled.resolve('prisma'), ...command], {
      cwd: apiRoot, env, encoding: 'utf8', windowsHide: true, timeout: 45_000,
      maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    })
    emit(redact((result.stdout ?? '') + (result.stderr ?? '')))
    if (index === 0 && result.status === 2) throw new Error('PRODUCTION_SCHEMA_MODEL_DIFFERENCES')
    if (result.status !== 0) throw new Error(index === 0
      ? 'PRODUCTION_SCHEMA_INSPECTION_FAILED' : 'PRODUCTION_MIGRATION_LEDGER_NOT_CURRENT')
  }
  const result = { modelMatches: true, migrationLedgerCurrent: true, writesPerformed: false } as const
  emit(JSON.stringify(result))
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('PRODUCTION_SCHEMA_REVIEW_NO_ARGUMENTS')
    reviewProductionSchema()
  } catch (error) {
    console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'PRODUCTION_SCHEMA_INSPECTION_FAILED')
    process.exitCode = 1
  }
}

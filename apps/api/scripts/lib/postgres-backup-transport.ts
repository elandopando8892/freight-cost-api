import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { closeSync, createReadStream, fsyncSync, mkdirSync, openSync, realpathSync, writeFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { inspectPostgresTransition, validateTransitionInspectionOptions, type TransitionInspectionOptions } from './postgres-transition-inspection.js'

const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')
const ident = (s: string) => '"' + s.replace(/"/g, '""') + '"'
const literal = (s: string) => "'" + s.replace(/'/g, "''") + "'"
const normalSchema = (s: string) => s.replace(/^\\(?:un)?restrict [^\r\n]+(?:\r?\n|$)/gm, '')
  .replace(/^-- Dumped (?:from database|by pg_dump) version[^\r\n]*\r?\n/gm, '').replace(/\r\n/g, '\n')

/** Concrete pg_dump/pg_restore transport using an explicitly owned local
 * PostgreSQL client container. Source is read-only; only the newly named
 * restoration DB is written. Never changes source roles, Auth or migrations.
 * The caller must supply a persistent, canonical root for reservations and
 * approve the location/privacy of any real backup before invoking NEON mode.
 * No production entry point calls this function. */
export async function backupPostgresTransition(options: {
  source: TransitionInspectionOptions; container: string; containerId: string;
  directory: string; expiresAt: string; signal?: AbortSignal;
}) {
  const { url, options: source } = validateTransitionInspectionOptions(options.source)
  if (!/^fcm-backup-client-[a-f0-9]{12}$/.test(options.container) || !/^[a-f0-9]{64}$/.test(options.containerId)
    || process.platform !== 'win32' || process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT)
    throw new Error('BACKUP_CLIENT_INVALID')
  const expiry = Date.parse(options.expiresAt)
  let lastClock = Date.now()
  const check = () => {
    const now = Date.now()
    if (options.signal?.aborted || !Number.isFinite(expiry) || now >= expiry || now < lastClock) throw new Error('BACKUP_WINDOW_CLOSED')
    lastClock = now
  }
  check()
  const root = realpathSync(options.directory)
  if (!root.toLowerCase().startsWith(resolve('D:/andre/validation').toLowerCase() + sep)) throw new Error('BACKUP_DIRECTORY_INVALID')
  const directory = resolve(root, source.expectedTargetFingerprint)
  try { mkdirSync(directory, { mode: 0o700 }) } catch { throw new Error('BACKUP_ALREADY_RESERVED') }
  const journal = resolve(directory, 'backup.jsonl')
  const record = (state: string, detail: object = {}) => {
    const fd = openSync(journal, 'a', 0o600)
    try { writeFileSync(fd, JSON.stringify({ state, at: new Date().toISOString(), ...detail }) + '\n'); fsyncSync(fd) }
    finally { closeSync(fd) }
  }
  record('RESERVED')
  const envBase: NodeJS.ProcessEnv = {}
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA'])
    if (process.env[key] !== undefined) envBase[key] = process.env[key]
  const run = (args: string[], input?: string, extraEnv: NodeJS.ProcessEnv = {}) => new Promise<string>((accept, reject) => {
    try { check() } catch { reject(new Error('BACKUP_WINDOW_CLOSED')); return }
    const child = spawn('docker', args, { env: { ...envBase, ...extraEnv }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', bytes = 0, failed = false
    const stop = () => { failed = true; child.kill() }
    const timer = setTimeout(stop, Math.min(120000, expiry - Date.now()))
    options.signal?.addEventListener('abort', stop, { once: true })
    child.stdout.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > 16 * 1024 * 1024) stop(); else stdout += chunk.toString('utf8') })
    // Never retain provider stderr: it can include credentials, SQL or data.
    child.stderr.resume()
    const clear = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', stop) }
    child.on('error', () => { clear(); reject(new Error('BACKUP_PROCESS_FAILED')) })
    child.on('close', code => { clear(); if (failed || code !== 0) reject(new Error('BACKUP_PROCESS_FAILED')); else accept(stdout.trim()) })
    child.stdin.on('error', () => { failed = true })
    child.stdin.end(input)
  })
  try {
    const endpoint = await run(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'])
    if (!['npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine'].includes(endpoint)) throw new Error()
    const owned = async () => {
      if (await run(['inspect', options.container, '--format', '{{.Id}}|{{index .Config.Labels "fcm.disposable"}}'])
        !== options.containerId + '|backup-transport-20261009') throw new Error('BACKUP_OWNER_CHANGED')
    }
    await owned()
    const mapping = await run(['port', options.container, '5432/tcp'])
    const port = mapping.match(/^127\.0\.0\.1:(\d+)$/)?.[1]
    if (!port) throw new Error('BACKUP_LOOPBACK_REQUIRED')
    if (source.mode === 'LOCAL_REHEARSAL' && url.port !== port) throw new Error('BACKUP_SOURCE_CONTAINER_MISMATCH')
    const preflight = await inspectPostgresTransition(source, options.signal)
    if (!preflight.inspectionPassed) throw new Error('BACKUP_SOURCE_BLOCKED')
    const sourceEnv = { PGHOST: source.mode === 'LOCAL_REHEARSAL' ? '127.0.0.1' : url.hostname,
      PGPORT: '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: url.pathname.slice(1), PGSSLMODE: source.mode === 'NEON' ? 'verify-full' : 'disable',
      ...(source.mode === 'NEON' ? { PGSSLROOTCERT: '/etc/ssl/certs/ca-certificates.crt' } : {}),
      PGCONNECT_TIMEOUT: '10', PGOPTIONS: '-c statement_timeout=10000 -c lock_timeout=5000 -c default_transaction_read_only=on' }
    const restoreName = 'fcm_restore_' + randomUUID().replace(/-/g, '')
    const restoreEnv = { PGHOST: '127.0.0.1', PGPORT: '5432', PGUSER: 'postgres', PGPASSWORD: 'local-synthetic-only',
      PGDATABASE: restoreName, PGSSLMODE: 'disable', PGCONNECT_TIMEOUT: '10', PGOPTIONS: '-c statement_timeout=10000 -c lock_timeout=5000' }
    const pg = async (environment: NodeJS.ProcessEnv, tool: string, args: string[], input?: string) => {
      await owned()
      // Pass environment names, never secret values, in argv. The inner timeout
      // also bounds an exec whose Docker client disconnects on cancellation.
      return run(['exec', '-i', ...Object.keys(environment).flatMap(key => ['--env', key]), options.container,
        'timeout', '-s', 'KILL', '110', tool, ...args], input, environment)
    }
    const sql = (environment: NodeJS.ProcessEnv, body: string) => pg(environment, 'psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], body)
    const read = async <T>(environment: NodeJS.ProcessEnv, query: string): Promise<T> => JSON.parse(await sql(environment,
      `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; ${query}; COMMIT;`))
    const data = async (environment: NodeJS.ProcessEnv) => {
      const objects = await read<{ schema: string; name: string; kind: string }[]>(environment, `SELECT COALESCE(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind) ORDER BY n.nspname,c.relname),'[]'::jsonb)
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','S') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema'`)
      const queries = objects.map(o => {
        const table = `${ident(o.schema)}.${ident(o.name)}`, name = literal(o.schema + '.' + o.name)
        return o.kind === 'S' ? `SELECT ${name} AS object,to_jsonb(s) AS contents FROM (SELECT last_value,is_called FROM ${table}) s`
          : `SELECT ${name} AS object,jsonb_build_object('rows',count(*),'hash',encode(sha256(convert_to(COALESCE(string_agg(h,',' ORDER BY h),''),'UTF8')),'hex')) AS contents FROM (SELECT encode(sha256(convert_to(to_jsonb(r)::text,'UTF8')),'hex') AS h FROM ${table} r) rows`
      })
      return sha(JSON.stringify(queries.length ? await read(environment, `SELECT jsonb_agg(to_jsonb(e) ORDER BY object) FROM (${queries.join(' UNION ALL ')}) e`) : []))
    }
    const schema = async (environment: NodeJS.ProcessEnv) => sha(normalSchema(await pg(environment, 'pg_dump', ['--schema-only'])))
    const beforeData = await data(sourceEnv), beforeSchema = await schema(sourceEnv)
    const archive = `/tmp/fcm_backup_${randomUUID().replace(/-/g, '')}.dump`
    record('BACKUP_UNCERTAIN', { restoreName })
    await pg(sourceEnv, 'pg_dump', ['--format=custom', '--file', archive])
    await owned()
    const destination = resolve(directory, 'database.dump')
    await run(['cp', `${options.container}:${archive}`, destination])
    const archiveFd = openSync(destination, 'r+')
    try { fsyncSync(archiveFd) } finally { closeSync(archiveFd) }
    const digest = createHash('sha256')
    for await (const chunk of createReadStream(destination)) { check(); digest.update(chunk) }
    const archiveHash = digest.digest('hex')
    // Check exported bytes against the archive in the client container.
    const nativeHash = (await run(['exec', options.container, 'sha256sum', archive])).split(/\s+/)[0]
    if (archiveHash !== nativeHash) throw new Error('BACKUP_COPY_CHANGED')
    record('RESTORE_UNCERTAIN', { archiveHash, restoreName })
    // CREATE, never IF NOT EXISTS or DROP: a preexisting destination is not adopted.
    await sql({ ...restoreEnv, PGDATABASE: 'postgres' }, `CREATE DATABASE ${ident(restoreName)} TEMPLATE template0;`)
    await pg(restoreEnv, 'pg_restore', ['--exit-on-error', '--single-transaction', '--dbname', restoreName, archive])
    const restoredData = await data(restoreEnv), restoredSchema = await schema(restoreEnv)
    if (restoredData !== beforeData || restoredSchema !== beforeSchema || await data(sourceEnv) !== beforeData || await schema(sourceEnv) !== beforeSchema)
      throw new Error('BACKUP_RESTORATION_CHANGED')
    check()
    const result = { archiveHash, archivePath: destination, restoreDatabase: restoreName,
      sourceDataHash: beforeData, restoredDataHash: restoredData, sourceSchemaHash: beforeSchema, restoredSchemaHash: restoredSchema,
      databaseObjectsVerified: true as const, clusterRolesVerified: false as const, databaseSettingsVerified: false as const,
      maintenanceEstablished: false as const, migrationAuthorized: false as const }
    record('VERIFIED', { archiveHash, restoreName })
    return result
  } catch {
    // A disconnected Docker client is not evidence of server-side cancellation.
    // Keep archive, restoration DB and reservation; never retry or delete them.
    record('UNCERTAIN')
    throw new Error('BACKUP_STOPPED_REVIEW_JOURNAL')
  }
}

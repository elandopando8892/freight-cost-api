import { spawn, spawnSync } from 'node:child_process'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { closeSync, createReadStream, createWriteStream, mkdirSync, openSync, readFileSync, readSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { PrismaClient } from '@prisma/client'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'

const backupDirectory = 'D:\\andre\\backups\\freight-cost-model'
const image = 'postgres:17-alpine'
const localDatabase = 'fcm_tire_restore'
const localPassword = 'local-fixture-only'
let stage = 'initialization'

function run(command: string, args: string[], input?: string | Buffer) {
  const result = spawnSync(command, args, {
    input, encoding: input == null ? 'utf8' : undefined, windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'], timeout: 120_000,
  })
  if (result.status !== 0 || result.error) {
    const diagnostic = command === 'powershell.exe' ? result.stderr.toString().split(/\r?\n/)[0].slice(0, 160) : ''
    throw new Error(`Command failed: ${command} (${args[0] ?? ''}); status=${result.status}; error=${result.error?.code ?? 'none'}; stderrBytes=${result.stderr?.length ?? 0}; ${diagnostic}`)
  }
  return result.stdout.toString().trim()
}

function protectForCurrentUser(key: Buffer) {
  const script = 'Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $p=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($p))'
  return run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], key.toString('base64'))
}

function unprotectForCurrentUser(wrapped: string) {
  const script = 'Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($p))'
  return Buffer.from(run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], wrapped), 'base64')
}

function checkLocalDocker() {
  if (process.env.DOCKER_HOST || process.env.DOCKER_CONTEXT) throw new Error('Docker endpoint override is not allowed')
  const endpoint = run('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'])
  if (!['npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine'].includes(endpoint)) {
    throw new Error('Local Docker named pipe required')
  }
  run('docker', ['image', 'inspect', image, '--format', '{{.Id}}'])
}

function waitForExit(child: ReturnType<typeof spawn>, label: string) {
  return new Promise<void>((resolve, reject) => {
    child.once('error', () => reject(new Error(`${label} could not start`)))
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`${label} exited unsuccessfully`)))
  })
}

async function sourceCounts(url: URL) {
  url.searchParams.set('connect_timeout', '10')
  const db = new PrismaClient({ datasourceUrl: url.toString(), log: [] })
  try {
    return await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10000ms'")
      const [result] = await tx.$queryRaw<{ users: bigint; migrations: bigint; tables: bigint; legacy_ids: bigint }[]>`
        SELECT (SELECT count(*) FROM "User") AS users,
          (SELECT count(*) FROM "_prisma_migrations") AS migrations,
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
          (SELECT count(*) FROM "User" WHERE "kindeId" IS NOT NULL AND btrim("kindeId") <> '') AS legacy_ids
      `
      return { users: Number(result.users), migrations: Number(result.migrations), tables: Number(result.tables), legacyIds: Number(result.legacy_ids) }
    }, { timeout: 15_000 })
  } finally { await db.$disconnect() }
}

function startClientContainer(name: string, url: URL) {
  run('docker', ['run', '--detach', '--rm', '--name', name, '--label', 'fcm.disposable=staging-backup-client',
    '--tmpfs', '/root:rw,nosuid,nodev,size=1m', image, 'sleep', '1200'])
  try {
    const host = url.hostname
    const port = url.port || '5432'
    const database = decodeURIComponent(url.pathname.slice(1))
    const user = decodeURIComponent(url.username)
    const password = decodeURIComponent(url.password).replace(/\\/g, '\\\\').replace(/:/g, '\\:')
    const pgpass = `${host}:${port}:${database}:${user}:${password}\n`
    run('docker', ['exec', '-i', name, 'sh', '-c', 'umask 077; cat > /root/.pgpass'], pgpass)
    return ['-e', `PGHOST=${host}`, '-e', `PGPORT=${port}`, '-e', `PGDATABASE=${database}`,
      '-e', `PGUSER=${user}`, '-e', 'PGSSLMODE=require', '-e', 'PGPASSFILE=/root/.pgpass']
  } catch (error) {
    run('docker', ['stop', name])
    throw error
  }
}

async function createEncryptedBackup(client: string, pgEnv: string[], destination: string, key: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let plaintextBytes = 0
  const meter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
    plaintextBytes += chunk.length
    callback(null, chunk)
  } })
  const tagger = new Transform({ transform(chunk, _encoding, callback) { callback(null, chunk) }, flush(callback) {
    this.push(cipher.getAuthTag())
    callback()
  } })
  writeFileSync(destination, iv, { flag: 'wx' })
  const dump = spawn('docker', ['exec', ...pgEnv, client, 'pg_dump', '-Fc', '--no-owner', '--no-acl'],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  dump.stderr.resume() // pg_dump errors may contain connection details; never echo them.
  const ended = waitForExit(dump, 'pg_dump')
  await Promise.all([
    pipeline(dump.stdout, meter, cipher, tagger, createWriteStream(destination, { flags: 'a' })),
    ended,
  ])
  if (plaintextBytes < 1024) throw new Error('Backup archive is unexpectedly small')
  return plaintextBytes
}

function startRestoreContainer(name: string) {
  run('docker', ['run', '--detach', '--rm', '--name', name,
    '--label', 'fcm.disposable=staging-restore', '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=2g',
    '--network', 'none', '-e', `POSTGRES_PASSWORD=${localPassword}`, '-e', `POSTGRES_DB=${localDatabase}`, image])
}

async function waitReady(name: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres', '-d', localDatabase],
      { windowsHide: true, stdio: 'ignore', timeout: 5000 })
    if (result.status === 0) return
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('Disposable restore server did not become ready')
}

async function restoreEncryptedBackup(name: string, source: string, key: Buffer) {
  const size = statSync(source).size
  if (size < 29) throw new Error('Encrypted archive is incomplete')
  const header = Buffer.alloc(12)
  const tag = Buffer.alloc(16)
  const fd = openSync(source, 'r')
  try {
    if (readSync(fd, header, 0, 12, 0) !== 12 || readSync(fd, tag, 0, 16, size - 16) !== 16) {
      throw new Error('Encrypted archive footer is incomplete')
    }
  } finally { closeSync(fd) }
  const decipher = createDecipheriv('aes-256-gcm', key, header)
  decipher.setAuthTag(tag)
  const restore = spawn('docker', ['exec', '-i', name, 'pg_restore', '--exit-on-error', '--no-owner', '--no-acl',
    '-U', 'postgres', '-d', localDatabase], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] })
  restore.stderr.resume() // No source data or SQL details in logs.
  const ended = waitForExit(restore, 'pg_restore')
  await Promise.all([
    pipeline(createReadStream(source, { start: 12, end: size - 17 }), decipher, restore.stdin),
    ended,
  ])
}

function restoredCounts(name: string) {
  const sql = `SELECT (SELECT count(*) FROM "User") || '|' ||
    (SELECT count(*) FROM "_prisma_migrations") || '|' ||
    (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') || '|' ||
    (SELECT count(*) FROM "User" WHERE "kindeId" IS NOT NULL AND btrim("kindeId") <> '');`
  const output = run('docker', ['exec', name, 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres',
    '-d', localDatabase, '-c', sql])
  const parts = output.split('|').map(Number)
  if (parts.length !== 4 || parts.some(value => !Number.isSafeInteger(value))) throw new Error('Invalid restore counts')
  return { users: parts[0], migrations: parts[1], tables: parts[2], legacyIds: parts[3] }
}

async function encryptedHash(path: string) {
  const sha = createHash('sha256')
  for await (const chunk of createReadStream(path)) sha.update(chunk)
  return sha.digest('hex')
}

async function verifyExistingBackup(manifestPath: string) {
  stage = 'existing backup manifest verification'
  const fullManifest = resolve(manifestPath)
  if (resolve(backupDirectory, basename(fullManifest)) !== fullManifest) throw new Error('Manifest must be in the approved backup directory')
  const evidence = JSON.parse(readFileSync(fullManifest, 'utf8')) as {
    schemaVersion: string; archive: string; wrappedKey: string; encryptedSha256: string;
    sourceCounts: ReturnType<typeof restoredCounts>; restore: string
  }
  if (evidence.schemaVersion !== 'fcm.staging-backup-restore.v1' || evidence.restore !== 'PASS') {
    throw new Error('Only completed backup manifests can be verified')
  }
  for (const path of [evidence.archive, evidence.wrappedKey]) {
    if (resolve(backupDirectory, basename(path)) !== resolve(path)) throw new Error('Backup file path is outside the approved directory')
  }
  if (await encryptedHash(evidence.archive) !== evidence.encryptedSha256) throw new Error('Encrypted archive checksum changed')
  const key = unprotectForCurrentUser(readFileSync(evidence.wrappedKey, 'utf8').trim())
  const restore = `fcm-pg-restore-${randomBytes(6).toString('hex')}`
  let started = false
  try {
    stage = 'repeat isolated restore startup'
    startRestoreContainer(restore)
    started = true
    await waitReady(restore)
    stage = 'repeat isolated pg_restore'
    await restoreEncryptedBackup(restore, evidence.archive, key)
    stage = 'repeat restore reconciliation'
    const counts = restoredCounts(restore)
    if (JSON.stringify(counts) !== JSON.stringify(evidence.sourceCounts)) throw new Error('Repeat restore counts differ')
    run('docker', ['stop', restore])
    started = false
    console.log(JSON.stringify({ mode: 'VERIFY_EXISTING_ONLY', manifest: fullManifest, restore: 'PASS',
      restoredCounts: counts, stagingWritesAttempted: false, containerDisposed: true }, null, 2))
  } finally {
    key.fill(0)
    if (started) run('docker', ['stop', restore])
  }
}

async function main() {
  const verifyIndex = process.argv.indexOf('--verify-manifest')
  if (verifyIndex >= 0) {
    if (!process.argv[verifyIndex + 1]) throw new Error('Missing manifest path')
    checkLocalDocker()
    await verifyExistingBackup(process.argv[verifyIndex + 1])
    return
  }
  if (process.argv.includes('--self-test-dpapi')) {
    stage = 'DPAPI key protection'
    const key = randomBytes(32)
    const recovered = unprotectForCurrentUser(protectForCurrentUser(key))
    if (!recovered.equals(key)) throw new Error('DPAPI self-test mismatch')
    recovered.fill(0)
    key.fill(0)
    console.log('DPAPI self-test PASS')
    return
  }
  if (process.argv.includes('--help')) {
    console.log('Back up verified freight-cost-api preview Neon to DPAPI-protected AES-GCM on D:, then restore in disposable, non-network-exposed local PostgreSQL. --verify-manifest PATH replays an isolated restore without contacting staging. No staging migrations or writes.')
    return
  }
  if (process.platform !== 'win32') throw new Error('Windows DPAPI is required')
  stage = 'local Docker verification'
  checkLocalDocker()
  stage = 'Vercel preview target verification'
  const target = readVerifiedPartnerPreviewTarget()
  stage = 'read-only source counts'
  const baseline = await sourceCounts(new URL(target))
  stage = 'backup directory preparation'
  mkdirSync(backupDirectory, { recursive: true })
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const stem = `staging-neon-${stamp}-${randomBytes(4).toString('hex')}`
  const archive = join(backupDirectory, `${stem}.dump.aesgcm`)
  const wrappedKey = join(backupDirectory, `${stem}.key.dpapi`)
  const manifest = join(backupDirectory, `${stem}.manifest.json`)
  const key = randomBytes(32)
  const client = `fcm-pg-client-${randomBytes(6).toString('hex')}`
  const restore = `fcm-pg-restore-${randomBytes(6).toString('hex')}`
  let clientStarted = false
  let restoreStarted = false
  let backupComplete = false
  try {
    stage = 'temporary client startup'
    const pgEnv = startClientContainer(client, target)
    clientStarted = true
    stage = 'encrypted pg_dump'
    const plaintextBytes = await createEncryptedBackup(client, pgEnv, archive, key)
    stage = 'DPAPI key protection'
    const keyBlob = protectForCurrentUser(key)
    writeFileSync(wrappedKey, `${keyBlob}\n`, { flag: 'wx' })
    backupComplete = true
    stage = 'read-only source recount'
    const afterBackup = await sourceCounts(new URL(target))
    if (JSON.stringify(afterBackup) !== JSON.stringify(baseline)) throw new Error('Source counts changed during backup')
    const encryptedBytes = statSync(archive).size
    const encryptedSha256 = await encryptedHash(archive)
    const evidence = {
      schemaVersion: 'fcm.staging-backup-restore.v1', createdAt: new Date().toISOString(),
      source: 'verified freight-cost-api preview Neon', neonProject: 'broad-art-99750179',
      encryption: 'AES-256-GCM; key wrapped by Windows DPAPI CurrentUser',
      archive, wrappedKey, plaintextBytes, encryptedBytes, encryptedSha256,
      sourceCounts: baseline, restoredCounts: null as typeof baseline | null, restore: 'PENDING',
      sourceWritesAttempted: false, migrationsApplied: false, authChanged: false,
      restoreContainerDisposed: false,
    }
    writeFileSync(manifest, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' })
    stage = 'temporary restore startup'
    startRestoreContainer(restore)
    restoreStarted = true
    stage = 'temporary restore readiness'
    await waitReady(restore)
    stage = 'DPAPI recovery and pg_restore'
    const recoveryKey = unprotectForCurrentUser(keyBlob)
    try {
      if (!recoveryKey.equals(key)) throw new Error('DPAPI recovery key mismatch')
      await restoreEncryptedBackup(restore, archive, recoveryKey)
    } finally { recoveryKey.fill(0) }
    const restored = restoredCounts(restore)
    stage = 'restore reconciliation'
    if (JSON.stringify(restored) !== JSON.stringify(baseline)) throw new Error('Source and restore counts differ')
    evidence.restoredCounts = restored
    evidence.restore = 'PASS'
    run('docker', ['stop', restore])
    restoreStarted = false
    evidence.restoreContainerDisposed = true
    writeFileSync(manifest, `${JSON.stringify(evidence, null, 2)}\n`)
    console.log(JSON.stringify({ ...evidence, manifest }, null, 2))
  } finally {
    key.fill(0)
    if (restoreStarted) run('docker', ['stop', restore])
    if (clientStarted) run('docker', ['stop', client])
    if (!backupComplete) {
      rmSync(archive, { force: true })
      rmSync(wrappedKey, { force: true })
    }
  }
}

main().catch(error => {
  const safeDetail = stage === 'DPAPI key protection' ? String(error?.message ?? '').replace(/[^a-zA-Z0-9;= ()_-]/g, '') : ''
  console.error(`Staging backup/restore did not pass at ${stage}. ${safeDetail} No migration or staging write was attempted.`)
  process.exitCode = 2
})

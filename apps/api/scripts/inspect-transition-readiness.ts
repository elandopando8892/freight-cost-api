import { readFileSync, statSync } from 'node:fs'
import { z } from 'zod'
import { readHistoricalSourceFromGit } from './lib/historical-source-from-git.js'
import { inspectPostgresTransition } from './lib/postgres-transition-inspection.js'

// Explicit URL variable only: no DATABASE_URL fallback, dotenv, migrations,
// maintenance changes or provider API. Prints a redacted summary, not users,
// roles, SQL, environment values or connection errors.
async function main() {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 1 || statSync(args[0]).size > 16384) throw new Error()
    const config = z.object({ repository: z.string(), releaseSha: z.string(),
      mode: z.enum(['NEON', 'LOCAL_REHEARSAL']), expectedTargetFingerprint: z.string(),
      migrationRole: z.string(), runtimeRoles: z.array(z.string()),
    }).strict().parse(JSON.parse(readFileSync(args[0], 'utf8')))
    const source = readHistoricalSourceFromGit(config.repository, config.releaseSha)
    const snapshot = await inspectPostgresTransition({ mode: config.mode,
      databaseUrl: process.env.FCM_TRANSITION_INSPECTION_DATABASE_URL ?? '',
      expectedTargetFingerprint: config.expectedTargetFingerprint, migrationRole: config.migrationRole, runtimeRoles: config.runtimeRoles })
    console.log(JSON.stringify({ schemaVersion: 'fcm.transition-readiness.v1', releaseSha: source.releaseSha,
      sourceFingerprint: source.sourceFingerprint, migrationFiles: source.artifacts.length,
      targetFingerprint: snapshot.targetFingerprint, observedAt: snapshot.observedAt,
      inspectionPassed: snapshot.inspectionPassed, issues: snapshot.issues,
      userCount: snapshot.users.length, ledgerCount: snapshot.ledger.length,
      writesPerformed: false, maintenanceEstablished: false, migrationAuthorized: false }))
    process.exitCode = snapshot.inspectionPassed ? 0 : 1
  } catch {
    console.log(JSON.stringify({ schemaVersion: 'fcm.transition-readiness.v1', inspectionPassed: false,
      issues: ['TRANSITION_READINESS_FAILED'], writesPerformed: false, migrationAuthorized: false }))
    process.exitCode = 1
  }
}
void main()

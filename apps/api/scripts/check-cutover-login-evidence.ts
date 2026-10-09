import { readFileSync, statSync } from 'node:fs'
import { evaluateCutoverLoginAcceptance } from './lib/cutover-login-acceptance.js'

// Offline, read-only. Separate expectation/evidence files; no .env or network.
// No raw validation errors, tokens, identities or evidence contents are printed.
try {
  const args = process.argv.slice(2)
  if (args.length !== 2) throw new Error()
  const read = (path: string) => {
    if (statSync(path).size > 128 * 1024) throw new Error()
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  }
  const result = evaluateCutoverLoginAcceptance(read(args[1]), read(args[0]))
  console.log(JSON.stringify(result))
  // Only complete observations satisfy this report, never a simulation.
  process.exitCode = result.status === 'OBSERVATIONS_COMPLETE' ? 0 : 1
} catch {
  console.log(JSON.stringify({ status: 'INCOMPLETE', issues: ['EVIDENCE_FILES_INVALID'], independentlyVerified: false }))
  process.exitCode = 1
}

import { readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { PublicReferenceLedgerSchema, combinePublicReferenceLedger,
  auditD2DPublicReferenceComponents } from '../src/modules/engine/benchmark-public-reference-components.js'

/** Local files only. No environment loader, DB, network, API or adoption. */
function main() {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0].startsWith('--')) throw new Error('Usage: tsx scripts/audit-public-reference-components.ts <research-ledger.json>')
  const ledgerPath = realpathSync(resolve(args[0]))
  const content = readFileSync(ledgerPath, 'utf8')
  const ledger = PublicReferenceLedgerSchema.parse(JSON.parse(content))
  const corePath = realpathSync(resolve(dirname(ledgerPath), ledger.coreTemplateFile))
  if (dirname(corePath) !== dirname(ledgerPath)) throw new Error('Core template must remain in the ledger directory')
  const coreContent = readFileSync(corePath, 'utf8')
  const coreHash = createHash('sha256').update(coreContent).digest('hex')
  if (coreHash !== ledger.coreTemplateSha256.toLowerCase()) throw new Error('CORE_TEMPLATE_HASH_MISMATCH')
  const report = auditD2DPublicReferenceComponents(combinePublicReferenceLedger(ledger, JSON.parse(coreContent)))
  console.log(JSON.stringify({ methodId: report.methodId, status: report.status,
    calibrated: report.calibrated, quoteReady: report.quoteReady, adoptedValues: report.adoptedValues,
    ledgerSha256: createHash('sha256').update(content).digest('hex'), coreTemplateSha256: coreHash,
    countries: [report.mx, report.us].map(row => ({ country: row.lineage.core.country,
      status: row.status, issueCount: row.issues.length, coverage: row.coverage })),
    issues: report.issues,
  }, null, 2))
  if (report.status === 'INCOMPLETE') process.exitCode = 2
}
try { main() } catch (error) {
  console.error(error instanceof Error ? error.message : 'Ledger audit failed')
  process.exitCode = 1
}

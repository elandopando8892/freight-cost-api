import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { auditD2DPayrollCapitalContracts, PayrollCapitalContractSchema } from '../src/modules/engine/benchmark-payroll-capital-contract.js'

/** Local file audit only: no environment loaders, database, network or application routes. */
function main() {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0].startsWith('--')) throw new Error('Usage: tsx scripts/audit-payroll-capital-contract.ts <research-template.json>')
  const content = readFileSync(resolve(args[0]), 'utf8')
  const document = JSON.parse(content)
  if (!Array.isArray(document.contracts) || document.contracts.length !== 2) throw new Error('Expected exactly two country contracts')
  const contracts = document.contracts.map((raw: unknown) => PayrollCapitalContractSchema.parse(raw))
  const mx = contracts.find((row: { country: string }) => row.country === 'MX')
  const us = contracts.find((row: { country: string }) => row.country === 'US')
  if (!mx || !us) throw new Error('Expected one MX and one US contract')
  const report = auditD2DPayrollCapitalContracts({ mx, us })
  console.log(JSON.stringify({ methodId: 'FCM_PAYROLL_CAPITAL_CONTRACT_V1', status: report.status,
    calibrated: report.calibrated, quoteReady: report.quoteReady, adoptedValues: report.adoptedValues,
    inputSha256: createHash('sha256').update(content).digest('hex'),
    countries: [report.mx, report.us].map(row => ({ country: row.lineage.country,
      status: row.status, issueCount: row.issues.length })),
    issues: report.issues,
  }, null, 2))
  if (report.status === 'INCOMPLETE') process.exitCode = 2
}
try { main() } catch (error) {
  console.error(error instanceof Error ? error.message : 'Contract audit failed')
  process.exitCode = 1
}

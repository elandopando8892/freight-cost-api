import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { parseBenchmarkEvidenceRegister, reconcileBenchmarkEvidenceInventory } from '../src/modules/engine/benchmark-evidence-inventory.js'

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: reconcile-benchmark-evidence.ts [--check]')
  // Dependency enumeration imports legacy services, but never calls them. Force
  // both possible datasource selectors to an unreachable local test target before import.
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://inventory:unused@127.0.0.1:1/never_connect'
  process.env.STAGING_DATABASE_URL = process.env.DATABASE_URL
  const { benchmarkRateRequirements } = await import('../src/modules/engine/benchmark-rates.js')
  const registerPath = resolve(__dirname, '../../../docs/C1_B1_PARAMETER_SOURCE_REGISTER_2026-10-01.md')
  const markdown = readFileSync(registerPath, 'utf8')
  const requirements = {
    MX: benchmarkRateRequirements('MX'), US: benchmarkRateRequirements('US'),
  }
  const result = reconcileBenchmarkEvidenceInventory(parseBenchmarkEvidenceRegister(markdown), requirements)
  const report = args.includes('--check') ? {
    model: result.model, inventoryStatus: result.inventoryStatus, economicStatus: result.economicStatus,
    calibrated: result.calibrated, quoteReady: result.quoteReady, parameterValuesIncluded: result.parameterValuesIncluded,
    counts: result.counts,
    countries: result.countries.map(({ country, counts, sections }) => ({ country, counts, sections })),
    issues: result.issues, exclusions: result.exclusions,
  } : result
  console.log(JSON.stringify({ ...report,
    registerFile: 'docs/C1_B1_PARAMETER_SOURCE_REGISTER_2026-10-01.md',
    registerSha256: createHash('sha256').update(markdown).digest('hex'),
    requirementsSha256: createHash('sha256').update(JSON.stringify(requirements)).digest('hex'),
    assetCostScope: 'TRACTOR_AND_TRAILER',
    assetScopeConfirmedForPilot: false,
  }, null, 2))
  // This checks documentation drift ONLY; exit 0 never means economic readiness.
  if (result.issues.length) process.exitCode = 1
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Inventory reconciliation failed'); process.exitCode = 1 })

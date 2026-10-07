import { basename, dirname, resolve } from 'node:path'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readLocalDocument } from './assemble-economic-reference-cards.js'
import { readRouteSource } from './review-d2d-route-evidence.js'

/** CLI-only hermetic bootstrap. Never sets these variables in the running API.
 * Mirrors the inventory auditor: legacy arithmetic imports initialize Prisma,
 * but neither dependency enumeration nor draft preparation executes DB queries. */
async function main() {
  const args = process.argv.slice(2)
  if (args.length < 1 || args.length > 5) throw new Error('Usage: tsx run-d2d-readiness-case.ts <docs/research/case.json> [docs/research/route-link.json] [docs/research/mx-tolls.json] [docs/research/border.json] [docs/research/budget.json]')
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const target = realpathSync(resolve(args[0]))
  if (dirname(target) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
  const routeLink = args[1] ? realpathSync(resolve(args[1])) : null
  if (routeLink && dirname(routeLink) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
  const tollManifest = args[2] ? realpathSync(resolve(args[2])) : null
  if (tollManifest && dirname(tollManifest) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
  const borderManifest = args[3] ? realpathSync(resolve(args[3])) : null
  if (borderManifest && dirname(borderManifest) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
  const budgetManifest = args[4] ? realpathSync(resolve(args[4])) : null
  if (budgetManifest && dirname(budgetManifest) !== realpathSync(resolve(root, 'docs/research'))) throw new Error('MANIFEST_OUTSIDE_RESEARCH')
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://readiness:unused@127.0.0.1:1/never_connect'
  process.env.STAGING_DATABASE_URL = process.env.DATABASE_URL
  const { prepareD2DReadinessCase } = await import('./prepare-d2d-readiness-case.js')
  const report = prepareD2DReadinessCase(JSON.parse(readLocalDocument(`docs/research/${basename(target)}`)), readLocalDocument,
    routeLink ? JSON.parse(readLocalDocument(`docs/research/${basename(routeLink)}`)) : undefined,
    tollManifest ? JSON.parse(readLocalDocument(`docs/research/${basename(tollManifest)}`)) : undefined, readRouteSource,
    borderManifest ? JSON.parse(readLocalDocument(`docs/research/${basename(borderManifest)}`)) : undefined,
    budgetManifest ? JSON.parse(readLocalDocument(`docs/research/${basename(budgetManifest)}`)) : undefined)
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = 2 // Expected INCOMPLETE; not an economic gate or business operation.
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Case preparation failed'); process.exitCode = 1 })
}

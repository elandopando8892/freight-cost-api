import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOnly } from './build-only.js'
import { reviewProductionSchema } from './review-production-schema.js'

/** Normal builds retain the database-free builder. A explicitly requested
 * Production review must pass BEFORE compilation; it never applies migrations.
 */
export function buildDeployment(
  env: NodeJS.ProcessEnv = process.env,
  build: () => void = () => buildOnly(undefined, env),
  inspect: () => unknown = () => reviewProductionSchema(undefined, env),
) {
  if (env.FCM_PRODUCTION_SCHEMA_REVIEW === 'true') inspect()
  build()
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('BUILD_DEPLOYMENT_NO_ARGUMENTS')
  if (process.env.FCM_PRODUCTION_CUTOVER_MODE === 'inventory') {
    buildOnly()
    void import('./production-cutover-inventory.js').then(async ({ productionCutoverInventory }) => {
      console.log('FCM_PRODUCTION_INVENTORY=' + JSON.stringify(await productionCutoverInventory()))
      // Inspection deployments never replace an operational deployment.
      console.error('CUTOVER_INVENTORY_ONLY_NO_PUBLICATION')
      process.exitCode = 1
    }).catch(() => {
      console.error('CUTOVER_INVENTORY_UNAVAILABLE_NO_WRITES')
      process.exitCode = 1
    })
  } else {
    buildDeployment()
    console.log('Deployment build complete; migrations not invoked.')
  }
}

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOnly } from './build-only.js'
import { reviewProductionSchema } from './review-production-schema.js'
import { encodeCutoverEvidence } from './lib/cutover-evidence.js'
import { parseFcmAccessScope } from '../src/modules/auth/fcm-access-scope.js'

/** Normal builds retain the database-free builder. A explicitly requested
 * Production review must pass BEFORE compilation; it never applies migrations.
 */
export function buildDeployment(
  env: NodeJS.ProcessEnv = process.env,
  build: () => void = () => buildOnly(undefined, env),
  inspect: () => unknown = () => reviewProductionSchema(undefined, env),
) {
  if (env.VERCEL_ENV === 'production') parseFcmAccessScope(env.FCM_AUTH_ACCESS_SCOPE ?? '')
  if (env.FCM_PRODUCTION_SCHEMA_REVIEW === 'true') inspect()
  build()
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('BUILD_DEPLOYMENT_NO_ARGUMENTS')
  if (['inventory', 'identity-contacts'].includes(process.env.FCM_PRODUCTION_CUTOVER_MODE ?? '')) {
    buildOnly()
    void import('./production-cutover-inventory.js').then(async ({ productionCutoverInventory }) => {
      const pins = process.env.FCM_PRODUCTION_CUTOVER_MODE === 'identity-contacts'
        ? JSON.parse(process.env.FCM_IDENTITY_CONTACT_PINS ?? 'null') : undefined
      if (process.env.FCM_PRODUCTION_CUTOVER_MODE === 'identity-contacts' && !pins)
        throw new Error('CONTACT_PINS_REQUIRED')
      for (const line of encodeCutoverEvidence(await productionCutoverInventory(process.env, pins))) console.log(line)
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

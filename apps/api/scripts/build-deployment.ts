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
  buildDeployment()
  console.log('Deployment build complete; migrations not invoked.')
}

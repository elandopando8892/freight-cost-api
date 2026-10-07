import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseEnv } from 'dotenv'
import { createGoogleBasicRouteClient, GoogleRouteError, planGoogleBasicRoute } from '../src/modules/routing/google-basic-route.client.js'
import { readRouteSource } from './review-d2d-route-evidence.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const keyFile = resolve(root, '.env.google-routes.local')
// One explicitly requested call per invocation. Does not prove/control whole-account monthly usage.
export async function queryGoogleBasicRoute(args: string[], inherited: NodeJS.ProcessEnv = process.env) {
  if (args.length < 1 || args.length > 2 || !args[0].startsWith('--route=') ||
      (args.length === 2 && args[1] !== '--execute')) {
    return { exitCode: 1, report: { status: 'INVALID_ARGUMENTS', usage: '--route=docs/research/request.json [--execute]' } }
  }
  try {
    const plan = planGoogleBasicRoute(JSON.parse(readRouteSource(args[0].slice('--route='.length)).toString('utf8')))
    if (args.length === 1) return { exitCode: 0, report: { status: 'DRY_RUN_NO_NETWORK', ...plan,
      liveRequests: 0, databaseAccessed: false, quoteReady: false } }
    let apiKey = inherited.GOOGLE_ROUTES_API_KEY?.trim()
    // Explicitly empty env disables file fallback for hermetic tests.
    if (!Object.hasOwn(inherited, 'GOOGLE_ROUTES_API_KEY') && existsSync(keyFile)) {
      apiKey = parseEnv(readFileSync(keyFile)).GOOGLE_ROUTES_API_KEY?.trim()
    }
    const result = await createGoogleBasicRouteClient({ apiKey }).routeCandidate(plan.request)
    // Route content remains transient: do not print/cache geometry or distance into retained logs.
    return { exitCode: 2, report: { status: result.status, provider: result.provider, attribution: result.attribution,
      attemptsThisClient: result.usage.attemptsThisClient, truckRouteValidated: false,
      routeContentPersisted: false, handoff: result.handoff, quoteReady: false,
      next: 'TRANSIENT_GOOGLE_MAPS_UI_REQUIRED_TO_INSPECT_CANDIDATE', databaseAccessed: false } }
  } catch (error) {
    const code = error instanceof GoogleRouteError ? error.code : 'LOCAL_REQUEST_ERROR'
    return { exitCode: code === 'MISSING_API_KEY' ? 2 : 1, report: { status: 'BLOCKED', code,
      keyConfigurationFile: keyFile, databaseAccessed: false, quoteReady: false } }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  queryGoogleBasicRoute(process.argv.slice(2)).then(({ exitCode, report }) => {
    console.log(JSON.stringify(report, null, 2)); process.exitCode = exitCode
  }).catch(() => { console.error('LOCAL_CONFIG_ERROR'); process.exitCode = 1 })
}

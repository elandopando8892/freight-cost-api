import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseEnv } from 'dotenv'
import { createSakbeClient, SakbeError } from '../src/modules/routing/sakbe.client.js'
import { readRouteSource } from './review-d2d-route-evidence.js'

// Independent local CLI, NOT an authenticated application endpoint or DB-backed import.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const tokenFile = resolve(root, '.env.sakbe.local')
export async function querySakbe(args: string[], inherited: NodeJS.ProcessEnv = process.env) {
  if (args.length !== 1 || (!args[0].startsWith('--search=') && !args[0].startsWith('--route=') && !args[0].startsWith('--detail='))) {
    return { exitCode: 1, report: { status: 'INVALID_ARGUMENTS', usage: '--search=City OR --route=docs/research/request.json OR --detail=docs/research/request.json' } }
  }
  let token = inherited.INEGI_SAKBE_TOKEN?.trim()
  // An explicitly empty environment token disables fallback, keeping CLI tests hermetic
  // even after the human configures their private local file.
  if (!Object.hasOwn(inherited, 'INEGI_SAKBE_TOKEN') && existsSync(tokenFile)) {
    token = parseEnv(readFileSync(tokenFile)).INEGI_SAKBE_TOKEN?.trim()
  }
  try {
    const client = createSakbeClient({ token })
    const report = args[0].startsWith('--search=')
      ? await client.searchDestinations(args[0].slice('--search='.length))
      : args[0].startsWith('--detail=')
        ? await client.detailCandidate(JSON.parse(readRouteSource(args[0].slice('--detail='.length)).toString('utf8')))
        : await client.routeCandidate(JSON.parse(readRouteSource(args[0].slice('--route='.length)).toString('utf8')))
    return { exitCode: args[0].startsWith('--search=') ? 0 : 2, report }
  } catch (error) {
    const code = error instanceof SakbeError ? error.code : 'LOCAL_REQUEST_ERROR'
    return { exitCode: ['MISSING_TOKEN', 'ACCESS_DENIED'].includes(code) ? 2 : 1,
      report: { status: 'BLOCKED', code, tokenConfigurationFile: tokenFile,
        tokenRegistration: 'https://gaia.inegi.org.mx/sakbe_v3.1/genera_token.jsp',
        routeCalculated: false, databaseAccessed: false, quoteReady: false } }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  querySakbe(process.argv.slice(2)).then(({ exitCode, report }) => {
    console.log(JSON.stringify(report, null, 2)); process.exitCode = exitCode
  }).catch(() => { console.error('LOCAL_CONFIG_ERROR'); process.exitCode = 1 })
}

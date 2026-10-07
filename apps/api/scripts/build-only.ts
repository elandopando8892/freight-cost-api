import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireInstalled = createRequire(import.meta.url)
const apiRoot = fileURLToPath(new URL('../', import.meta.url))
type Run = (executable: string, args: string[], options: {
  cwd: string; env: NodeJS.ProcessEnv; stdio: 'inherit'; windowsHide: boolean
}) => { status: number | null }

/** No server startup, environment-file loader, migrations or package download. */
export function buildOnly(run: Run = spawnSync, sourceEnv: NodeJS.ProcessEnv = process.env) {
  const env: NodeJS.ProcessEnv = {}
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) {
    if (sourceEnv[key] !== undefined) env[key] = sourceEnv[key]
  }
  env.DATABASE_URL = 'postgresql://build:build@127.0.0.1:1/build'
  env.PRISMA_GENERATE_SKIP_AUTOINSTALL = 'true'
  env.CHECKPOINT_DISABLE = '1'
  env.PRISMA_HIDE_UPDATE_MESSAGE = 'true'
  const options = { cwd: apiRoot, env, stdio: 'inherit' as const, windowsHide: true }
  const commands = [
    { label: 'GENERATE', args: [requireInstalled.resolve('prisma'), 'generate', '--schema', 'prisma/schema.prisma'] },
    { label: 'COMPILE', args: [requireInstalled.resolve('typescript/bin/tsc'), '--project', 'tsconfig.json'] },
  ]
  for (const command of commands) {
    if (run(process.execPath, command.args, options).status !== 0) throw new Error(`BUILD_ONLY_${command.label}_FAILED`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('BUILD_ONLY_NO_ARGUMENTS')
  buildOnly()
  console.log('API build-only complete: Prisma client generated and TypeScript compiled; migrations not invoked.')
}

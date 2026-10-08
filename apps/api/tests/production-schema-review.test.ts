import { expect, it } from 'vitest'
import { reviewProductionSchema, type SchemaRunner } from '../scripts/review-production-schema.js'
import { buildDeployment } from '../scripts/build-deployment.js'

const env = { VERCEL_ENV: 'production', DATABASE_URL: 'postgresql://probe:synthetic-password@ep-example.aws.neon.tech/test' }
const FCM_AUTH_ACCESS_SCOPE = JSON.stringify({ version: 1, users: [
  { email: 'sales@heymarksman.com', subject: '00000000-0000-4000-8000-000000000001' },
  { email: 'jgonzalez@xbfreight.com', subject: '00000000-0000-4000-8000-000000000002' },
] })

it('compares a real datasource to the candidate model, then reads migration status without launching a migration', () => {
  const commands: string[][] = []
  const run: SchemaRunner = (_executable, args, options) => {
    commands.push(args.slice(1))
    expect(options.env).not.toHaveProperty('OPENAI_API_KEY')
    expect(options.env).not.toHaveProperty('NODE_OPTIONS')
    return { status: 0, stdout: 'Schemas match', stderr: '' }
  }
  expect(reviewProductionSchema(run, { ...env, OPENAI_API_KEY: 'unrelated-secret', NODE_OPTIONS: 'unrelated-loader' }, () => {}))
    .toEqual({ modelMatches: true, migrationLedgerCurrent: true, writesPerformed: false })
  expect(commands).toEqual([
    ['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'],
    ['migrate', 'status', '--schema', 'prisma/schema.prisma'],
  ])
})

it('stops on model differences and redacts credentials in the diagnostic output', () => {
  let calls = 0
  const output: string[] = []
  const run: SchemaRunner = () => {
    calls++
    return { status: 2, stdout: '[+] Added User.supabaseId', stderr: env.DATABASE_URL + ' synthetic-password' }
  }
  expect(() => reviewProductionSchema(run, env, s => output.push(s))).toThrow('PRODUCTION_SCHEMA_MODEL_DIFFERENCES')
  expect(calls).toBe(1)
  expect(output.join('\n')).toContain('User.supabaseId')
  expect(output.join('\n')).not.toContain('synthetic-password')
  expect(output.join('\n')).not.toContain('postgresql://')
})

it.each([1, null])('does not label an inspection failure %s as a model difference or retry', status => {
  let calls = 0
  const run: SchemaRunner = () => { calls++; return { status, stdout: '', stderr: '' } }
  expect(() => reviewProductionSchema(run, env, () => {})).toThrow('PRODUCTION_SCHEMA_INSPECTION_FAILED')
  expect(calls).toBe(1)
})

it('does not continue to build when the migration ledger is not current', () => {
  let calls = 0
  const run: SchemaRunner = () => ({ status: ++calls === 1 ? 0 : 1, stdout: '', stderr: '' })
  expect(() => reviewProductionSchema(run, env, () => {})).toThrow('PRODUCTION_MIGRATION_LEDGER_NOT_CURRENT')
  expect(calls).toBe(2)
})

it.each([
  { ...env, VERCEL_ENV: 'preview' },
  { ...env, DATABASE_URL: '' },
  { ...env, DATABASE_URL: 'postgresql://test:test@db.example.com/test' },
])('rejects an unverified scope or datasource before executing a process', source => {
  let calls = 0
  const run: SchemaRunner = () => { calls++; return { status: 0, stdout: '', stderr: '' } }
  expect(() => reviewProductionSchema(run, source, () => {})).toThrow()
  expect(calls).toBe(0)
})

it('keeps the ordinary deployment build database-free unless production review is explicitly enabled', () => {
  const steps: string[] = []
  buildDeployment({ ...env, FCM_AUTH_ACCESS_SCOPE }, () => steps.push('build'), () => steps.push('inspect'))
  expect(steps).toEqual(['build'])
})

it('requires successful inspection before building a supervised production candidate', () => {
  const steps: string[] = []
  expect(() => buildDeployment({ ...env, FCM_AUTH_ACCESS_SCOPE, FCM_PRODUCTION_SCHEMA_REVIEW: 'true' }, () => steps.push('build'), () => {
    steps.push('inspect'); throw new Error('schema blocked')
  })).toThrow('schema blocked')
  expect(steps).toEqual(['inspect'])
})

it.each([undefined, '', '{}'])('rejects an absent or invalid production access scope %s before any inspection or build', value => {
  const steps: string[] = []
  expect(() => buildDeployment({ ...env, FCM_AUTH_ACCESS_SCOPE: value, FCM_PRODUCTION_SCHEMA_REVIEW: 'true' },
    () => steps.push('build'), () => steps.push('inspect'))).toThrow('FCM_ACCESS_SCOPE_INVALID')
  expect(steps).toEqual([])
})

import { expect, it, vi } from 'vitest'
import { buildOnly } from '../scripts/build-only.js'
type Runner = NonNullable<Parameters<typeof buildOnly>[0]>

it('generates the client and compiles using installed tools, independent of deployment migration settings', () => {
  const run = vi.fn<Parameters<Runner>, ReturnType<Runner>>(() => ({ status: 0 }))
  buildOnly(run, { PATH: process.env.PATH, DATABASE_URL: 'forbidden',
    STAGING_DATABASE_URL: 'forbidden', VERCEL_ENV: 'production',
    NODE_OPTIONS: '--require=forbidden', OPENAI_API_KEY: 'forbidden' })
  expect(run).toHaveBeenCalledTimes(2)
  expect(run.mock.calls[0][1].slice(1)).toEqual(['generate', '--schema', 'prisma/schema.prisma'])
  expect(run.mock.calls[1][1].slice(1)).toEqual(['--project', 'tsconfig.json'])
  for (const call of run.mock.calls) {
    expect(call[0]).toBe(process.execPath)
    expect(call[2].env).not.toHaveProperty('STAGING_DATABASE_URL')
    expect(call[2].env).not.toHaveProperty('NODE_OPTIONS')
    expect(call[2].env).not.toHaveProperty('OPENAI_API_KEY')
    expect(call[2].env.DATABASE_URL).toBe('postgresql://build:build@127.0.0.1:1/build')
  }
})

it('stops at generation failure and reports compiler failure without retry', () => {
  const generateFailure = vi.fn(() => ({ status: 1 }))
  expect(() => buildOnly(generateFailure, {})).toThrow('BUILD_ONLY_GENERATE_FAILED')
  expect(generateFailure).toHaveBeenCalledTimes(1)
  const compileFailure = vi.fn().mockReturnValueOnce({ status: 0 }).mockReturnValueOnce({ status: null })
  expect(() => buildOnly(compileFailure, {})).toThrow('BUILD_ONLY_COMPILE_FAILED')
  expect(compileFailure).toHaveBeenCalledTimes(2)
})

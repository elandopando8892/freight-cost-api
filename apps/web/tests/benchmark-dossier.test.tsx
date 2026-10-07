import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createBenchmarkDossier, openBenchmarkDossier, validateDossierInput, MAX_DOSSIER_BYTES } from '../lib/benchmark-dossier'
import { emptyForm, type FormNode } from '../app/(app)/scenarios/benchmark/benchmark-form'
import rawSchema from './visual/benchmark-form-schema.json'
import { confirmedB2CaseCapture } from '../lib/benchmark-case-capture'
import type { FormCapture } from './fixtures/form-capture'

const schema = rawSchema as FormNode
const input = () => emptyForm(schema) as FormCapture
beforeEach(() => { vi.stubGlobal('crypto', webcrypto) })
afterEach(() => { vi.unstubAllGlobals() })
it('confirmed case presets only descriptive context and preserves blank economics', async () => {
  const blank = input()
  const seeded = confirmedB2CaseCapture(blank) as FormCapture
  expect(seeded.route.route.usEndpoint).toBe('Fort Smith, AR 72916')
  expect(seeded.route.serviceDate).toBe('')
  expect(seeded.fixed.capital.acquisitionCost.value).toBe('')
  expect(seeded.route.mx.parameters.parameters.every(p => p.value === '')).toBe(true)
  expect(seeded.route.us.parameters.parameters.every(p => p.value === '')).toBe(true)
  expect(blank.route.direction).toBe('')
  expect((await openBenchmarkDossier(await createBenchmarkDossier(seeded, schema), schema)).input).toEqual(seeded)
})

it('round trips incomplete inputs, keeps zero distinct and never archives totals/identity', async () => {
  const value = input()
  value.route.mx.trip.loadedKm.value = 0
  value.route.direction = 'MX_TO_US'
  const original = structuredClone(value)
  const text = await createBenchmarkDossier(value, schema, '2026-10-03T21:00:00.000Z')
  const restored = await openBenchmarkDossier(text, schema)
  expect(restored.input).toEqual(value)
  expect((restored.input as FormCapture).fixed.capital.acquisitionCost.value).toBe('')
  expect(restored.savedAt).toBe('2026-10-03T21:00:00.000Z')
  expect(value).toEqual(original)
  expect(JSON.parse(text).payload.resultPolicy).toBe('RECALCULATE_ON_SERVER')
  for (const field of ['results', 'session', 'orgId', 'token', 'cfuUsd', 'sellPriceUsd']) expect(text).not.toContain(`"${field}"`)
  expect(await openBenchmarkDossier(text, schema)).toEqual(restored)
})
it('checksum detects changed content; whitespace/key order alone is irrelevant', async () => {
  const text = await createBenchmarkDossier(input(), schema)
  const envelope = JSON.parse(text)
  await expect(openBenchmarkDossier(JSON.stringify({ sha256: envelope.sha256, payload: envelope.payload }, null, 2), schema)).resolves.toBeTruthy()
  envelope.payload.input.route.direction = 'MX_TO_US'
  await expect(openBenchmarkDossier(JSON.stringify(envelope), schema)).rejects.toThrow('DOSSIER_CHECKSUM')
})
it('rejects upgraded version, approval claims, and injected saved results', async () => {
  const envelope = JSON.parse(await createBenchmarkDossier(input(), schema))
  for (const patch of [{ version: 2 }, { quoteReady: true }, { calibrated: true }, { results: { cfuUsd: 999 } }]) {
    await expect(openBenchmarkDossier(JSON.stringify({ ...envelope, payload: { ...envelope.payload, ...patch } }), schema)).rejects.toThrow()
  }
})
it('rejects schema drift even when capture fields might still fit', async () => {
  const text = await createBenchmarkDossier(input(), schema)
  const changed = structuredClone(schema)
  changed.fields!.route.fields!.direction.choices!.push('NEW_ROUTE_POLICY')
  await expect(openBenchmarkDossier(text, changed)).rejects.toThrow('DOSSIER_SCHEMA_CHANGED')
})
it('rejects missing/extra fields, fixed literals, invalid numbers and enum coercion', () => {
  const bad: unknown[] = []
  const missing = input(); Reflect.deleteProperty(missing, 'route'); bad.push(missing)
  const extra = input(); extra.credential = 'private'; bad.push(extra)
  const literal = input(); literal.route.model = 'different'; bad.push(literal)
  const number = input(); number.route.mx.trip.loadedKm.value = '0'; bad.push(number)
  const nan = input(); nan.route.mx.trip.loadedKm.value = NaN; bad.push(nan)
  const enumValue = input(); enumValue.route.direction = 'UNKNOWN'; bad.push(enumValue)
  for (const value of bad) expect(() => validateDossierInput(value, schema)).toThrow()
})
it('rejects oversized arrays, text, UTF8 payload and malformed JSON', async () => {
  const rows = input(); rows.route.mx.parameters.evidence = Array(301).fill({})
  expect(() => validateDossierInput(rows, schema)).toThrow('DOSSIER_ARRAY')
  const long = input(); long.route.serviceDate = 'x'.repeat(2001)
  await expect(createBenchmarkDossier(long, schema)).rejects.toThrow('DOSSIER_TEXT')
  await expect(openBenchmarkDossier('ñ'.repeat(MAX_DOSSIER_BYTES), schema)).rejects.toThrow('DOSSIER_SIZE')
  await expect(openBenchmarkDossier('{', schema)).rejects.toThrow()
})
it('rejects prototype injection without changing global prototypes', () => {
  const value = JSON.parse(JSON.stringify(input()))
  Object.defineProperty(value.route, '__proto__', { value: { polluted: true }, enumerable: true })
  expect(() => validateDossierInput(value, schema)).toThrow('DOSSIER_FIELDS')
  expect(Reflect.get({}, 'polluted')).toBeUndefined()
})

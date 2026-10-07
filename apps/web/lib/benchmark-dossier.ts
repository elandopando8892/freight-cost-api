import { z } from 'zod'
import type { FormNode, FormValue } from '../app/(app)/scenarios/benchmark/benchmark-form'

export const MAX_DOSSIER_BYTES = 300_000
const MAX_INPUT_BYTES = 256_000
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const payloadSchema = z.object({
  model: z.literal('FCM_BENCHMARK_DOSSIER'), version: z.literal(1),
  savedAt: z.string().datetime(), schemaSha256: digest, input: z.unknown(),
  resultPolicy: z.literal('RECALCULATE_ON_SERVER'), calibrated: z.literal(false), quoteReady: z.literal(false),
}).strict()
const envelopeSchema = z.object({ payload: payloadSchema, sha256: digest }).strict()
export type DossierInput = Record<string, FormValue>

/** Structural validation permits incomplete captures, never economic approval.
 * Match the CURRENT server form exactly, including fixed values and array limits. */
export function validateDossierInput(raw: unknown, node: FormNode): FormValue {
  if (node.kind === 'object') {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('DOSSIER_STRUCTURE')
    const entries = Object.entries(node.fields!), value = raw as Record<string, unknown>
    if (Object.keys(value).length !== entries.length || entries.some(([key]) => !Object.hasOwn(value, key))) throw new Error('DOSSIER_FIELDS')
    return Object.fromEntries(entries.map(([key, field]) => [key, validateDossierInput(value[key], field)]))
  }
  if (node.kind === 'array') {
    if (!Array.isArray(raw) || raw.length > (node.max ?? 300)) throw new Error('DOSSIER_ARRAY')
    return raw.map(value => validateDossierInput(value, node.item!))
  }
  if (node.kind === 'fixed') {
    if (raw !== node.value) throw new Error('DOSSIER_FIXED_VALUE')
    return raw as string
  }
  if (node.kind === 'number') {
    if (raw !== '' && (typeof raw !== 'number' || !Number.isFinite(raw) || Math.abs(raw) > Number.MAX_SAFE_INTEGER)) throw new Error('DOSSIER_NUMBER')
    return raw as number | ''
  }
  if (typeof raw !== 'string' || raw.length > 2000) throw new Error('DOSSIER_TEXT')
  if (node.kind === 'choice' && raw !== '' && !node.choices!.includes(raw)) throw new Error('DOSSIER_CHOICE')
  return raw
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  const json = JSON.stringify(value)
  if (json === undefined) throw new Error('DOSSIER_JSON')
  return json
}
async function hash(value: unknown) {
  const bytes = new TextEncoder().encode(canonical(value))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(v => v.toString(16).padStart(2, '0')).join('')
}
function size(text: string, max: number) {
  if (new TextEncoder().encode(text).length > max) throw new Error('DOSSIER_SIZE')
}
export async function createBenchmarkDossier(raw: unknown, schema: FormNode, savedAt = new Date().toISOString()) {
  const input = validateDossierInput(raw, schema)
  size(JSON.stringify(input), MAX_INPUT_BYTES)
  const payload = payloadSchema.parse({ model: 'FCM_BENCHMARK_DOSSIER', version: 1, savedAt,
    schemaSha256: await hash(schema), input, resultPolicy: 'RECALCULATE_ON_SERVER', calibrated: false, quoteReady: false })
  const text = JSON.stringify({ payload, sha256: await hash(payload) })
  size(text, MAX_DOSSIER_BYTES)
  return text
}
export async function openBenchmarkDossier(text: string, schema: FormNode) {
  size(text, MAX_DOSSIER_BYTES)
  const envelope = envelopeSchema.parse(JSON.parse(text))
  if (await hash(envelope.payload) !== envelope.sha256) throw new Error('DOSSIER_CHECKSUM')
  if (await hash(schema) !== envelope.payload.schemaSha256) throw new Error('DOSSIER_SCHEMA_CHANGED')
  const input = validateDossierInput(envelope.payload.input, schema)
  size(JSON.stringify(input), MAX_INPUT_BYTES)
  return { savedAt: envelope.payload.savedAt, input: input as DossierInput }
}
/** Explicit user download only; never localStorage, automatic recovery or remote write. */
export function downloadBenchmarkDossier(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'fcm-expediente-d2d-v1.json'
  document.body.append(link)
  try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}

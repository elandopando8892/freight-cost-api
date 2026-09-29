import { z } from 'zod'
import { OwnedD2DSchema } from './benchmark-owned-d2d.js'
import { benchmarkRateRequirements } from './benchmark-rates.js'
import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'

export type FormNode = { kind: 'object' | 'array' | 'text' | 'number' | 'choice' | 'fixed'; fields?: Record<string, FormNode>; item?: FormNode; choices?: string[]; value?: string; max?: number; rows?: Record<string, unknown>[] }
/** Presentation metadata only. Never serialize Zod defaults or economic catalog values. */
export function describeBenchmarkForm(schema: z.ZodTypeAny, path = ''): FormNode {
  if (schema instanceof z.ZodEffects) return describeBenchmarkForm(schema.innerType(), path)
  if (schema instanceof z.ZodDefault) return describeBenchmarkForm(schema.removeDefault(), path)
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) return describeBenchmarkForm(schema.unwrap(), path)
  if (schema instanceof z.ZodObject) return { kind: 'object', fields: Object.fromEntries(Object.entries(schema.shape).map(([key, value]) => [key, describeBenchmarkForm(value as z.ZodTypeAny, `${path}.${key}`)])) }
  if (schema instanceof z.ZodArray) {
    const node: FormNode = { kind: 'array', item: describeBenchmarkForm(schema.element, `${path}.*`), max: schema._def.maxLength?.value ?? 300 }
    if (/^\.route\.(mx|us)\.parameters\.parameters$/.test(path)) {
      const country = path.includes('.mx.') ? 'MX' : 'US'
      const required = new Set(Object.values(benchmarkRateRequirements(country, true)).flat())
      node.rows = PARAMETER_DEFINITIONS.filter(p => required.has(p.key)).map(p => ({ key: p.key, unit: p.unit }))
    }
    return node
  }
  if (schema instanceof z.ZodEnum) return { kind: 'choice', choices: schema.options }
  if (schema instanceof z.ZodLiteral) return { kind: 'fixed', value: String(schema.value) }
  if (schema instanceof z.ZodNumber) return { kind: 'number' }
  if (schema instanceof z.ZodString) return { kind: 'text' }
  throw new Error(`Unsupported benchmark field: ${path}`)
}
export const benchmarkForm = () => describeBenchmarkForm(OwnedD2DSchema)

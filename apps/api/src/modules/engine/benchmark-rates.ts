import { z } from 'zod'
import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'
import { deriveMonthlyFixedCost, deriveMaintTiresPerKm } from './engine.outputs.js'
import { BenchmarkLegSchema, calculateBenchmarkLeg } from './benchmark-leg.js'

const text = z.string().trim().min(1).max(1000)
export const BenchmarkParametersSchema = z.object({
  country: BenchmarkLegSchema.shape.country,
  serviceDate: BenchmarkLegSchema.shape.serviceDate,
  baseRevision: text,
  parameters: z.array(z.object({
    key: text, value: z.number().finite().nonnegative(), unit: text,
    evidenceIds: z.array(text).min(1), derivation: text,
  }).strict()),
  evidence: BenchmarkLegSchema.shape.evidence,
}).strict()

const definitions = new Map(PARAMETER_DEFINITIONS.map(p => [`${p.section}__${p.field}`, p]))
const byKey = new Map(PARAMETER_DEFINITIONS.map(p => [p.key, p]))
const tirePositions = ['Direccion', 'Traccion', 'Recapeadas', 'Remolque'] as const

function formulas(country: 'MX' | 'US') {
  const p = (m: Record<string, number>, section: string, field: string) => m[`${section}__${field}`]
  return {
    monthlyFixedUsd: { unit: 'USD/fleet-month', run: (m: Record<string, number>) => deriveMonthlyFixedCost(m, {
      includeCrossborderCosts: false, workingCapitalCountry: country, includeTrailerAssets: true, includeDollyAssets: false,
    }) },
    productiveKmPerMonth: { unit: 'km/fleet-month', run: (m: Record<string, number>) =>
      p(m, 'GENERAL_BASE', 'Operadores') * p(m, 'GENERAL_BASE', 'Kilómetros promedio x operador') },
    productiveVehicleDaysPerMonth: { unit: 'vehicle-days/fleet-month', run: (m: Record<string, number>) =>
      p(m, 'GENERAL_BASE', 'Tamaño de Flota') * p(m, 'GENERAL_BASE', 'Índice de Operatividad') * p(m, 'GENERAL_BASE', 'Periodo de Operación') },
    maintenanceUsdPerKm: { unit: 'USD/km', run: (m: Record<string, number>) => {
      // Reuse maintenance arithmetic, excluding the legacy tire PU permutation.
      const maintenanceOnly = new Proxy(m, { get(target, key: string) {
        if (key.startsWith('COST_TIRES__Qty ')) return 0
        if (key.startsWith('COST_TIRES__PU ')) return 0
        if (key.startsWith('COST_TIRES__Life KM ')) return 1
        return target[key]
      } })
      return deriveMaintTiresPerKm(maintenanceOnly)
    } },
    tiresUsdPerKm: { unit: 'USD/km', run: (m: Record<string, number>) => tirePositions.reduce((sum, position) =>
      sum + p(m, 'COST_TIRES', `Qty ${position}`) * p(m, 'COST_TIRES', `PU ${position}`) / p(m, 'COST_TIRES', `Life KM ${position}`), 0) },
    driverUsdPerKm: { unit: 'USD/km', run: (m: Record<string, number>) => p(m, 'LABOR', `Tarifa Operador ${country}`) / 1.60934 },
    dieselUsdPerLiter: { unit: 'USD/liter', run: (m: Record<string, number>) => country === 'MX'
      ? p(m, 'FUEL', 'Diesel MX') / p(m, 'FINANCE', 'Tipo de Cambio') : p(m, 'FUEL', 'Diesel US Border') },
    loadedKmPerLiter: { unit: 'km/liter', run: (m: Record<string, number>) => p(m, 'FUEL', 'Rendimiento Cargado') },
    emptyKmPerLiter: { unit: 'km/liter', run: (m: Record<string, number>) => p(m, 'FUEL', 'Rendimiento Vacío') },
  }
}

/** Enumerates actual formula dependencies; sentinel arithmetic is discarded. */
export function benchmarkRateRequirements(country: 'MX' | 'US') {
  return Object.fromEntries(Object.entries(formulas(country)).map(([rate, formula]) => {
    const keys = new Set<string>()
    formula.run(new Proxy({}, { get(_target, field: string) {
      const definition = definitions.get(field)
      if (!definition) throw new Error(`Unregistered benchmark dependency: ${field}`)
      keys.add(definition.key)
      return 1
    } }))
    return [rate, [...keys]]
  }))
}

/** Local conversion only: source metadata is checked, not independently authenticated. */
export function deriveBenchmarkRates(raw: unknown) {
  const input = BenchmarkParametersSchema.parse(raw)
  const requirements = benchmarkRateRequirements(input.country)
  const needed = new Set(Object.values(requirements).flat())
  const parameters = new Map(input.parameters.map(p => [p.key, p]))
  const evidence = new Map(input.evidence.map(e => [e.id, e]))
  const issues: { field: string; code: string }[] = []
  if (parameters.size !== input.parameters.length) issues.push({ field: 'parameters', code: 'DUPLICATE_PARAMETER' })
  if (evidence.size !== input.evidence.length) issues.push({ field: 'evidence', code: 'DUPLICATE_EVIDENCE' })
  for (const key of needed) {
    const item = parameters.get(key)
    if (!item) { issues.push({ field: key, code: 'MISSING_PARAMETER' }); continue }
    if (item.unit !== byKey.get(key)!.unit) issues.push({ field: key, code: 'UNIT_MISMATCH' })
    for (const id of item.evidenceIds) {
      const source = evidence.get(id)
      if (!source) { issues.push({ field: key, code: 'MISSING_EVIDENCE' }); continue }
      if (source.country !== input.country) issues.push({ field: key, code: 'COUNTRY_MISMATCH' })
      if (source.validFrom > source.validUntil || source.observedAt > input.serviceDate ||
          input.serviceDate < source.validFrom || input.serviceDate > source.validUntil) {
        issues.push({ field: key, code: 'EVIDENCE_OUTSIDE_VALIDITY' })
      }
    }
  }
  for (const item of input.parameters) if (!byKey.has(item.key)) issues.push({ field: item.key, code: 'UNKNOWN_PARAMETER' })
  const envelope = { model: 'FCM_BENCHMARK_RATES_V1', country: input.country, baseRevision: input.baseRevision,
    requirements, calibrated: false, sourceStatus: 'DOCUMENTED_UNVERIFIED', lineage: input }
  if (issues.length) return { ...envelope, status: 'INCOMPLETE', issues, rates: null }
  const values = new Proxy({} as Record<string, number>, { get(_target, field: string) {
    const definition = definitions.get(field)
    const parameter = definition && parameters.get(definition.key)
    if (!parameter) throw new Error('Unexpected missing benchmark dependency')
    return parameter.value
  } })
  const positiveFields = ['COST_CAPITAL__Periodo Depreciacion', 'COST_INSURANCE__Periodo de Poliza',
    'GENERAL_BASE__Tamaño de Flota', 'GENERAL_BASE__Operadores', 'GENERAL_BASE__Kilómetros promedio x operador',
    'GENERAL_BASE__Índice de Operatividad', 'GENERAL_BASE__Periodo de Operación',
    'FUEL__Rendimiento Cargado', 'FUEL__Rendimiento Vacío', ...tirePositions.map(p => `COST_TIRES__Life KM ${p}`),
    ...(input.country === 'MX' ? ['FINANCE__Tipo de Cambio'] : [])]
  for (const field of positiveFields) if (!(values[field] > 0)) issues.push({ field, code: 'NON_POSITIVE_DENOMINATOR' })
  for (const field of ['COST_CAPITAL__LTV Asset Financing', 'GENERAL_BASE__Índice de Operatividad']) {
    if (values[field] > 1) issues.push({ field, code: 'INVALID_FRACTION' })
  }
  const asset = values['COST_CAPITAL__Qty Tracto'] * values['COST_CAPITAL__PU Tracto'] + values['COST_CAPITAL__Qty Remolque'] * values['COST_CAPITAL__PU Remolque']
  const residual = values['COST_CAPITAL__Qty Rescue Tracto'] * values['COST_CAPITAL__PU Rescue Tracto'] + values['COST_CAPITAL__Qty Rescue Remolque'] * values['COST_CAPITAL__PU Rescue Remolque']
  if (residual > asset) issues.push({ field: 'COST_CAPITAL', code: 'RESIDUAL_EXCEEDS_ASSET' })
  if (issues.length) return { ...envelope, status: 'INCOMPLETE', issues, rates: null }
  const rates = Object.fromEntries(Object.entries(formulas(input.country)).map(([rate, formula]) => [rate, {
    value: formula.run(values), unit: formula.unit,
    evidenceIds: [...new Set(requirements[rate].flatMap(key => parameters.get(key)!.evidenceIds))],
    derivation: `FCM_BENCHMARK_RATES_V1:${rate}; canonical dependencies in requirements.${rate}`,
  }]))
  const parsed = BenchmarkLegSchema.shape.rates.safeParse(rates)
  if (!parsed.success) return { ...envelope, status: 'INCOMPLETE', rates: null,
    issues: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), code: 'INVALID_DERIVED_RATE' })) }
  return { ...envelope, status: 'DERIVED_UNVERIFIED', issues, rates: parsed.data }
}

/** Preserves canonical input lineage through the derived-rate -> leg boundary. */
export function calculateBenchmarkFromParameters(raw: unknown, trip: unknown) {
  const derived = deriveBenchmarkRates(raw)
  if (!derived.rates) return { status: 'INCOMPLETE', parameterLineage: derived, leg: null }
  const leg = calculateBenchmarkLeg({
    model: 'FCM_CARRIER_BENCHMARK_LEG_V1', country: derived.country,
    baseRevision: derived.baseRevision, serviceDate: derived.lineage.serviceDate,
    equipment: 'TRACTOR_DRY_VAN_SINGLE', service: 'ONE_WAY', fixedCostScope: 'DOMESTIC_CARRIER_FLEET',
    rates: derived.rates, evidence: derived.lineage.evidence, trip,
  })
  return { status: leg.status, parameterLineage: derived, leg }
}

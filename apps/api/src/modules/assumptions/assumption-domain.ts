import { DEFAULT_ASSUMPTIONS } from '../../data/default-assumptions.js'

export interface AssumptionValueCandidate {
  section: string
  field: string
  value: number
}

const keyOf = ({ section, field }: Pick<AssumptionValueCandidate, 'section' | 'field'>) =>
  `${section}__${field}`

// These fields are actual divisors in the versioned engine. Their recommended
// low/high values remain advisory; this only enforces the mathematical domain.
const STRICTLY_POSITIVE_DIVISORS = new Set([
  'GENERAL_BASE__Periodo de Operación',
  'GENERAL_BASE__Tamaño de Flota',
  'GENERAL_BASE__Índice de Operatividad',
  'GENERAL_BASE__Operadores',
  'GENERAL_BASE__Kilómetros promedio x operador',
  'FUEL__Rendimiento Cargado',
  'FUEL__Rendimiento Vacío',
  'FINANCE__Tipo de Cambio',
  'TECHNICAL_MARGIN__Rate Rounding MEX USD',
  'TECHNICAL_MARGIN__Rate Rounding USA USD',
  'COST_TIRES__Life KM Direccion',
  'COST_TIRES__Life KM Traccion',
  'COST_TIRES__Life KM Remolque',
  'COST_TIRES__Life KM Recapeadas',
  'COST_INSURANCE__Periodo de Poliza',
  'COST_CAPITAL__Periodo Depreciacion',
])

// Both utility and sell margins are used as cost / (1 - margin).
const COMPLEMENT_DIVISOR_RATES = new Set([
  'TECHNICAL_MARGIN__UT Rate One Way',
  'TECHNICAL_MARGIN__UT Rate Backhaul',
  'TECHNICAL_MARGIN__UT Rate Roundtrip',
  'TECHNICAL_MARGIN__Minimum Gross Margin',
  'TECHNICAL_MARGIN__Target Gross Margin',
  'TECHNICAL_MARGIN__Premium Gross Margin',
])

const TANDEM_FUEL_PENALTY = 'CONFIG__Tandem Fuel Penalty'
const CANONICAL_PARAMETER_KEYS = new Set(DEFAULT_ASSUMPTIONS.map(keyOf))
// Keep the reciprocal itself inside JavaScript's exact-integer safety envelope.
// This is deliberately independent from the catalog's advisory commercial lows.
const MIN_SAFE_DIVISOR = 1 / Number.MAX_SAFE_INTEGER

export class AssumptionValueDomainError extends Error {
  readonly statusCode = 422
}

export function assumptionValueDomainIssue(candidate: AssumptionValueCandidate): string | null {
  const { value } = candidate
  const key = keyOf(candidate)

  if (!Number.isFinite(value)) return `${candidate.field} must be a finite number.`
  // This is a numerical-safety envelope, not a commercial recommendation.
  // It leaves ample headroom for every catalog value while keeping chained
  // products/divisions representable as IEEE-754 numbers.
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    return `${candidate.field} is outside the safe calculation envelope.`
  }
  if (STRICTLY_POSITIVE_DIVISORS.has(key) && value <= 0) {
    return `${candidate.field} must be greater than 0 because it is used as a divisor.`
  }
  if (STRICTLY_POSITIVE_DIVISORS.has(key) && value < MIN_SAFE_DIVISOR) {
    return `${candidate.field} is too close to zero for safe division.`
  }
  if (value < 0) return `${candidate.field} must be zero or greater.`
  if (COMPLEMENT_DIVISOR_RATES.has(key) && value >= 1) {
    return `${candidate.field} must be less than 1 because pricing divides by (1 - margin).`
  }
  if (key === TANDEM_FUEL_PENALTY && value >= 1) {
    return `${candidate.field} must be less than 1 because fuel efficiency divides by (1 - penalty).`
  }
  return null
}

export function assertAssumptionValueDomain(candidate: AssumptionValueCandidate): void {
  const issue = assumptionValueDomainIssue(candidate)
  if (issue) throw new AssumptionValueDomainError(issue)
}

export function assumptionSetCrossFieldIssues(
  candidates: readonly AssumptionValueCandidate[],
  scope?: string | null,
): string[] {
  const values = new Map(candidates.map((candidate) => [keyOf(candidate), candidate.value]))
  const issues: string[] = []
  const minimumMargin = values.get('TECHNICAL_MARGIN__Minimum Gross Margin')
  const targetMargin = values.get('TECHNICAL_MARGIN__Target Gross Margin')
  const premiumMargin = values.get('TECHNICAL_MARGIN__Premium Gross Margin')
  if (
    minimumMargin != null && targetMargin != null && premiumMargin != null &&
    !(minimumMargin <= targetMargin && targetMargin <= premiumMargin)
  ) {
    issues.push('Gross margins must satisfy Minimum <= Target <= Premium.')
  }

  if (scope === 'CROSS_BORDER') {
    const mixMx = values.get('FUEL__Fuel Purchase Mix MX')
    const mixUs = values.get('FUEL__Fuel Purchase Mix US')
    if (mixMx != null && mixUs != null && Math.abs(mixMx + mixUs - 1) >= 1e-6) {
      issues.push('Cross-border fuel purchase mix MX + US must equal 1.')
    }
  }
  return issues
}

export function assertAssumptionSetDomain(
  candidates: readonly AssumptionValueCandidate[],
  scope?: string | null,
): void {
  const issues = candidates
    .map(assumptionValueDomainIssue)
    .filter((issue): issue is string => issue !== null)
  issues.push(...assumptionSetCrossFieldIssues(candidates, scope))
  if (issues.length > 0) throw new AssumptionValueDomainError(issues.slice(0, 8).join(' '))
}

export function canonicalAssumptionIdentityIssues(
  candidates: readonly Pick<AssumptionValueCandidate, 'section' | 'field'>[],
): string[] {
  const actual = new Set<string>()
  const duplicates = new Set<string>()
  for (const candidate of candidates) {
    const key = keyOf(candidate)
    if (actual.has(key)) duplicates.add(key)
    actual.add(key)
  }
  const missing = [...CANONICAL_PARAMETER_KEYS].filter((key) => !actual.has(key))
  const unexpected = [...actual].filter((key) => !CANONICAL_PARAMETER_KEYS.has(key))
  const issues: string[] = []
  if (missing.length > 0) issues.push(`Missing canonical assumptions: ${missing.slice(0, 5).join(', ')}.`)
  if (unexpected.length > 0) issues.push(`Unknown assumptions are not allowed: ${unexpected.slice(0, 5).join(', ')}.`)
  if (duplicates.size > 0) issues.push(`Duplicate assumptions are not allowed: ${[...duplicates].slice(0, 5).join(', ')}.`)
  return issues
}

export function assertCanonicalAssumptionIdentity(
  candidates: readonly Pick<AssumptionValueCandidate, 'section' | 'field'>[],
): void {
  const issues = canonicalAssumptionIdentityIssues(candidates)
  if (issues.length > 0) throw new AssumptionValueDomainError(issues.join(' '))
}

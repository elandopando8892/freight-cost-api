import { createHash } from 'node:crypto'
import { PARAMETER_DEFINITIONS } from '../../src/data/parameter-catalog.js'
import { deriveMonthlyFixedCost, deriveMaintTiresPerKm } from '../../src/modules/engine/engine.outputs.js'
import { readModelParameterSource } from './model-parameter-consumers.js'

/** Independent declared equations, tested against the actual pure kernel.
 * Synthetic unequal inputs diagnose arithmetic; never supply benchmark prices. */
export function auditFixedMaintenanceFormulaContracts(
  fixed = deriveMonthlyFixedCost, maintenance = deriveMaintTiresPerKm,
) {
  const neutral = Object.fromEntries(PARAMETER_DEFINITIONS.map(d => [`${d.section}__${d.field}`, 0]))
  neutral['GENERAL_BASE__Tamaño de Flota'] = 3
  neutral['LABOR__Carga Social'] = .25
  neutral['COST_INSURANCE__Periodo de Poliza'] = 12
  neutral['COST_CAPITAL__Periodo Depreciacion'] = 60
  for (const position of ['Direccion', 'Traccion', 'Recapeadas', 'Remolque']) neutral[`COST_TIRES__Life KM ${position}`] = 1000
  const rows: { id: string; section: string; canonicalKeys: string[]; equation: string; expected: number; observed: number; matches: boolean }[] = []
  const probe = (id: string, section: string, inputs: Record<string, number>, expected: number, equation: string, variable = false,
    options: Parameters<typeof deriveMonthlyFixedCost>[1] = { includeCrossborderCosts: false }) => {
    const canonicalKeys = Object.keys(inputs).map(field => {
      const definition = PARAMETER_DEFINITIONS.find(d => `${d.section}__${d.field}` === field)
      if (!definition) throw new Error(`FORMULA_PROBE_UNREGISTERED_KEY:${field}`)
      return definition.key
    })
    const map = { ...neutral, ...inputs }
    const observed = variable ? maintenance(map) : fixed(map, options)
    rows.push({ id, section, canonicalKeys, equation, expected, observed,
      matches: Number.isFinite(observed) && Math.abs(observed - expected) <= 1e-9 })
  }
  for (const role of ['Despachador', 'Jefe Trafico', 'Gerente Operaciones', 'Gerente Comercial', 'Safety Manager', 'Tracking CS', 'Billing Admin'])
    probe(`ADMIN:${role}`, 'COST_PAYROLL', { [`COST_PAYROLL__Qty ${role}`]: 2, [`COST_PAYROLL__PU ${role}`]: 37 }, 2 * 37 * 1.25, 'Qty × own PU × (1 + administrative burden); no fleet multiplier')
  for (const item of ['Agua', 'Luz', 'Telefonia Fija', 'Telefonia Celular', 'Internet', 'Renta Patio', 'Software', 'Capacitaciones', 'Representacion', 'Utiles', 'Imprenta', 'Seguros Otros', 'Mant Otros', 'Comb Otros', 'Depr Otros', 'Depr Equipos', 'Gestorias', 'Office Cleaning', 'Security', 'Banking', 'Legal', 'Subscriptions', 'Office Equip'])
    probe(`COMPANY:${item}`, 'COST_COMPANY', { [`COST_COMPANY__Qty ${item}`]: 2, [`COST_COMPANY__PU ${item}`]: 37 }, 74, 'Qty × own PU; monthly company pool once')
  const schedules: [number, string[]][] = [
    [10000, ['Aceite de Motor', 'Filtros de Aceite', 'Filtros de Diesel', 'Mano de Obra']],
    [100000, ['Aceite Caja Cambios', 'Aceite Caja Transmision', 'Filtros', 'Aceite Hidraulico', 'Filtros Aire']],
    [250000, ['Baterias', 'Calibracion Inyectores', 'Clutch', 'Frenos']],
  ]
  for (const [km, items] of schedules) for (const item of items) {
    const prefix = `${km / 1000}k`
    probe(`MAINT:${prefix}:${item}`, 'COST_MAINT', { [`COST_MAINT__${prefix} Qty ${item}`]: 2, [`COST_MAINT__${prefix} PU ${item}`]: 37 }, 74 / km, 'Qty × own PU / interval km', true)
  }
  for (const reserve of ['DEF Urea', 'Lubricants', 'DPF', 'PM Unscheduled'])
    probe(`RESERVE:${reserve}`, 'COST_MAINT', { [`COST_MAINT__Reserve ${reserve}`]: .037 }, .037, 'Already per km; add once, not divide by another interval', true)
  probe('RESERVE:Coolant', 'COST_MAINT', { 'COST_MAINT__Reserve Coolant': 37 }, 37 / 100000, 'Reserve per 100000 km, not monthly', true)
  probe('INSURANCE:PERIOD', 'COST_INSURANCE', { 'COST_INSURANCE__Prima Anual por Vehiculo': 1, 'COST_INSURANCE__Poliza x Vehiculo': 12000 }, 3000, 'Policy × vehicle count / covered months')
  probe('CAPITAL:TRACTOR', 'COST_CAPITAL', { 'COST_CAPITAL__Qty Tracto': 1, 'COST_CAPITAL__PU Tracto': 12000, 'COST_CAPITAL__Qty Rescue Tracto': 1, 'COST_CAPITAL__PU Rescue Tracto': 3000 }, 450, '(acquisition − terminal residual) / months × fleet')
  for (const [asset, residual] of [['Remolque', 3000], ['Dolly', 0]] as const) {
    const inputs = { [`COST_CAPITAL__Qty ${asset}`]: 1, [`COST_CAPITAL__PU ${asset}`]: 12000,
      ...(residual ? { [`COST_CAPITAL__Qty Rescue ${asset}`]: 1, [`COST_CAPITAL__PU Rescue ${asset}`]: residual } : {}) }
    probe(`CAPITAL:${asset}:INCLUDED`, 'COST_CAPITAL', inputs, (12000 - residual) / 60 * 3, 'Include owned asset and its residual once')
    probe(`CAPITAL:${asset}:EXCLUDED`, 'COST_CAPITAL', inputs, 0, 'Explicit unowned asset exclusion, not an unknown price default', false,
      { includeCrossborderCosts: false, includeTrailerAssets: asset !== 'Remolque', includeDollyAssets: asset !== 'Dolly' })
  }
  probe('FINANCE:ASSET', 'COST_CAPITAL', { 'COST_CAPITAL__Qty Tracto': 1, 'COST_CAPITAL__PU Tracto': 12000,
    'COST_CAPITAL__Qty Rescue Tracto': 1, 'COST_CAPITAL__PU Rescue Tracto': 12000,
    'COST_CAPITAL__LTV Asset Financing': .5, 'COST_CAPITAL__Asset Finance Annual Rate': .1 }, 150,
  'Legacy asset finance = acquisition × LTV × annual rate /12 × fleet; not a loan amortization schedule')
  for (const name of ['Registro doble matricula', 'Seguros adicionales', 'CTPAT', 'FMCSA', 'Ajustes Regulatorios', 'SCAC', 'BOC-3', 'Safety Audit']) {
    const input = { [`COST_CROSSBORDER__${name}`]: 120 }
    const vehicle = ['Registro doble matricula', 'Seguros adicionales'].includes(name)
    probe(`COMPLIANCE:${name}`, 'COST_CROSSBORDER', input, 120 * (vehicle ? 3 : 1) / 12, 'Annual obligation /12; per fleet or per entity as declared', false, true)
    probe(`COMPLIANCE:${name}:DISABLED`, 'COST_CROSSBORDER', input, 0, 'Benchmark excludes this legacy package; explicit separate resource budget owns it')
  }
  for (const name of ['Renta Oficinas Patios', 'Costos Comunicacion', 'GPS', 'Capacitacion Operadores', 'Mantenimientos', 'TMS', 'Border Yard Minimum'])
    probe(`BORDER_INFRA:${name}`, 'COST_CROSSBORDER', { [`COST_CROSSBORDER__${name}`]: 37 }, 37, 'Monthly entity pool once, no extra annual or fleet multiplier', false, true)
  for (const country of ['MX', 'US'] as const) {
    const inputs = { 'FINANCE__Customer Collection Days': 30, 'FINANCE__Carrier Payment Days': 14,
      'FINANCE__Monthly COGS Proxy': 12000, [`FINANCE__Cost of Capital ${country}`]: .12 }
    probe(`WORKING_CAPITAL:${country}`, 'FINANCE', inputs, 64, 'COGS × MAX(AR−AP,0)/30 × annual rate /12; own country rate, separate carrier/XBF scope', false,
      { includeCrossborderCosts: false, workingCapitalCountry: country })
    probe(`WORKING_CAPITAL:${country}:NO_GAP`, 'FINANCE', { ...inputs, 'FINANCE__Carrier Payment Days': 45 }, 0, 'No negative receivable/payable gap credit', false,
      { includeCrossborderCosts: false, workingCapitalCountry: country })
  }
  const sourceFile = 'apps/api/src/modules/engine/engine.outputs.ts'
  return { scope: 'SYNTHETIC_FIXED_MAINTENANCE_ARITHMETIC_NOT_COMPLETE_MODEL_OR_BENCHMARK_CALIBRATION',
    sourceFile, sourceSha256: createHash('sha256').update(readModelParameterSource(sourceFile)).digest('hex'), rows,
    checkedEquations: rows.length, failures: rows.filter(r => !r.matches), testedEquationsMatch: rows.every(r => r.matches),
    detailedAndPublicMethodsEquivalent: false, legacyKernelChanged: false, calibrated: false, adoptedValues: 0 }
}

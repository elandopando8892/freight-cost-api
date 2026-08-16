import type { CostBaseScope } from '@prisma/client'
import { PARAMETER_DEFINITIONS, type ParameterDefinition } from '../../data/parameter-catalog.js'
import { defaultCostBaseProfile, parseCostBaseProfile, type CostBaseProfile } from './cost-base-profile.js'

export type ParameterApplicability = 'REQUIRED' | 'OPTIONAL' | 'CONDITIONAL' | 'NOT_IMPLEMENTED' | 'NOT_APPLICABLE'

export type ApplicabilityDecision = {
  applicability: ParameterApplicability
  reason: string
  condition: string | null
}

const result = (
  applicability: ParameterApplicability,
  reason: string,
  condition: string | null = null,
): ApplicabilityDecision => ({ applicability, reason, condition })

const MX_DISTANCE_FLOORS = new Set([
  'Billable Day Floor Local', 'Billable Day Floor Short-haul', 'Empty KM Min Local',
  'Empty KM Min Short-haul', 'Min Trip Cost Local USD', 'Min Trip Cost Short-haul USD',
  'Billable Day Floor Long-haul',
])
const DRAYAGE_UTILIZATION = new Set(['Port Dwell Hours', 'Delivery Service Hours', 'Billable Day Floor Drayage'])
const TANDEM_CONFIG = new Set([
  'Tandem Toll Premium', 'Tandem Fuel Penalty', 'Tandem Maint/Tires Factor',
  'Tandem CFU Factor', 'Tandem Second Unit Monthly USD',
])
const DRAYAGE_CONFIG = new Set([
  'Chassis Day Cost USD', 'Drayage Port Pickup Factor',
  'Drayage Final Reposition Factor', 'Drayage Drop-Off Factor',
])
const TRAILER_CAPITAL = new Set(['Qty Remolque', 'PU Remolque', 'Qty Rescue Remolque', 'PU Rescue Remolque'])
const DOLLY_CAPITAL = new Set(['Qty Dolly', 'PU Dolly'])
// V3.0 intentionally preserves a shifted price mapping. In that formula the
// trailer term consumes Qty Remolque × PU Traccion / Life KM Remolque, while
// PU Remolque still prices the tractor retread term. Classify actual math, not
// what the labels appear to mean.
const TRAILER_TIRE_TERM = new Set(['Qty Remolque', 'PU Traccion', 'Life KM Remolque'])
const NOT_IMPLEMENTED = new Set([
  'LABOR__Sueldo Base Operador MX', 'LABOR__Viáticos MX', 'LABOR__Team Driver Premium',
  'LABOR__Hazmat Driver Premium', 'FINANCE__Inflation Buffer',
  'UTILIZATION__Trailer Utilization', 'UTILIZATION__Truck Utilization Days',
  'UTILIZATION__Free Time', 'UTILIZATION__Detention Rate',
  'BORDER__Border Friction Time', 'BORDER__Yard Transfer Cost', 'BORDER__Inspection Delay Reserve',
  'RISK__Tight Market Premium', 'RISK__Expedited Premium', 'RISK__Hazmat Premium',
  'RISK__Weather Disruption Buffer', 'TECHNICAL_MARGIN__Buy Market Weight',
])

function resolvedProfile(scope: CostBaseScope, profile: unknown): CostBaseProfile {
  return profile === undefined ? defaultCostBaseProfile(scope) : parseCostBaseProfile(scope, profile)
}

/**
 * Product applicability matrix for the canonical V3.0 catalog. The snapshot
 * stays complete for reproducibility, while this decision controls onboarding,
 * editing and override validation. REQUIRED means a direct cost driver for the
 * selected profile; CONDITIONAL means the engine uses it only when the stated
 * lane/equipment/service condition occurs; OPTIONAL is useful governance or a
 * reference value without a direct effect in the current operational engine.
 */
export function parameterApplicability(
  scope: CostBaseScope | null | undefined,
  parameter: Pick<ParameterDefinition, 'section' | 'field'>,
  profileValue?: unknown,
): ApplicabilityDecision {
  if (!scope) return result('OPTIONAL', 'Versión legado sin una base de costo gobernada; requiere revisión humana.')

  const profile = resolvedProfile(scope, profileValue)
  const hasMx = profile.countries.includes('MX')
  const hasUs = profile.countries.includes('US')
  const isCrossBorder = scope === 'CROSS_BORDER'
  const isDrayage = scope === 'DRAYAGE'
  const hasOwnedTrailer = profile.trailerTypes.some((trailer) => trailer !== 'Chassis' && trailer !== 'Power Only')
  const hasNonOwnedTrailer = profile.trailerTypes.some((trailer) => trailer === 'Chassis' || trailer === 'Power Only')
  const usesTandem = profile.configurations.includes('Tandem')
  const workbookExact = profile.calculationPolicy === 'WORKBOOK_V3'
  const supports = (service: CostBaseProfile['services'][number]) => profile.services.includes(service)
  const carries = (trailer: CostBaseProfile['trailerTypes'][number]) => profile.trailerTypes.includes(trailer)
  const { section, field } = parameter

  const parameterKey = `${section}__${field}`
  if (section === 'BORDER') {
    if (!isCrossBorder) return result('NOT_APPLICABLE', 'La carga no cruza la frontera MX–US bajo este alcance.')
    if (field === 'Border Transactional Cost') return result('REQUIRED', 'Costo transaccional directo de cada cruce D2D MX–US.')
    return result('NOT_IMPLEMENTED', 'El dato pertenece al gobierno fronterizo, pero todavía no modifica el motor V3.')
  }
  if (section === 'COST_CROSSBORDER') {
    if (isCrossBorder) return result('REQUIRED', 'Costo fijo directo de autoridad, cumplimiento o infraestructura para un cruce con tractor propio.')
    if (workbookExact && !isDrayage) {
      return result('REQUIRED', 'WORKBOOK_V3 consume históricamente este costo aun en una ruta doméstica; usa OPERATIONAL_V3 para aislarlo.')
    }
    return result('NOT_APPLICABLE', 'La carga no cruza la frontera MX–US bajo este alcance.')
  }

  if (NOT_IMPLEMENTED.has(parameterKey)) {
    const countryRelevant = !field.includes(' MX') || hasMx
    return countryRelevant
      ? result('NOT_IMPLEMENTED', 'Parámetro preservado para gobierno, pero todavía sin efecto matemático en el motor V3.')
      : result('NOT_APPLICABLE', 'El parámetro no corresponde al país de esta base.')
  }

  if (section === 'GENERAL_BASE') {
    if (['Tamaño de Flota', 'Periodo de Operación', 'Kilómetros promedio x operador'].includes(field)) {
      return result('REQUIRED', 'Define la capacidad y la distribución de costos fijos de la flota.')
    }
    if (hasMx) return result('REQUIRED', 'El motor México utiliza este dato para costo de ruta o productividad de flota.')
    return result('OPTIONAL', 'Contexto corporativo útil, pero sin efecto directo en el motor USA actual.')
  }

  if (section === 'FUEL') {
    if (field === 'Diesel MX') return hasMx
      ? result('REQUIRED', 'Precio base del combustible consumido en el tramo México.')
      : result('NOT_APPLICABLE', 'La base no contiene operación en México.')
    if (field === 'Diesel US Border') return isCrossBorder || (workbookExact && hasMx)
      ? result('REQUIRED', 'Precio usado en la mezcla de abastecimiento del tramo México cross-border.')
      : result('NOT_APPLICABLE', 'El combustible USA doméstico se captura como dato de la ruta; esta referencia fronteriza no se consume.')
    if (field === 'Fuel Purchase Mix MX' || field === 'Fuel Purchase Mix US') return isCrossBorder || (workbookExact && hasMx)
      ? result('REQUIRED', 'La mezcla MX/US sólo gobierna el abastecimiento D2D cross-border.')
      : result('NOT_APPLICABLE', 'Una operación doméstica no utiliza mezcla de compra fronteriza.')
    if (field === 'Fuel Escalation Buffer') return hasMx
      ? result('REQUIRED', 'Reserva de volatilidad aplicada al combustible del tramo México.')
      : result('NOT_APPLICABLE', 'El motor USA recibe diesel y FSC de la ruta y no consume este buffer.')
    return result('REQUIRED', 'Rendimiento físico utilizado por el motor para millas o kilómetros cargados y vacíos.')
  }

  if (section === 'LABOR') {
    if (field === 'Tarifa Operador MX') return hasMx
      ? result('REQUIRED', 'Costo variable directo del operador en tramos México.')
      : result('NOT_APPLICABLE', 'La base no contiene un tramo México.')
    if (field === 'Tarifa Operador US') return hasUs
      ? result('REQUIRED', 'Costo variable directo del operador en tramos USA.')
      : result('NOT_APPLICABLE', 'La base no contiene un tramo USA.')
    if (field === 'Carga Social') return result('REQUIRED', 'Carga aplicada a la nómina administrativa dentro del costo fijo.')
  }

  if (section === 'FINANCE') {
    if (field === 'Tipo de Cambio') return hasMx
      ? result('REQUIRED', 'Convierte diesel, peajes y costos México a la moneda de cálculo.')
      : result('OPTIONAL', 'Referencia de reporte; una operación USA pura se calcula en USD.')
    if (field === 'Cost of Capital MX') return hasMx || (workbookExact && hasUs)
      ? result('REQUIRED', workbookExact && !hasMx
        ? 'WORKBOOK_V3 conserva históricamente la tasa MX para capital de trabajo USA.'
        : 'Tasa de capital de trabajo para la porción México.')
      : result('NOT_APPLICABLE', 'La base no contiene operación México.')
    if (field === 'Cost of Capital US') return hasUs && !workbookExact
      ? result('REQUIRED', 'Tasa de capital de trabajo para la porción USA bajo el modelo operacional.')
      : hasUs && workbookExact
        ? result('NOT_IMPLEMENTED', 'El catálogo conserva la tasa USA, pero WORKBOOK_V3 utiliza históricamente Cost of Capital MX.')
      : result('NOT_APPLICABLE', 'La base no contiene operación USA.')
    return result('REQUIRED', 'Controla la necesidad y el costo de capital de trabajo de la operación.')
  }

  if (section === 'UTILIZATION') {
    if (DRAYAGE_UTILIZATION.has(field)) return isDrayage
      ? result('REQUIRED', 'Define el ciclo portuario, tiempo comprometido y piso facturable de Drayage.')
      : result('NOT_APPLICABLE', 'Parámetro exclusivo del ciclo Drayage.')
    if (MX_DISTANCE_FLOORS.has(field)) return hasMx && !isDrayage
      ? result('CONDITIONAL', 'Se activa por la distancia real de una ruta México.', 'Local ≤100 km, short-haul ≤300 km o long-haul >300 km.')
      : result('NOT_APPLICABLE', 'El motor de esta modalidad no utiliza pisos de distancia México.')
    if (field === 'Backhaul Deadhead Factor') return hasMx && supports('Backhaul')
      ? result('CONDITIONAL', 'Reduce el reposicionamiento esperado sólo en servicios Backhaul México.', 'Servicio Backhaul.')
      : result('NOT_APPLICABLE', 'La base no habilita Backhaul México.')
    if (field === 'Roundtrip Empty Factor') return hasMx && supports('Roundtrip')
      ? result('CONDITIONAL', 'Modela reposicionamiento residual en servicios Roundtrip México.', 'Servicio Roundtrip.')
      : result('NOT_APPLICABLE', 'La base no habilita Roundtrip México.')
    if (field === 'Tandem Maneuver Hours') return hasMx && usesTandem
      ? result('CONDITIONAL', 'Tiempo adicional de maniobra para segunda caja y dolly.', 'Configuración Tandem.')
      : result('NOT_APPLICABLE', 'La base no habilita Tandem México.')
    if (field === 'Deadhead Base') return isDrayage
      ? result('NOT_APPLICABLE', 'Drayage modela sus piernas vacías con factores portuarios específicos.')
      : result('REQUIRED', 'Reposicionamiento base utilizado cuando no existe señal de mercado más precisa.')
    if (field === 'Load Time' || field === 'Unload Time') return isDrayage
      ? result('NOT_APPLICABLE', 'Drayage usa Port Dwell Hours y Delivery Service Hours.')
      : result('REQUIRED', 'Tiempo directo del ciclo operativo de la ruta.')
  }

  if (section === 'RISK') {
    if (field === 'MX Security Risk Reserve') return hasMx
      ? result('REQUIRED', 'Reserva de seguridad aplicada directamente al costo de producción México.')
      : result('NOT_APPLICABLE', 'La base no contiene operación México.')
    if (field === 'Flatbed Complexity Factor') return hasMx && carries('Flatbed')
      ? result('CONDITIONAL', 'Se aplica directamente cuando la ruta utiliza Flatbed.', 'Equipo Flatbed en un tramo México.')
      : result('NOT_APPLICABLE', 'La base no declara Flatbed en operación México.')
    if (field === 'Config Risk Premium Tandem') return hasMx && usesTandem
      ? result('CONDITIONAL', 'Reserva directa por complejidad de configuración Tandem.', 'Configuración Tandem.')
      : result('NOT_APPLICABLE', 'La base no habilita Tandem México.')
    return result('OPTIONAL', 'Reserva de riesgo configurable; sólo se aplica mediante la condición o factor de la ruta.')
  }

  if (section === 'CONFIG') {
    if (field === 'Tandem CFU Factor') return hasMx && usesTandem && workbookExact
      ? result('CONDITIONAL', 'Compatibilidad histórica exclusiva de WORKBOOK_V3 para Tandem.', 'Configuración Tandem con WORKBOOK_V3.')
      : result('NOT_APPLICABLE', 'Este factor legado sólo corresponde a Tandem bajo WORKBOOK_V3.')
    if (TANDEM_CONFIG.has(field)) return hasMx && usesTandem
      ? result('CONDITIONAL', 'Modificador técnico directo de una configuración Tandem México.', 'Configuración Tandem.')
      : result('NOT_APPLICABLE', 'La base no habilita Tandem México.')
    if (DRAYAGE_CONFIG.has(field)) {
      if (!isDrayage) return result('NOT_APPLICABLE', 'Parámetro exclusivo del ciclo Drayage.')
      if (field === 'Drayage Drop-Off Factor') {
        return result('CONDITIONAL', 'Distancia vacía aplicada cuando el contenedor regresa a un drop-off interior.', 'Retorno del contenedor a drop-off interior.')
      }
      return result('REQUIRED', 'Costo o factor físico directo del ciclo Drayage.')
    }
  }

  if (section === 'TECHNICAL_MARGIN') {
    if (field === 'UT Rate One Way') return supports('One Way') || supports('Expedited')
      ? profile.services.length === 1
        ? result('REQUIRED', 'Margen técnico del único servicio One Way o Expedited habilitado.')
        : result('CONDITIONAL', 'Margen técnico de servicios One Way y Expedited.', 'Servicio One Way o Expedited.')
      : result('NOT_APPLICABLE', 'La base no habilita servicios One Way ni Expedited.')
    if (field === 'UT Rate Backhaul') return supports('Backhaul')
      ? result('CONDITIONAL', 'Margen técnico utilizado por servicios Backhaul.', 'Servicio Backhaul.')
      : result('NOT_APPLICABLE', 'La base no habilita Backhaul.')
    if (field === 'UT Rate Roundtrip') return supports('Roundtrip')
      ? result('CONDITIONAL', 'Margen técnico utilizado por servicios Roundtrip.', 'Servicio Roundtrip.')
      : result('NOT_APPLICABLE', 'La base no habilita Roundtrip.')
    if (field === 'Rate Rounding MEX USD') return hasMx
      ? result('REQUIRED', 'Granularidad de redondeo para la tarifa del tramo México.')
      : result('NOT_APPLICABLE', 'La base no contiene tramo México.')
    if (field === 'Rate Rounding USA USD') return hasUs
      ? result('REQUIRED', 'Granularidad de redondeo para la tarifa del tramo USA.')
      : result('NOT_APPLICABLE', 'La base no contiene tramo USA.')
    return result('REQUIRED', 'Define los pisos y objetivos comerciales derivados del costo de producción.')
  }

  if (section === 'COST_MAINT') return result('REQUIRED', 'Costo variable directo de mantenimiento del tracto.')
  if (section === 'COST_TIRES') {
    if (TRAILER_TIRE_TERM.has(field) && workbookExact) {
      return result('REQUIRED', 'WORKBOOK_V3 conserva el término histórico de llantas de remolque sin discriminar el equipo de la ruta.')
    }
    if (TRAILER_TIRE_TERM.has(field) && !hasOwnedTrailer) {
      return result('NOT_APPLICABLE', 'Chassis y Power Only no cargan neumáticos de un remolque propiedad del carrier.')
    }
    if (TRAILER_TIRE_TERM.has(field) && hasNonOwnedTrailer) {
      return result('CONDITIONAL', 'Este término sólo entra cuando la ruta usa un remolque aportado por el carrier.', 'Remolque distinto de Chassis o Power Only.')
    }
    return result('REQUIRED', 'Costo variable directo de neumáticos del equipo habilitado.')
  }
  if (section === 'COST_INSURANCE') return result('REQUIRED', 'Costo fijo directo de asegurar la flota operativa.')
  if (section === 'COST_PAYROLL') return result('REQUIRED', 'Nómina administrativa distribuida dentro del costo fijo mensual.')
  if (section === 'COST_COMPANY') return result('REQUIRED', 'Gasto corporativo distribuido dentro del costo fijo mensual.')
  if (section === 'COST_CAPITAL') {
    if (TRAILER_CAPITAL.has(field) && workbookExact) {
      return result('REQUIRED', 'WORKBOOK_V3 conserva históricamente el activo de remolque dentro del costo fijo.')
    }
    if (TRAILER_CAPITAL.has(field) && !hasOwnedTrailer) {
      return result('NOT_APPLICABLE', 'Chassis y Power Only no capitalizan un remolque propiedad del carrier.')
    }
    if (TRAILER_CAPITAL.has(field) && hasNonOwnedTrailer) {
      return result('CONDITIONAL', 'El activo sólo se asigna cuando la ruta usa un remolque aportado por el carrier.', 'Remolque distinto de Chassis o Power Only.')
    }
    if (DOLLY_CAPITAL.has(field) && workbookExact) {
      return result('REQUIRED', 'WORKBOOK_V3 conserva históricamente el activo Dolly dentro del costo fijo aun fuera de Tandem.')
    }
    if (DOLLY_CAPITAL.has(field)) return usesTandem
      ? result('CONDITIONAL', 'Activo utilizado únicamente en configuración Tandem.', 'Configuración Tandem.')
      : result('NOT_APPLICABLE', 'La base no habilita configuración Tandem.')
    return result('REQUIRED', 'Capital, depreciación o financiamiento directo del equipo habilitado.')
  }

  return result('OPTIONAL', 'Referencia canónica conservada para trazabilidad; no tiene consumo directo en el motor operacional actual.')
}

export function applicabilitySummary(
  scope: CostBaseScope,
  definitions: readonly ParameterDefinition[] = PARAMETER_DEFINITIONS,
  profileValue?: unknown,
) {
  const profile = resolvedProfile(scope, profileValue)
  const counts: Record<ParameterApplicability, number> = {
    REQUIRED: 0,
    OPTIONAL: 0,
    CONDITIONAL: 0,
    NOT_IMPLEMENTED: 0,
    NOT_APPLICABLE: 0,
  }
  for (const definition of definitions) counts[parameterApplicability(scope, definition, profile).applicability] += 1
  return {
    scope,
    profile,
    counts,
    border: scope === 'CROSS_BORDER' ? 'REQUIRED' as const : 'NOT_APPLICABLE' as const,
    catalogTotal: definitions.length,
  }
}

export function isParameterApplicable(
  scope: CostBaseScope,
  parameter: Pick<ParameterDefinition, 'section' | 'field'>,
  profileValue?: unknown,
) {
  return parameterApplicability(scope, parameter, profileValue).applicability !== 'NOT_APPLICABLE'
}

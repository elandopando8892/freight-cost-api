export type CostBaseScope = 'CROSS_BORDER' | 'DRAYAGE' | 'LOCAL' | 'INTRA_MEX' | 'INTRA_US'
export type Policy = 'OPERATIONAL_V3' | 'WORKBOOK_V3'
export type CostBaseCountry = 'MX' | 'US'
export type CostBaseOperation =
  | 'D2D Export'
  | 'D2D Import'
  | 'Drayage'
  | 'Local'
  | 'Intra-Mex'
  | 'MX Northbound'
  | 'MX Southbound'
  | 'Intra-US'
  | 'US Northbound'
  | 'US Southbound'
export type CostBaseTruck = 'Truck Trailer' | 'Thorton' | 'Rabon' | '3.5 tons' | '1.5 tons'
export type CostBaseDriver = 'B1' | 'Licencia E' | 'Interstate' | 'Intrastate' | 'CDL'
export type CostBaseTrailer = 'Dry Van' | 'Flatbed' | 'Reefer' | 'Hazmat' | 'Chassis' | 'Power Only' | 'Overdim'
export type CostBaseConfiguration = 'Single' | 'Tandem'
export type CostBaseService = 'One Way' | 'Roundtrip' | 'Backhaul' | 'Expedited'
export type CostBaseOwnership = 'OWNED_FINANCED' | 'LEASED' | 'BROKERED'
export type CostBaseBorderProcess = 'THROUGH_TRACTOR' | 'YARD_TRANSFER' | 'PARTNER_HANDOFF'

export type ApplicabilityStatus =
  | 'REQUIRED'
  | 'OPTIONAL'
  | 'CONDITIONAL'
  | 'NOT_IMPLEMENTED'
  | 'NOT_APPLICABLE'

export type CostBaseProfile = {
  schemaVersion: 'FCM_APPLICABILITY_V1'
  factorScheduleVersion: 'FCM_V3_FACTORS_2026_1'
  scope: CostBaseScope
  calculationPolicy: Policy
  countries: CostBaseCountry[]
  operations: CostBaseOperation[]
  truckTypes: CostBaseTruck[]
  driverTypes: CostBaseDriver[]
  trailerTypes: CostBaseTrailer[]
  configurations: CostBaseConfiguration[]
  services: CostBaseService[]
  ownershipModels: CostBaseOwnership[]
  costAllocationModel: 'FULL_FLEET'
  borderProcess: CostBaseBorderProcess | null
}

export type ApplicabilitySummary = {
  scope: CostBaseScope
  profile: CostBaseProfile
  counts: Record<ApplicabilityStatus, number>
  border: 'REQUIRED' | 'NOT_APPLICABLE'
  catalogTotal: number
}

export const TRAILER_OPTIONS: ReadonlyArray<{ value: CostBaseTrailer; label: string; description: string }> = [
  { value: 'Dry Van', label: 'Caja seca', description: 'Carga general en remolque cerrado.' },
  { value: 'Flatbed', label: 'Plataforma', description: 'Activa factores de complejidad de plataforma.' },
  { value: 'Reefer', label: 'Refrigerado', description: 'Habilita cotizaciones con factor Reefer.' },
  { value: 'Hazmat', label: 'Hazmat', description: 'Habilita cotizaciones de materiales regulados.' },
  { value: 'Power Only', label: 'Power Only', description: 'Sólo tracto; el remolque lo aporta el cliente.' },
  { value: 'Overdim', label: 'Sobredimensionado', description: 'Habilita el factor de carga sobredimensionada.' },
]

export const CONFIGURATION_OPTIONS: ReadonlyArray<{ value: CostBaseConfiguration; label: string }> = [
  { value: 'Single', label: 'Sencillo' },
  { value: 'Tandem', label: 'Tándem' },
]

export const DRIVER_OPTIONS: ReadonlyArray<{ value: CostBaseDriver; label: string; description: string }> = [
  { value: 'B1', label: 'B1', description: 'Operador mexicano con factor técnico B1.' },
  { value: 'Licencia E', label: 'Licencia E', description: 'Operador mexicano con licencia federal E.' },
  { value: 'Interstate', label: 'Interstate', description: 'Operador habilitado para comercio interestatal en EE. UU.' },
  { value: 'Intrastate', label: 'Intrastate', description: 'Operador limitado a operación dentro de un estado.' },
  { value: 'CDL', label: 'CDL', description: 'Operador con licencia comercial estadounidense.' },
]

export const SERVICE_OPTIONS: ReadonlyArray<{ value: CostBaseService; label: string }> = [
  { value: 'One Way', label: 'Sencillo / One Way' },
  { value: 'Roundtrip', label: 'Roundtrip' },
  { value: 'Backhaul', label: 'Backhaul' },
  { value: 'Expedited', label: 'Expedited' },
]

export function defaultProfile(scope: CostBaseScope, calculationPolicy: Policy = 'OPERATIONAL_V3'): CostBaseProfile {
  const common = {
    schemaVersion: 'FCM_APPLICABILITY_V1' as const,
    factorScheduleVersion: 'FCM_V3_FACTORS_2026_1' as const,
    scope,
    calculationPolicy,
    truckTypes: ['Truck Trailer'] as CostBaseTruck[],
    driverTypes: ['B1', 'Licencia E'] as CostBaseDriver[],
    trailerTypes: ['Dry Van'] as CostBaseTrailer[],
    configurations: ['Single'] as CostBaseConfiguration[],
    services: ['One Way'] as CostBaseService[],
    ownershipModels: ['OWNED_FINANCED'] as CostBaseOwnership[],
    costAllocationModel: 'FULL_FLEET' as const,
    borderProcess: null as CostBaseBorderProcess | null,
  }

  switch (scope) {
    case 'CROSS_BORDER':
      return {
        ...common,
        countries: ['MX', 'US'],
        operations: ['D2D Export', 'D2D Import'],
        driverTypes: ['B1', 'Licencia E', 'Interstate', 'Intrastate', 'CDL'],
        services: ['One Way', 'Roundtrip', 'Backhaul'],
        borderProcess: 'THROUGH_TRACTOR',
      }
    case 'INTRA_MEX':
      return {
        ...common,
        countries: ['MX'],
        operations: ['Intra-Mex', 'MX Northbound', 'MX Southbound'],
        services: ['One Way', 'Roundtrip', 'Backhaul'],
      }
    case 'INTRA_US':
      return {
        ...common,
        countries: ['US'],
        operations: ['Intra-US', 'US Northbound', 'US Southbound'],
        driverTypes: ['Interstate', 'Intrastate', 'CDL'],
        services: ['One Way', 'Roundtrip', 'Backhaul'],
      }
    case 'DRAYAGE':
      return {
        ...common,
        countries: ['US'],
        operations: ['Drayage'],
        driverTypes: ['Interstate', 'Intrastate', 'CDL'],
        trailerTypes: ['Chassis'],
        services: ['One Way'],
      }
    case 'LOCAL':
      return {
        ...common,
        countries: ['MX'],
        operations: ['Local'],
        services: ['One Way', 'Roundtrip'],
      }
  }
}

export function profileForPolicy(profile: CostBaseProfile, calculationPolicy: Policy): CostBaseProfile {
  return { ...profile, calculationPolicy }
}

export function toggleProfileValue<T extends string>(values: readonly T[], value: T): T[] {
  if (values.includes(value)) {
    return values.length === 1 ? [...values] : values.filter((item) => item !== value)
  }
  return [...values, value]
}

export function availableTrailers(scope: CostBaseScope): ReadonlyArray<{ value: CostBaseTrailer; label: string; description: string }> {
  if (scope === 'DRAYAGE') {
    return [{ value: 'Chassis', label: 'Chasis', description: 'Equipo obligatorio para el ciclo Drayage V3.' }]
  }
  return TRAILER_OPTIONS
}

export function availableConfigurations(profile: CostBaseProfile) {
  return CONFIGURATION_OPTIONS.map((option) => ({
    ...option,
    disabled: option.value === 'Tandem' && !profile.countries.includes('MX'),
  }))
}

export function availableServices(scope: CostBaseScope) {
  return SERVICE_OPTIONS.map((option) => ({
    ...option,
    disabled: scope === 'DRAYAGE' && option.value !== 'One Way',
  }))
}

export function availableDrivers(profile: CostBaseProfile) {
  return DRIVER_OPTIONS.map((option) => ({
    ...option,
    disabled: profile.countries.length === 1
      && (profile.countries[0] === 'MX'
        ? option.value === 'Interstate' || option.value === 'Intrastate' || option.value === 'CDL'
        : option.value === 'B1' || option.value === 'Licencia E'),
  }))
}

function sameMembers<T extends string>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length && left.every((item) => right.includes(item))
}

export function profileConsistencyMessages(
  profile: CostBaseProfile | null,
  expectedScope?: CostBaseScope | null,
  expectedPolicy?: Policy,
): string[] {
  if (!profile) return ['Falta definir el perfil operativo de la base.']
  const messages: string[] = []
  const derived = defaultProfile(profile.scope, profile.calculationPolicy)
  if (profile.factorScheduleVersion !== 'FCM_V3_FACTORS_2026_1') messages.push('El programa de factores no corresponde al contrato matemático soportado.')
  if (expectedScope && profile.scope !== expectedScope) messages.push('El alcance del perfil no corresponde al alcance de la base.')
  if (expectedPolicy && profile.calculationPolicy !== expectedPolicy) messages.push('El modelo de cálculo del perfil no corresponde al modelo de la base.')
  if (!sameMembers(profile.countries, derived.countries)) messages.push('Los países no corresponden al alcance seleccionado.')
  if (!sameMembers(profile.operations, derived.operations)) messages.push('Las operaciones no corresponden al alcance seleccionado.')
  if (profile.scope === 'CROSS_BORDER' && profile.borderProcess !== 'THROUGH_TRACTOR') {
    messages.push('El motor V3 sólo soporta cruce con el mismo tractor.')
  }
  if (profile.scope !== 'CROSS_BORDER' && profile.borderProcess !== null) {
    messages.push('El proceso de cruce sólo corresponde a una base D2D cross-border.')
  }
  if (profile.truckTypes.length !== 1 || profile.truckTypes[0] !== 'Truck Trailer') {
    messages.push('El motor gobernado V3 sólo soporta tractocamión (Truck Trailer).')
  }
  if (profile.ownershipModels.length !== 1 || profile.ownershipModels[0] !== 'OWNED_FINANCED') {
    messages.push('Arrendado y subcontratado requieren modelos matemáticos propios; por ahora usa flota propia/financiada.')
  }
  if (profile.driverTypes.length === 0) messages.push('Selecciona al menos un tipo de operador.')
  if (new Set(profile.driverTypes).size !== profile.driverTypes.length) messages.push('No repitas tipos de operador.')
  if (profile.countries.length === 1 && profile.countries[0] === 'MX' && profile.driverTypes.some((driver) => driver === 'Interstate' || driver === 'Intrastate' || driver === 'CDL')) {
    messages.push('Una base exclusivamente mexicana sólo puede habilitar operadores B1 o Licencia E.')
  }
  if (profile.countries.length === 1 && profile.countries[0] === 'US' && profile.driverTypes.some((driver) => driver === 'B1' || driver === 'Licencia E')) {
    messages.push('Una base exclusivamente estadounidense sólo puede habilitar operadores Interstate, Intrastate o CDL.')
  }
  if (profile.trailerTypes.length === 0) messages.push('Selecciona al menos un tipo de remolque.')
  if (new Set(profile.trailerTypes).size !== profile.trailerTypes.length) messages.push('No repitas tipos de remolque.')
  if (profile.configurations.length === 0) messages.push('Selecciona al menos una configuración.')
  if (new Set(profile.configurations).size !== profile.configurations.length) messages.push('No repitas configuraciones.')
  if (profile.services.length === 0) messages.push('Selecciona al menos un servicio.')
  if (new Set(profile.services).size !== profile.services.length) messages.push('No repitas servicios.')
  if (profile.scope === 'DRAYAGE' && (profile.trailerTypes.length !== 1 || profile.trailerTypes[0] !== 'Chassis')) {
    messages.push('Drayage requiere Chasis como capacidad exclusiva.')
  }
  if (profile.scope !== 'DRAYAGE' && profile.trailerTypes.includes('Chassis')) {
    messages.push('Chasis sólo puede habilitarse en una base Drayage.')
  }
  if (profile.scope === 'DRAYAGE' && (profile.services.length !== 1 || profile.services[0] !== 'One Way')) {
    messages.push('Drayage se gobierna como One Way; el retorno del contenedor forma parte del ciclo.')
  }
  if (!profile.countries.includes('MX') && profile.configurations.includes('Tandem')) {
    messages.push('Tándem sólo está soportado en operaciones con tramo México.')
  }
  return messages
}

import type { CalculationPolicy, CostBaseScope } from '@prisma/client'
import { z } from 'zod'

export const COST_BASE_PROFILE_VERSION = 'FCM_APPLICABILITY_V1' as const
export const COST_BASE_FACTOR_SCHEDULE_VERSION = 'FCM_V3_FACTORS_2026_1' as const

export const CostBaseCountrySchema = z.enum(['MX', 'US'])
export const CostBaseOperationSchema = z.enum([
  'D2D Export', 'D2D Import', 'Drayage', 'Local', 'Intra-Mex',
  'MX Northbound', 'MX Southbound', 'Intra-US', 'US Northbound', 'US Southbound',
])
export const CostBaseTruckSchema = z.enum(['Truck Trailer', 'Thorton', 'Rabon', '3.5 tons', '1.5 tons'])
export const CostBaseDriverSchema = z.enum(['B1', 'Licencia E', 'Interstate', 'Intrastate', 'CDL'])
export const CostBaseTrailerSchema = z.enum(['Dry Van', 'Flatbed', 'Reefer', 'Hazmat', 'Chassis', 'Power Only', 'Overdim'])
export const CostBaseConfigurationSchema = z.enum(['Single', 'Tandem'])
export const CostBaseServiceSchema = z.enum(['One Way', 'Roundtrip', 'Backhaul', 'Expedited'])
export const CostBaseOwnershipSchema = z.enum(['OWNED_FINANCED', 'LEASED', 'BROKERED'])
export const CostBaseProfilePolicySchema = z.enum(['OPERATIONAL_V3', 'WORKBOOK_V3'])
export const CostBaseBorderProcessSchema = z.enum(['THROUGH_TRACTOR', 'YARD_TRANSFER', 'PARTNER_HANDOFF'])

const unique = <T>(values: readonly T[]) => new Set(values).size === values.length

export const CostBaseProfileSchema = z.object({
  schemaVersion: z.literal(COST_BASE_PROFILE_VERSION),
  factorScheduleVersion: z.literal(COST_BASE_FACTOR_SCHEDULE_VERSION),
  scope: z.enum(['CROSS_BORDER', 'DRAYAGE', 'LOCAL', 'INTRA_MEX', 'INTRA_US']),
  calculationPolicy: CostBaseProfilePolicySchema,
  countries: z.array(CostBaseCountrySchema).min(1).max(2),
  operations: z.array(CostBaseOperationSchema).min(1).max(10),
  truckTypes: z.array(CostBaseTruckSchema).min(1).max(5),
  driverTypes: z.array(CostBaseDriverSchema).min(1).max(5),
  trailerTypes: z.array(CostBaseTrailerSchema).min(1).max(7),
  configurations: z.array(CostBaseConfigurationSchema).min(1).max(2),
  services: z.array(CostBaseServiceSchema).min(1).max(4),
  ownershipModels: z.array(CostBaseOwnershipSchema).min(1).max(3),
  costAllocationModel: z.literal('FULL_FLEET'),
  borderProcess: CostBaseBorderProcessSchema.nullable(),
}).strict().superRefine((profile, context) => {
  for (const [field, values] of Object.entries({
    countries: profile.countries,
    operations: profile.operations,
    truckTypes: profile.truckTypes,
    driverTypes: profile.driverTypes,
    trailerTypes: profile.trailerTypes,
    configurations: profile.configurations,
    services: profile.services,
    ownershipModels: profile.ownershipModels,
  })) {
    if (!unique(values)) context.addIssue({ code: 'custom', path: [field], message: `${field} cannot contain duplicates.` })
  }
})

export type CostBaseProfile = z.infer<typeof CostBaseProfileSchema>

export function defaultCostBaseProfile(
  scope: CostBaseScope,
  calculationPolicy: CalculationPolicy = 'OPERATIONAL_V3',
): CostBaseProfile {
  const common = {
    schemaVersion: COST_BASE_PROFILE_VERSION,
    factorScheduleVersion: COST_BASE_FACTOR_SCHEDULE_VERSION,
    scope,
    calculationPolicy: calculationPolicy === 'WORKBOOK_V3' ? 'WORKBOOK_V3' as const : 'OPERATIONAL_V3' as const,
    truckTypes: ['Truck Trailer'] as CostBaseProfile['truckTypes'],
    driverTypes: ['B1', 'Licencia E'] as CostBaseProfile['driverTypes'],
    trailerTypes: ['Dry Van'] as CostBaseProfile['trailerTypes'],
    configurations: ['Single'] as CostBaseProfile['configurations'],
    services: ['One Way'] as CostBaseProfile['services'],
    ownershipModels: ['OWNED_FINANCED'] as CostBaseProfile['ownershipModels'],
    costAllocationModel: 'FULL_FLEET' as const,
    borderProcess: null,
  }
  switch (scope) {
    case 'CROSS_BORDER':
      return { ...common, countries: ['MX', 'US'], operations: ['D2D Export', 'D2D Import'], driverTypes: ['B1', 'Licencia E', 'Interstate', 'Intrastate', 'CDL'], services: ['One Way', 'Roundtrip', 'Backhaul'], borderProcess: 'THROUGH_TRACTOR' }
    case 'INTRA_MEX':
      return { ...common, countries: ['MX'], operations: ['Intra-Mex', 'MX Northbound', 'MX Southbound'], services: ['One Way', 'Roundtrip', 'Backhaul'] }
    case 'INTRA_US':
      return { ...common, countries: ['US'], operations: ['Intra-US', 'US Northbound', 'US Southbound'], driverTypes: ['Interstate', 'Intrastate', 'CDL'], services: ['One Way', 'Roundtrip', 'Backhaul'] }
    case 'DRAYAGE':
      return { ...common, countries: ['US'], operations: ['Drayage'], driverTypes: ['Interstate', 'Intrastate', 'CDL'], trailerTypes: ['Chassis'], services: ['One Way'] }
    case 'LOCAL':
      return { ...common, countries: ['MX'], operations: ['Local'], services: ['One Way', 'Roundtrip'] }
  }
}

/**
 * Compatibility envelope for versions created before applicability profiles
 * existed. It deliberately mirrors the broad choices the old UI accepted so
 * introducing the contract cannot make an already-governed route unusable.
 * This value is never persisted automatically; the next draft must be reviewed
 * and saved as an explicit, supported profile.
 */
export function legacyCostBaseProfile(
  scope: CostBaseScope,
  calculationPolicy: CalculationPolicy = 'OPERATIONAL_V3',
): CostBaseProfile {
  const profile = defaultCostBaseProfile(scope, calculationPolicy)
  return {
    ...profile,
    truckTypes: ['Truck Trailer', 'Thorton', 'Rabon', '3.5 tons', '1.5 tons'],
    driverTypes: ['B1', 'Licencia E', 'Interstate', 'Intrastate', 'CDL'],
    trailerTypes: scope === 'DRAYAGE'
      ? ['Dry Van', 'Flatbed', 'Reefer', 'Hazmat', 'Chassis', 'Power Only', 'Overdim']
      : ['Dry Van', 'Flatbed', 'Reefer', 'Hazmat', 'Power Only', 'Overdim'],
    configurations: ['Single', 'Tandem'],
    services: ['One Way', 'Roundtrip', 'Backhaul', 'Expedited'],
  }
}

const OPERATIONS_BY_SCOPE: Record<CostBaseScope, ReadonlySet<CostBaseProfile['operations'][number]>> = {
  CROSS_BORDER: new Set(['D2D Export', 'D2D Import']),
  DRAYAGE: new Set(['Drayage']),
  LOCAL: new Set(['Local']),
  INTRA_MEX: new Set(['Intra-Mex', 'MX Northbound', 'MX Southbound']),
  INTRA_US: new Set(['Intra-US', 'US Northbound', 'US Southbound']),
}

export function profileConsistencyIssues(
  scope: CostBaseScope,
  profile: CostBaseProfile,
  calculationPolicy?: CalculationPolicy,
): string[] {
  const issues: string[] = []
  const countries = new Set(profile.countries)
  if (profile.scope !== scope) issues.push(`El perfil ${profile.scope} no corresponde al alcance ${scope}.`)
  if (calculationPolicy && profile.calculationPolicy !== calculationPolicy) {
    issues.push(`La política ${profile.calculationPolicy} del perfil no corresponde a ${calculationPolicy}.`)
  }
  const expectedOperations = OPERATIONS_BY_SCOPE[scope]
  if (
    profile.operations.length !== expectedOperations.size ||
    profile.operations.some((operation) => !expectedOperations.has(operation))
  ) {
    issues.push('El perfil debe conservar todas y solo las operaciones canónicas de su alcance.')
  }
  if (scope === 'CROSS_BORDER' && !(countries.has('MX') && countries.has('US'))) {
    issues.push('D2D cross-border requiere operación tanto en México como en EE. UU.')
  }
  if (scope === 'CROSS_BORDER' && !profile.borderProcess) issues.push('D2D cross-border requiere definir el modelo de cruce.')
  if (scope === 'CROSS_BORDER' && profile.borderProcess !== 'THROUGH_TRACTOR') {
    issues.push('YARD_TRANSFER y PARTNER_HANDOFF necesitan un modelo de costos de terceros; la versión V3 sólo soporta THROUGH_TRACTOR.')
  }
  if (scope !== 'CROSS_BORDER' && profile.borderProcess) issues.push('El modelo de cruce sólo corresponde a D2D cross-border.')
  if (scope === 'INTRA_MEX' && (profile.countries.length !== 1 || !countries.has('MX'))) {
    issues.push('FTL Intra-México sólo puede utilizar parámetros de México.')
  }
  if (scope === 'INTRA_US' && (profile.countries.length !== 1 || !countries.has('US'))) {
    issues.push('FTL Intra-EE. UU. sólo puede utilizar parámetros de EE. UU.')
  }
  if (scope === 'LOCAL' && (profile.countries.length !== 1 || !countries.has('MX'))) {
    issues.push('El motor Local V3 soporta actualmente una operación México.')
  }
  if (scope === 'DRAYAGE' && (profile.countries.length !== 1 || !countries.has('US'))) {
    issues.push('El motor Drayage V3 soporta actualmente una operación USA.')
  }
  if (profile.countries.length === 1 && countries.has('MX') && profile.driverTypes.some((driver) => driver === 'Interstate' || driver === 'Intrastate' || driver === 'CDL')) {
    issues.push('Una base exclusivamente mexicana sólo puede habilitar operadores B1 o Licencia E.')
  }
  if (profile.countries.length === 1 && countries.has('US') && profile.driverTypes.some((driver) => driver === 'B1' || driver === 'Licencia E')) {
    issues.push('Una base exclusivamente estadounidense sólo puede habilitar operadores Interstate, Intrastate o CDL.')
  }
  const hasChassis = profile.trailerTypes.includes('Chassis')
  if (scope === 'DRAYAGE' && (profile.trailerTypes.length !== 1 || !hasChassis)) {
    issues.push('Drayage V3 requiere Chassis como único tipo de remolque; otros equipos necesitan otro perfil de costos.')
  }
  if (scope !== 'DRAYAGE' && hasChassis) issues.push('Chassis sólo puede seleccionarse en una base Drayage.')
  if (scope === 'DRAYAGE' && profile.services.some((service) => service !== 'One Way')) {
    issues.push('El ciclo Drayage se gobierna como One Way; el retorno del contenedor se modela dentro del ciclo.')
  }
  if (profile.configurations.includes('Tandem') && !countries.has('MX')) {
    issues.push('El modelo Tandem actual sólo está soportado en operaciones con tramo México.')
  }
  if (profile.ownershipModels.some((ownership) => ownership !== 'OWNED_FINANCED')) {
    issues.push('LEASED y BROKERED aún no tienen un modelo matemático compatible; usa OWNED_FINANCED.')
  }
  if (profile.truckTypes.some((truck) => truck !== 'Truck Trailer')) {
    issues.push('Las bases gobernadas V3 sólo soportan Truck Trailer hasta incorporar costos de capital específicos por vehículo.')
  }
  return issues
}

export function parseCostBaseProfile(
  scope: CostBaseScope,
  value: unknown,
  calculationPolicy?: CalculationPolicy,
): CostBaseProfile {
  if (value == null) return legacyCostBaseProfile(scope, calculationPolicy)
  const parsed = CostBaseProfileSchema.parse(value)
  const issues = profileConsistencyIssues(scope, parsed, calculationPolicy)
  if (issues.length > 0) throw new Error(`Invalid cost-base applicability profile: ${issues.join(' ')}`)
  return parsed
}

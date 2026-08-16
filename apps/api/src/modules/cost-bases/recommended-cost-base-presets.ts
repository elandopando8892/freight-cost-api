import type { CalculationPolicy, CostBaseScope } from '@prisma/client'
import { applicabilitySummary } from './cost-base-applicability.js'
import { defaultCostBaseProfile, type CostBaseProfile } from './cost-base-profile.js'

export const RECOMMENDED_COST_BASE_PRESET_VERSION = 'FCM_STANDARD_2026_1'

export type RecommendedCostBasePreset = {
  id: string
  version: string
  label: string
  name: string
  code: string
  description: string
  scope: CostBaseScope
  defaultPolicy: CalculationPolicy
  currency: string
  isDefault: boolean
  assumptionOverrides: []
  applicabilityProfile: CostBaseProfile
  rationale: string[]
  applicability: ReturnType<typeof applicabilitySummary>
}

type PresetDefinition = Omit<RecommendedCostBasePreset, 'version' | 'isDefault' | 'assumptionOverrides' | 'applicability' | 'applicabilityProfile'>

const DEFINITIONS: readonly PresetDefinition[] = [
  {
    id: 'std-d2d-crossborder-v1',
    label: 'D2D MX–US Standard',
    name: 'D2D Cross-border Estándar',
    code: 'STD-XB',
    description: 'Punto de partida para movimientos FTL puerta a puerta entre México y EE. UU. con tractocamión propio, caja seca y cruce through-tractor.',
    scope: 'CROSS_BORDER',
    defaultPolicy: 'OPERATIONAL_V3',
    currency: 'USD',
    rationale: [
      'Incluye la revisión obligatoria de Border y COST_CROSSBORDER.',
      'Carga los valores recomendados del catálogo canónico V3.0.',
      'Habilita One Way, Roundtrip y Backhaul; equipo y acuerdos reales deben confirmarse.',
    ],
  },
  {
    id: 'std-ftl-intra-mex-v1',
    label: 'FTL Intra-México',
    name: 'FTL Intra-México Estándar',
    code: 'STD-MX',
    description: 'Punto de partida para rutas FTL domésticas en México con tractocamión propio, caja seca y configuración Single.',
    scope: 'INTRA_MEX',
    defaultPolicy: 'OPERATIONAL_V3',
    currency: 'MXN',
    rationale: [
      'Border y COST_CROSSBORDER quedan marcados como No aplica.',
      'Carga los valores recomendados del catálogo canónico V3.0.',
      'Permite ajustar combustible, utilización, nómina y estructura propia.',
    ],
  },
  {
    id: 'std-ftl-intra-us-v1',
    label: 'FTL Intra-EE. UU.',
    name: 'FTL Intra-EE. UU. Estándar',
    code: 'STD-US',
    description: 'Punto de partida para rutas FTL domésticas en EE. UU. con tractocamión propio, caja seca y configuración Single.',
    scope: 'INTRA_US',
    defaultPolicy: 'OPERATIONAL_V3',
    currency: 'USD',
    rationale: [
      'Border y COST_CROSSBORDER quedan marcados como No aplica.',
      'Carga los valores recomendados del catálogo canónico V3.0.',
      'Debe calibrarse con combustible, utilización y costos del operador.',
    ],
  },
  {
    id: 'std-drayage-us-v1',
    label: 'Drayage US',
    name: 'Drayage US Estándar',
    code: 'STD-DRY',
    description: 'Punto de partida para ciclos portuarios o intermodales en EE. UU. con tractor propio y chasis; no se modela como D2D fronterizo.',
    scope: 'DRAYAGE',
    defaultPolicy: 'OPERATIONAL_V3',
    currency: 'USD',
    rationale: [
      'Border y COST_CROSSBORDER quedan marcados como No aplica.',
      'Carga los valores recomendados del catálogo canónico V3.0.',
      'Debe adaptarse a turn times, chasis, demoras y patrón de utilización.',
    ],
  },
  {
    id: 'std-local-mx-v1',
    label: 'Local México',
    name: 'Operación Local México Estándar',
    code: 'STD-LOC',
    description: 'Punto de partida para movimientos locales en México con tractocamión propio y caja seca. Vehículos menores requieren todavía tarjetas de activo específicas.',
    scope: 'LOCAL',
    defaultPolicy: 'OPERATIONAL_V3',
    currency: 'MXN',
    rationale: [
      'Border y COST_CROSSBORDER quedan marcados como No aplica.',
      'Carga los valores recomendados del catálogo canónico V3.0.',
      'Debe adaptarse a jornadas, viajes por día, esperas y costos urbanos.',
    ],
  },
] as const

/**
 * Presets are immutable product recommendations, not tenant records or market
 * truth. Applying one only prepares an editable draft; the user still confirms
 * the cost base and later governs its assumption versions.
 */
export function listRecommendedCostBasePresets(): RecommendedCostBasePreset[] {
  return DEFINITIONS.map((definition) => {
    const applicabilityProfile = defaultCostBaseProfile(definition.scope, definition.defaultPolicy)
    return {
      ...definition,
      version: RECOMMENDED_COST_BASE_PRESET_VERSION,
      isDefault: true,
      assumptionOverrides: [],
      applicabilityProfile,
      applicability: applicabilitySummary(definition.scope, undefined, applicabilityProfile),
    }
  })
}

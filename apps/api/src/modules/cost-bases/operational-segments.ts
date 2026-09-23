import type { CostBaseScope } from '@prisma/client'
import { z } from 'zod'

export const OperationalSegmentSchema = z.enum([
  'D2D_BINATIONAL_OWN', 'D2D_MX_US_PARTNER', 'D2D_US_MX_PARTNER',
  'D2D_TRANSSHIPMENT', 'MX_DRAYAGE', 'INTRA_MEX', 'MX_LOCAL',
  'INTRA_US', 'US_DRAYAGE',
])
export type OperationalSegment = z.infer<typeof OperationalSegmentSchema>

export type OperationalSegmentOption = {
  id: OperationalSegment
  label: string
  scope: CostBaseScope
  status: 'CONFIGURABLE' | 'MODEL_PENDING'
  presetId: string | null
  detail: string
}

// The status describes what V3 can calculate today, not whether an operator
// may eventually perform the movement. Keep unsupported cases visible.
export const OPERATIONAL_SEGMENTS: readonly OperationalSegmentOption[] = [
  { id: 'D2D_BINATIONAL_OWN', label: 'D2D · operación propia en MX y EE. UU.', scope: 'CROSS_BORDER', status: 'CONFIGURABLE', presetId: 'std-d2d-crossborder-v1', detail: 'Ambos tramos usan costos operativos propios y el cruce es through-tractor. Confirma qué entidad soporta cada costo antes de publicar.' },
  { id: 'D2D_MX_US_PARTNER', label: 'D2D · línea mexicana entrega a socio estadounidense', scope: 'CROSS_BORDER', status: 'MODEL_PENDING', presetId: null, detail: 'Falta capturar la tarifa y condiciones de la línea estadounidense, punto de intercambio y responsabilidad de cada tramo.' },
  { id: 'D2D_US_MX_PARTNER', label: 'D2D · línea estadounidense entrega a socio mexicano', scope: 'CROSS_BORDER', status: 'MODEL_PENDING', presetId: null, detail: 'Falta capturar la tarifa y condiciones de la línea mexicana, punto de intercambio y responsabilidad de cada tramo.' },
  { id: 'D2D_TRANSSHIPMENT', label: 'D2D · transbordo de carga', scope: 'CROSS_BORDER', status: 'MODEL_PENDING', presetId: null, detail: 'Falta modelar maniobras, almacén, tiempos y riesgos del transbordo; no equivale al cruce con el mismo tractor.' },
  { id: 'MX_DRAYAGE', label: 'Drayage México', scope: 'DRAYAGE', status: 'MODEL_PENDING', presetId: null, detail: 'El ciclo Drayage V3 usa geografía, operador y costos de EE. UU.; requiere un ciclo mexicano propio.' },
  { id: 'INTRA_MEX', label: 'FTL Intra-México', scope: 'INTRA_MEX', status: 'CONFIGURABLE', presetId: 'std-ftl-intra-mex-v1', detail: 'Rutas domésticas mexicanas con costos operativos propios y supuestos calibrables.' },
  { id: 'MX_LOCAL', label: 'Locales México', scope: 'LOCAL', status: 'CONFIGURABLE', presetId: 'std-local-mx-v1', detail: 'Movimientos locales mexicanos con tractocamión; vehículos menores aún requieren tarjetas de activos.' },
  { id: 'INTRA_US', label: 'FTL Intra-EE. UU.', scope: 'INTRA_US', status: 'CONFIGURABLE', presetId: 'std-ftl-intra-us-v1', detail: 'Rutas domésticas estadounidenses con costos operativos propios.' },
  { id: 'US_DRAYAGE', label: 'Drayage EE. UU.', scope: 'DRAYAGE', status: 'CONFIGURABLE', presetId: 'std-drayage-us-v1', detail: 'Ciclo portuario/intermodal estadounidense con chasis.' },
] as const

export function segmentFor(id: OperationalSegment) {
  return OPERATIONAL_SEGMENTS.find(segment => segment.id === id)!
}

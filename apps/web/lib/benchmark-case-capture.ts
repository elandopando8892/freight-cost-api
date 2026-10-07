import type { DossierInput } from './benchmark-dossier'
import type { FormValue } from '../app/(app)/scenarios/benchmark/benchmark-form'
import profile from '../../../docs/research/B2_CONFIRMED_OPERATING_PROFILE_2026-10-03.json'

/** Only user-confirmed descriptive context. No date, quote, numeric economics,
 * carrier authority proof or calibrated cost-base version is inferred. */
export function confirmedB2CaseCapture(blank: DossierInput): DossierInput {
  if (profile.decisionId !== 'B2_USER_SCOPE_20261003' || profile.caseReference !== 'MEXICO_DF_FORT_SMITH_72916_WTB_OWN_RELAY')
    throw new Error('B2_CAPTURE_PROFILE_CHANGED')
  const value = structuredClone(blank)
  const route = value.route as Record<string, FormValue>
  route.direction = 'MX_TO_US'
  route.route = { mxEndpoint: 'Ciudad de México', mxGateway: 'Nuevo Laredo · Puente III',
    usGateway: 'Laredo · World Trade Bridge', usEndpoint: 'Fort Smith, AR 72916' }
  route.allocationRationale = 'Perfil confirmado B2: empresa binacional existente, relevo propio MX/US y la misma caja seca 53′. No acredita permisos, importes ni fecha exacta del servicio.'
  return value
}

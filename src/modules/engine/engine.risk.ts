import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { round4 } from '../../utils/currency.js'
import type { RiskBreakdown } from './engine.types.js'

interface RiskInput {
  technicalTariffUsd: number
  mxLinehaulUsd: number       // MX portion of the linehaul for security risk
  params: ParamMap
  trailerType: string
  config: string
  operationType: string
  isSeasonal?: boolean
}

export function calculateRisk(input: RiskInput): RiskBreakdown {
  const { technicalTariffUsd, mxLinehaulUsd, params, trailerType, config, operationType, isSeasonal } = input

  // Security reserve on MX linehaul
  const mxSecurityReserve = getParam(params, 'RISK', 'MX Security Risk Reserve', 0.03)
  const securityRiskUsd = round4(mxLinehaulUsd * mxSecurityReserve)

  // Route / operation risk
  const operationFactor = getOperationFactor(operationType, params)
  const operationRiskUsd = round4(technicalTariffUsd * operationFactor)

  // Flatbed complexity (only for open-deck)
  const isOpenDeck = ['Flatbed', 'Platform', 'RGN'].includes(trailerType)
  const flatbedComplexityUsd = isOpenDeck
    ? round4(technicalTariffUsd * getParam(params, 'RISK', 'Flatbed Complexity Factor', 0.25))
    : 0

  // Tandem risk
  const isTandem = config === 'Tandem'
  const tandemRiskUsd = isTandem
    ? round4(technicalTariffUsd * getParam(params, 'RISK', 'Config Risk Premium Tandem', 0.1))
    : 0

  // Weather buffer (seasonal)
  const weatherBufferUsd = isSeasonal
    ? round4(technicalTariffUsd * getParam(params, 'RISK', 'Weather Disruption Buffer', 0.02))
    : 0

  const routeRiskUsd = 0  // Reserved for lane-specific route risk (e.g. high-theft corridors)

  const totalRiskAdjUsd = round4(
    routeRiskUsd + securityRiskUsd + operationRiskUsd + flatbedComplexityUsd + tandemRiskUsd + weatherBufferUsd,
  )

  return {
    routeRiskUsd,
    securityRiskUsd,
    operationRiskUsd,
    flatbedComplexityUsd,
    tandemRiskUsd,
    weatherBufferUsd,
    totalRiskAdjUsd,
  }
}

function getOperationFactor(operationType: string, params: ParamMap): number {
  // Tight market and expedited premia are applied at quote time, not here
  // Base operation risk by type
  switch (operationType) {
    case 'D2D Export':
    case 'D2D Import':
      return 0.02   // cross-border adds baseline ops risk
    case 'Drayage':
      return 0.01
    case 'MX Northbound':
    case 'MX Southbound':
      return getParam(params, 'RISK', 'MX Security Risk Reserve', 0.03) * 0.5
    default:
      return 0
  }
}

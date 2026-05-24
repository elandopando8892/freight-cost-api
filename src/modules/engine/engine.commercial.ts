/**
 * Commercial / decision layer — Freight Cost Model V3.0 `Outputs` (COGS → Market
 * → Buy/Sell → Margin → Commercial flags → Validations).
 *
 * Turns the per-lane cost result into pricing intelligence for the carrier:
 *   cost floor → sell tiers (min/target/premium) → margin → go/no-go.
 * Market-reference comparison activates once DAT data is seeded (else 0).
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'
import { round2, round4 } from '../../utils/currency.js'

export interface CommercialInput {
  productionCostUsd: number   // Σ leg CVU+CFU
  riskAdjUsd: number          // Σ leg risk
  recommendedSellUsd: number  // cost-plus required tariff (freight baseline)
  marketReferenceUsd: number  // Σ leg market rate (0 until DAT seeded)
  loadedMiles: number
  cycleDays: number
  fuelMixOk: boolean
  params: ParamMap
}

export interface CommercialOutput {
  costFloorUsd: number        // Total Risk-Adjusted COGS
  minSellUsd: number
  targetSellUsd: number
  premiumSellUsd: number
  recommendedSellUsd: number
  grossProfitUsd: number
  grossMarginPct: number
  gpPerLoadedMileUsd: number
  gpPerDayUsd: number
  marketReferenceUsd: number
  marketVsCostSpreadUsd: number
  marketVsCostSpreadPct: number
  noGoFlag: boolean
  reviewFlag: boolean
  notes: string[]
}

export function calculateCommercial(input: CommercialInput): CommercialOutput {
  const { params } = input
  const minMargin = getParam(params, 'TECHNICAL_MARGIN', 'Minimum Gross Margin', 0.12)
  const targetMargin = getParam(params, 'TECHNICAL_MARGIN', 'Target Gross Margin', 0.18)
  const premiumMargin = getParam(params, 'TECHNICAL_MARGIN', 'Premium Gross Margin', 0.25)

  const costFloorUsd = round2(input.productionCostUsd + input.riskAdjUsd)
  const sellAt = (margin: number) => round2(costFloorUsd / (1 - margin))
  const minSellUsd = sellAt(minMargin)
  const targetSellUsd = sellAt(targetMargin)
  const premiumSellUsd = sellAt(premiumMargin)

  const recommendedSellUsd = round2(input.recommendedSellUsd)
  const grossProfitUsd = round2(recommendedSellUsd - costFloorUsd)
  const grossMarginPct = recommendedSellUsd > 0 ? round4(grossProfitUsd / recommendedSellUsd) : 0
  const gpPerLoadedMileUsd = input.loadedMiles > 0 ? round2(grossProfitUsd / input.loadedMiles) : 0
  const gpPerDayUsd = input.cycleDays > 0 ? round2(grossProfitUsd / input.cycleDays) : 0

  const marketReferenceUsd = round2(input.marketReferenceUsd)
  const marketVsCostSpreadUsd = marketReferenceUsd > 0 ? round2(marketReferenceUsd - costFloorUsd) : 0
  const marketVsCostSpreadPct =
    marketReferenceUsd > 0 && costFloorUsd > 0 ? round4(marketVsCostSpreadUsd / costFloorUsd) : 0

  // Decision flags
  const notes: string[] = []
  const noGoFlag = recommendedSellUsd < costFloorUsd
  if (noGoFlag) notes.push('NO-GO: sell below cost floor')
  let reviewFlag = false
  if (recommendedSellUsd < minSellUsd) { reviewFlag = true; notes.push('REVIEW: below minimum-margin sell') }
  if (marketReferenceUsd > 0 && recommendedSellUsd > marketReferenceUsd * 1.15) {
    reviewFlag = true; notes.push('REVIEW: 15%+ above market reference')
  }
  if (!input.fuelMixOk) { reviewFlag = true; notes.push('REVIEW: fuel purchase mix MX+US ≠ 1.00') }

  return {
    costFloorUsd, minSellUsd, targetSellUsd, premiumSellUsd, recommendedSellUsd,
    grossProfitUsd, grossMarginPct, gpPerLoadedMileUsd, gpPerDayUsd,
    marketReferenceUsd, marketVsCostSpreadUsd, marketVsCostSpreadPct,
    noGoFlag, reviewFlag, notes,
  }
}

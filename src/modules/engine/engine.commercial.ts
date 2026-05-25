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
  // ── Validation context (optional; defaults keep the recommended lane clean) ──
  operation?: string          // cross-border operations expect a border cost
  trailer?: string            // hazmat consistency
  borderCounted?: boolean     // MEX leg border charged exactly once
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

  // ── V3.0 "Validation" section (advisory; never alters the tariff) ─────────
  const v = (s: string, f: string, d: number) => getParam(params, s, f, d)

  // Range/consistency — sell-margin tiers must be strictly increasing within (0,1).
  if (!(minMargin > 0 && minMargin < targetMargin && targetMargin < premiumMargin && premiumMargin < 1)) {
    reviewFlag = true
    notes.push('REVIEW: margin tiers misconfigured (need 0 < min < target < premium < 1)')
  }

  // Profit Determination — recommended sell must clear the expected-return hurdle.
  const expectedReturn = v('FINANCE', 'Tasa de Rendimiento Esperado', 0.12)
  if (recommendedSellUsd > 0 && grossMarginPct < expectedReturn) {
    reviewFlag = true
    notes.push(`REVIEW: gross margin ${(grossMarginPct * 100).toFixed(1)}% below expected return ${(expectedReturn * 100).toFixed(0)}%`)
  }

  // Insurance double-count — cargo covered both as a monthly allocation and per-shipment.
  if (v('COST_INSURANCE', 'Cargo Insurance Annual Allocation', 0) > 0 &&
      v('COST_INSURANCE', 'Cargo Insurance Per Shipment Rate', 0) > 0) {
    reviewFlag = true
    notes.push('REVIEW: cargo insurance double-counted (annual allocation + per-shipment rate)')
  }
  if (v('COST_INSURANCE', 'High Value Cargo Factor', 1) < 1) {
    notes.push('NOTE: High Value Cargo Factor < 1 reduces cargo insurance — verify')
  }

  // Border double-count — yard transfer added separately while the transactional already bundles it.
  if (v('BORDER', 'Yard Transfer Cost', 150) > 0 && v('BORDER', 'Border Transactional Cost', 200) >= 350) {
    reviewFlag = true
    notes.push('REVIEW: border cost may double-count yard transfer')
  }

  // TMS double-count — cross-border TMS plus an oversized company software line.
  // (Fallbacks mirror the seeded defaults so empty-param behavior == DB-backed.)
  const tms = v('COST_CROSSBORDER', 'TMS', 2500)
  const software = v('COST_COMPANY', 'PU Software', 1250) * v('COST_COMPANY', 'Qty Software', 1)
  if (tms > 0 && software > 0 && tms + software > 6000) {
    reviewFlag = true
    notes.push('REVIEW: possible TMS double-count (crossborder TMS + company software)')
  }

  // Hazmat consistency — a hazmat trailer must carry a hazmat premium (and ideally an insurance load).
  if (input.trailer === 'Hazmat') {
    if (v('RISK', 'Hazmat Premium', 0) <= 0) {
      reviewFlag = true
      notes.push('REVIEW: hazmat trailer without hazmat premium')
    } else if (v('COST_INSURANCE', 'Hazmat Insurance Factor', 1) <= 1) {
      notes.push('NOTE: hazmat lane using base cargo-insurance factor (set Hazmat Insurance Factor > 1 to load risk)')
    }
  }

  // Border presence — cross-border operations should charge the border exactly once
  // and carry an inspection/delay reserve.
  if (input.operation === 'D2D Export' || input.operation === 'D2D Import') {
    if (input.borderCounted === false) {
      reviewFlag = true
      notes.push('REVIEW: cross-border operation but border cost not counted')
    }
    if (v('BORDER', 'Inspection Delay Reserve', 0.02) <= 0) {
      notes.push('NOTE: no border inspection/delay reserve set for a cross-border lane')
    }
  }

  return {
    costFloorUsd, minSellUsd, targetSellUsd, premiumSellUsd, recommendedSellUsd,
    grossProfitUsd, grossMarginPct, gpPerLoadedMileUsd, gpPerDayUsd,
    marketReferenceUsd, marketVsCostSpreadUsd, marketVsCostSpreadPct,
    noGoFlag, reviewFlag, notes,
  }
}

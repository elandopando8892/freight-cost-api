/**
 * Derived cost rates — Freight Cost Model V3.0 `Outputs` sheet.
 *
 * Turns the editable cost-card inputs (insurance, payroll, capital, tires, PM,
 * company expenses, crossborder) into the two aggregates the engine needs:
 *   • Monthly Fixed Cost  → CFU
 *   • Maint+Tires per KM  → CVU
 *
 * Each input reads from the ParamMap with its V3.0 recommended default, so a
 * carrier that edits any cost card (their insurance premium, truck value,
 * payroll, tire price…) shifts the derived costs — their own economics.
 *
 * Verified vs V3.0 Outputs: Monthly Fixed Cost 381,384.04 · Maint+Tires/km 0.2348385.
 */
import { getParam, type ParamMap } from '../assumptions/assumptions.service.js'

const P = (m: ParamMap, section: string, field: string, d: number) => getParam(m, section, field, d)

// ── MAINTENANCE + TIRES per km ─────────────────────────────────────────────
export function deriveMaintTiresPerKm(m: ParamMap): number {
  // Scheduled PM: Σ(Qty×PU) per interval, prorated over the interval km
  const pm10000 =
    P(m, 'COST_MAINT', '10k Qty Aceite de Motor', 60) * P(m, 'COST_MAINT', '10k PU Aceite de Motor', 5) +
    P(m, 'COST_MAINT', '10k Qty Filtros de Aceite', 1) * P(m, 'COST_MAINT', '10k PU Filtros de Aceite', 65) +
    P(m, 'COST_MAINT', '10k Qty Filtros de Diesel', 2) * P(m, 'COST_MAINT', '10k PU Filtros de Diesel', 40) +
    P(m, 'COST_MAINT', '10k Qty Mano de Obra', 1) * P(m, 'COST_MAINT', '10k PU Mano de Obra', 250)
  const pm100000 =
    P(m, 'COST_MAINT', '100k Qty Aceite Caja Cambios', 19) * P(m, 'COST_MAINT', '100k PU Aceite Caja Cambios', 8) +
    P(m, 'COST_MAINT', '100k Qty Aceite Caja Transmision', 19) * P(m, 'COST_MAINT', '100k PU Aceite Caja Transmision', 15) +
    P(m, 'COST_MAINT', '100k Qty Filtros', 1) * P(m, 'COST_MAINT', '100k PU Filtros', 60) +
    P(m, 'COST_MAINT', '100k Qty Aceite Hidraulico', 19) * P(m, 'COST_MAINT', '100k PU Aceite Hidraulico', 8) +
    P(m, 'COST_MAINT', '100k Qty Filtros Aire', 2) * P(m, 'COST_MAINT', '100k PU Filtros Aire', 95)
  const pm250000 =
    P(m, 'COST_MAINT', '250k Qty Baterias', 4) * P(m, 'COST_MAINT', '250k PU Baterias', 175) +
    P(m, 'COST_MAINT', '250k Qty Calibracion Inyectores', 1) * P(m, 'COST_MAINT', '250k PU Calibracion Inyectores', 1200) +
    P(m, 'COST_MAINT', '250k Qty Clutch', 1) * P(m, 'COST_MAINT', '250k PU Clutch', 2750) +
    P(m, 'COST_MAINT', '250k Qty Frenos', 1) * P(m, 'COST_MAINT', '250k PU Frenos', 1800)
  const scheduledPerKm = pm10000 / 10000 + pm100000 / 100000 + pm250000 / 250000

  // Reserves (per km)
  const reservePerKm =
    P(m, 'COST_MAINT', 'Reserve DEF Urea', 0.025) +
    P(m, 'COST_MAINT', 'Reserve Lubricants', 0.005) +
    P(m, 'COST_MAINT', 'Reserve Coolant', 120) / 100000 +
    P(m, 'COST_MAINT', 'Reserve DPF', 0.015) +
    P(m, 'COST_MAINT', 'Reserve PM Unscheduled', 0.03)

  // Tires per km = Σ(Qty×PU / lifeKm). NOTE: V3.0 maps PUs one row off (drive↔retread,
  // trailer↔traction); replicated so totals match V3.0 exactly.
  const tiresPerKm =
    (P(m, 'COST_TIRES', 'Qty Direccion', 2) * P(m, 'COST_TIRES', 'PU Direccion', 600)) / P(m, 'COST_TIRES', 'Life KM Direccion', 180000) +
    (P(m, 'COST_TIRES', 'Qty Traccion', 8) * P(m, 'COST_TIRES', 'PU Recapeadas', 225)) / P(m, 'COST_TIRES', 'Life KM Traccion', 220000) +
    (P(m, 'COST_TIRES', 'Qty Remolque', 8) * P(m, 'COST_TIRES', 'PU Traccion', 550)) / P(m, 'COST_TIRES', 'Life KM Remolque', 250000) +
    (P(m, 'COST_TIRES', 'Qty Recapeadas', 8) * P(m, 'COST_TIRES', 'PU Remolque', 450)) / P(m, 'COST_TIRES', 'Life KM Recapeadas', 160000)

  return scheduledPerKm + reservePerKm + tiresPerKm
}

export const deriveMaintTiresPerMile = (m: ParamMap): number => deriveMaintTiresPerKm(m) * 1.60934

// ── MONTHLY FIXED COST ─────────────────────────────────────────────────────
export function deriveMonthlyFixedCost(m: ParamMap): number {
  const flota = P(m, 'GENERAL_BASE', 'Tamaño de Flota', 50)
  const cargaSocial = P(m, 'LABOR', 'Carga Social', 0.3)

  // Insurance (base fleet)
  const insurance =
    (P(m, 'COST_INSURANCE', 'Prima Anual por Vehiculo', 1) * P(m, 'COST_INSURANCE', 'Poliza x Vehiculo', 12000) * flota) /
    P(m, 'COST_INSURANCE', 'Periodo de Poliza', 12)

  // Admin payroll (Σ role Qty×PU) × (1 + burden)
  const payrollBase =
    P(m, 'COST_PAYROLL', 'Qty Despachador', 2) * P(m, 'COST_PAYROLL', 'PU Despachador', 2200) +
    P(m, 'COST_PAYROLL', 'Qty Jefe Trafico', 2) * P(m, 'COST_PAYROLL', 'PU Jefe Trafico', 2750) +
    P(m, 'COST_PAYROLL', 'Qty Gerente Operaciones', 1) * P(m, 'COST_PAYROLL', 'PU Gerente Operaciones', 5500) +
    P(m, 'COST_PAYROLL', 'Qty Gerente Comercial', 0.5) * P(m, 'COST_PAYROLL', 'PU Gerente Comercial', 4500) +
    P(m, 'COST_PAYROLL', 'Qty Safety Manager', 0.5) * P(m, 'COST_PAYROLL', 'PU Safety Manager', 4500) +
    P(m, 'COST_PAYROLL', 'Qty Tracking CS', 2) * P(m, 'COST_PAYROLL', 'PU Tracking CS', 1800) +
    P(m, 'COST_PAYROLL', 'Qty Billing Admin', 1) * P(m, 'COST_PAYROLL', 'PU Billing Admin', 2200)
  const payroll = payrollBase * (1 + cargaSocial)

  // Company expenses (Σ Qty×PU)
  const company =
    P(m, 'COST_COMPANY', 'Qty Agua', 1) * P(m, 'COST_COMPANY', 'PU Agua', 250) +
    P(m, 'COST_COMPANY', 'Qty Luz', 1) * P(m, 'COST_COMPANY', 'PU Luz', 900) +
    P(m, 'COST_COMPANY', 'Qty Telefonia Fija', 1) * P(m, 'COST_COMPANY', 'PU Telefonia Fija', 50) +
    P(m, 'COST_COMPANY', 'Qty Telefonia Celular', 60) * P(m, 'COST_COMPANY', 'PU Telefonia Celular', 30) +
    P(m, 'COST_COMPANY', 'Qty Internet', 2) * P(m, 'COST_COMPANY', 'PU Internet', 250) +
    P(m, 'COST_COMPANY', 'Qty Renta Patio', 1) * P(m, 'COST_COMPANY', 'PU Renta Patio', 3000) +
    P(m, 'COST_COMPANY', 'Qty Software', 1) * P(m, 'COST_COMPANY', 'PU Software', 1250) +
    P(m, 'COST_COMPANY', 'Qty Capacitaciones', 1) * P(m, 'COST_COMPANY', 'PU Capacitaciones', 2000) +
    P(m, 'COST_COMPANY', 'Qty Representacion', 1) * P(m, 'COST_COMPANY', 'PU Representacion', 500) +
    P(m, 'COST_COMPANY', 'Qty Utiles', 1) * P(m, 'COST_COMPANY', 'PU Utiles', 150) +
    P(m, 'COST_COMPANY', 'Qty Imprenta', 1) * P(m, 'COST_COMPANY', 'PU Imprenta', 200) +
    P(m, 'COST_COMPANY', 'Qty Seguros Otros', 1) * P(m, 'COST_COMPANY', 'PU Seguros Otros', 400) +
    P(m, 'COST_COMPANY', 'Qty Mant Otros', 1) * P(m, 'COST_COMPANY', 'PU Mant Otros', 250) +
    P(m, 'COST_COMPANY', 'Qty Comb Otros', 1) * P(m, 'COST_COMPANY', 'PU Comb Otros', 500) +
    P(m, 'COST_COMPANY', 'Qty Depr Otros', 1) * P(m, 'COST_COMPANY', 'PU Depr Otros', 300) +
    P(m, 'COST_COMPANY', 'Qty Depr Equipos', 1) * P(m, 'COST_COMPANY', 'PU Depr Equipos', 250) +
    P(m, 'COST_COMPANY', 'Qty Gestorias', 1) * P(m, 'COST_COMPANY', 'PU Gestorias', 300) +
    P(m, 'COST_COMPANY', 'Qty Office Cleaning', 1) * P(m, 'COST_COMPANY', 'PU Office Cleaning', 300) +
    P(m, 'COST_COMPANY', 'Qty Security', 1) * P(m, 'COST_COMPANY', 'PU Security', 800) +
    P(m, 'COST_COMPANY', 'Qty Banking', 1) * P(m, 'COST_COMPANY', 'PU Banking', 250) +
    P(m, 'COST_COMPANY', 'Qty Legal', 1) * P(m, 'COST_COMPANY', 'PU Legal', 500) +
    P(m, 'COST_COMPANY', 'Qty Subscriptions', 1) * P(m, 'COST_COMPANY', 'PU Subscriptions', 750) +
    P(m, 'COST_COMPANY', 'Qty Office Equip', 1) * P(m, 'COST_COMPANY', 'PU Office Equip', 250)

  // Capital = fleet depreciation + fleet asset finance
  const assetValue =
    P(m, 'COST_CAPITAL', 'Qty Tracto', 1) * P(m, 'COST_CAPITAL', 'PU Tracto', 220000) +
    P(m, 'COST_CAPITAL', 'Qty Remolque', 1) * P(m, 'COST_CAPITAL', 'PU Remolque', 55000) +
    P(m, 'COST_CAPITAL', 'Qty Dolly', 0) * P(m, 'COST_CAPITAL', 'PU Dolly', 25000)
  const residual =
    P(m, 'COST_CAPITAL', 'Qty Rescue Tracto', 1) * P(m, 'COST_CAPITAL', 'PU Rescue Tracto', 60000) +
    P(m, 'COST_CAPITAL', 'Qty Rescue Remolque', 1) * P(m, 'COST_CAPITAL', 'PU Rescue Remolque', 20000)
  const depPeriod = P(m, 'COST_CAPITAL', 'Periodo Depreciacion', 60)
  const fleetDepreciation = ((assetValue - residual) / depPeriod) * flota
  const ltv = P(m, 'COST_CAPITAL', 'LTV Asset Financing', 0.7)
  const financeRate = P(m, 'COST_CAPITAL', 'Asset Finance Annual Rate', 0.1)
  const fleetAssetFinance = (assetValue * ltv * financeRate / 12) * flota
  const capital = fleetDepreciation + fleetAssetFinance

  // Crossborder fixed = compliance + infrastructure (monthly)
  const complianceTractor =
    (P(m, 'COST_CROSSBORDER', 'Registro doble matricula', 3500) + P(m, 'COST_CROSSBORDER', 'Seguros adicionales', 3000)) * flota
  const complianceCompany =
    P(m, 'COST_CROSSBORDER', 'CTPAT', 5000) + P(m, 'COST_CROSSBORDER', 'FMCSA', 1500) +
    P(m, 'COST_CROSSBORDER', 'Ajustes Regulatorios', 5000) + P(m, 'COST_CROSSBORDER', 'SCAC', 1000) +
    P(m, 'COST_CROSSBORDER', 'BOC-3', 500) + P(m, 'COST_CROSSBORDER', 'Safety Audit', 2500)
  const monthlyCompliance = (complianceTractor + complianceCompany) / 12
  const monthlyInfra =
    P(m, 'COST_CROSSBORDER', 'Renta Oficinas Patios', 2500) + P(m, 'COST_CROSSBORDER', 'Costos Comunicacion', 700) +
    P(m, 'COST_CROSSBORDER', 'GPS', 1500) + P(m, 'COST_CROSSBORDER', 'Capacitacion Operadores', 1000) +
    P(m, 'COST_CROSSBORDER', 'Mantenimientos', 750) + P(m, 'COST_CROSSBORDER', 'TMS', 2500) +
    P(m, 'COST_CROSSBORDER', 'Border Yard Minimum', 1000)
  const crossborderFixed = monthlyCompliance + monthlyInfra

  // Working capital (small; uses AR/AP gap × COGS proxy × cost of capital)
  const gapDays = Math.max(
    P(m, 'FINANCE', 'Customer Collection Days', 30) - P(m, 'FINANCE', 'Carrier Payment Days', 14), 0)
  const monthlyCogsProxy = P(m, 'FINANCE', 'Monthly COGS Proxy', 239577)
  const wcRate = P(m, 'FINANCE', 'Cost of Capital MX', 0.14)
  const workingCapital = (monthlyCogsProxy * gapDays / 30) * wcRate / 12

  return insurance + payroll + company + capital + crossborderFixed + workingCapital
}

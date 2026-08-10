// Default assumption parameters — Freight Cost Model V3.0 (source of truth).
// Section/Field/Value mirror the V3.0 "Inputs / Assumptions" sheet exactly.
// The engine derives all per-km / per-mile costs from these (see engine.outputs.ts).
import { COST_CARDS } from './cost-cards.js'

const BASE_ASSUMPTIONS = [
  // ── GENERAL_BASE ──────────────────────────────────────────────────────
  { section: 'GENERAL_BASE', field: 'Gasto Adicional sobre Ruta',     value: 0.05,  unit: '% route expenses',     low: 0,     high: 0.10,  updateFrequency: 'Quarterly',  costBehavior: 'Route expense buffer',     activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Periodo de Operación',           value: 26,    unit: 'days/month',           low: 24,    high: 28,    updateFrequency: 'Semiannual', costBehavior: 'Fixed cost allocation',    activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Tamaño de Flota',                value: 50,    unit: 'tractors',             low: 25,    high: 100,   updateFrequency: 'Semiannual', costBehavior: 'Scale allocation',         activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Índice de Operatividad',         value: 0.9,   unit: 'ratio',                low: 0.85,  high: 0.93,  updateFrequency: 'Monthly',    costBehavior: 'Fleet utilization',        activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Operadores',                     value: 52,    unit: 'operators',            low: 50,    high: 58,    updateFrequency: 'Monthly',    costBehavior: 'Driver coverage',          activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Kilómetros promedio x operador', value: 22000, unit: 'km/month/operator',    low: 14000, high: 22000, updateFrequency: 'Monthly',    costBehavior: 'Productivity',             activation: 'Always' },

  // ── FUEL ─────────────────────────────────────────────────────────────
  { section: 'FUEL', field: 'Diesel MX',             value: 28,   unit: 'MXN/L',       low: 25,   high: 31,   updateFrequency: 'Weekly',    costBehavior: 'Fuel cost',               activation: 'By Country' },
  { section: 'FUEL', field: 'Diesel US Border',       value: 1.49, unit: 'USD/L',       low: 1.25, high: 1.60, updateFrequency: 'Weekly',    costBehavior: 'Fuel cost',               activation: 'By Country' },
  { section: 'FUEL', field: 'Fuel Purchase Mix MX',   value: 0.3,  unit: 'ratio',       low: 0.1,  high: 0.6,  updateFrequency: 'Monthly',   costBehavior: 'Fuel sourcing',           activation: 'By Lane' },
  { section: 'FUEL', field: 'Fuel Purchase Mix US',   value: 0.7,  unit: 'ratio',       low: 0.4,  high: 0.9,  updateFrequency: 'Monthly',   costBehavior: 'Fuel sourcing',           activation: 'By Lane' },
  { section: 'FUEL', field: 'Rendimiento Cargado',    value: 2.8,  unit: 'km/L',        low: 2.2,  high: 3.1,  updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency loaded',  activation: 'By Equipment' },
  { section: 'FUEL', field: 'Rendimiento Vacío',      value: 3.2,  unit: 'km/L',        low: 2.7,  high: 3.7,  updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency empty',   activation: 'By Equipment' },
  { section: 'FUEL', field: 'Fuel Escalation Buffer', value: 0.05, unit: '% fuel cost', low: 0,    high: 0.15, updateFrequency: 'Monthly',   costBehavior: 'Fuel volatility reserve', activation: 'By Market' },

  // ── LABOR ─────────────────────────────────────────────────────────────
  { section: 'LABOR', field: 'Sueldo Base Operador MX', value: 500,  unit: 'MXN/day',        low: 350,  high: 650,  updateFrequency: 'Quarterly', costBehavior: 'Fixed labor',         activation: 'By Country' },
  { section: 'LABOR', field: 'Tarifa Operador MX',      value: 0.18, unit: 'USD/mile',       low: 0.15, high: 0.22, updateFrequency: 'Quarterly', costBehavior: 'Variable labor MX',    activation: 'By Country' },
  { section: 'LABOR', field: 'Tarifa Operador US',      value: 0.6,  unit: 'USD/mile',       low: 0.55, high: 0.7,  updateFrequency: 'Quarterly', costBehavior: 'Variable labor US',    activation: 'By Country' },
  { section: 'LABOR', field: 'Carga Social',            value: 0.3,  unit: '% payroll',      low: 0.25, high: 0.35, updateFrequency: 'Annual',    costBehavior: 'Payroll burden',      activation: 'By Country' },
  { section: 'LABOR', field: 'Viáticos MX',             value: 350,  unit: 'MXN/day',        low: 250,  high: 500,  updateFrequency: 'Quarterly', costBehavior: 'Driver per diem',      activation: 'By Country' },
  { section: 'LABOR', field: 'Team Driver Premium',     value: 0.35, unit: '% labor uplift', low: 0.25, high: 0.5,  updateFrequency: 'Quarterly', costBehavior: 'Labor premium',       activation: 'By Shipment' },
  { section: 'LABOR', field: 'Hazmat Driver Premium',   value: 0.35, unit: '% labor uplift', low: 0.05, high: 0.5,  updateFrequency: 'Quarterly', costBehavior: 'Labor premium',       activation: 'By Shipment' },

  // ── FINANCE ──────────────────────────────────────────────────────────
  { section: 'FINANCE', field: 'Tipo de Cambio',           value: 17.5,   unit: 'MXN/USD',     low: 16,     high: 20,     updateFrequency: 'Weekly',    costBehavior: 'Currency conversion',    activation: 'Always' },
  { section: 'FINANCE', field: 'Cost of Capital MX',       value: 0.14,   unit: 'annual rate', low: 0.12,   high: 0.18,   updateFrequency: 'Monthly',   costBehavior: 'Finance cost',           activation: 'By Country' },
  { section: 'FINANCE', field: 'Cost of Capital US',       value: 0.10,   unit: 'annual rate', low: 0.08,   high: 0.14,   updateFrequency: 'Monthly',   costBehavior: 'Finance cost',           activation: 'By Country' },
  { section: 'FINANCE', field: 'Carrier Payment Days',     value: 14,     unit: 'days',        low: 7,      high: 30,     updateFrequency: 'Monthly',   costBehavior: 'AP timing',              activation: 'By Customer' },
  { section: 'FINANCE', field: 'Customer Collection Days', value: 30,     unit: 'days',        low: 21,     high: 60,     updateFrequency: 'Monthly',   costBehavior: 'AR timing',              activation: 'By Customer' },
  { section: 'FINANCE', field: 'Inflation Buffer',         value: 0.04,   unit: 'annual rate', low: 0.02,   high: 0.08,   updateFrequency: 'Quarterly', costBehavior: 'Cost escalation',        activation: 'Always' },
  // Monthly COGS proxy for working-capital financing (V3.0 Outputs); fixed cost itself is derived from cost cards.
  { section: 'FINANCE', field: 'Monthly COGS Proxy',       value: 239577, unit: 'USD/month',   low: 100000, high: 600000, updateFrequency: 'Quarterly', costBehavior: 'Working capital base',   activation: 'Always' },

  // ── UTILIZATION ──────────────────────────────────────────────────────
  { section: 'UTILIZATION', field: 'Deadhead Base',                value: 0.15, unit: '% loaded miles',        low: 0.08, high: 0.30, updateFrequency: 'Monthly',   costBehavior: 'Empty repositioning',    activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Trailer Utilization',          value: 0.85, unit: 'ratio',                 low: 0.75, high: 0.95, updateFrequency: 'Monthly',   costBehavior: 'Trailer productivity',   activation: 'By Equipment' },
  { section: 'UTILIZATION', field: 'Truck Utilization Days',       value: 23,   unit: 'productive days/month', low: 18,   high: 26,   updateFrequency: 'Monthly',   costBehavior: 'Asset utilization',      activation: 'Always' },
  { section: 'UTILIZATION', field: 'Load Time',                    value: 2,    unit: 'hours',                 low: 1,    high: 6,    updateFrequency: 'Quarterly', costBehavior: 'Operational cycle',      activation: 'By Shipment' },
  { section: 'UTILIZATION', field: 'Unload Time',                  value: 2,    unit: 'hours',                 low: 1,    high: 6,    updateFrequency: 'Quarterly', costBehavior: 'Operational cycle',      activation: 'By Shipment' },
  { section: 'UTILIZATION', field: 'Free Time',                    value: 2,    unit: 'hours/event',           low: 1,    high: 4,    updateFrequency: 'Quarterly', costBehavior: 'Detention threshold',    activation: 'By Contract' },
  { section: 'UTILIZATION', field: 'Detention Rate',               value: 85,   unit: 'USD/hour',              low: 60,   high: 125,  updateFrequency: 'Quarterly', costBehavior: 'Delay pricing',          activation: 'By Contract' },
  // Production floors (Freight Cost Model V3.0 finding: distance-based math underprices
  // local/short-haul because it doesn't recognize the cost of committing a unit for a
  // full cycle. Classification: baseKm ≤ 100 → local; baseKm ≤ 300 → short-haul.)
  { section: 'UTILIZATION', field: 'Billable Day Floor Local',     value: 1.0,  unit: 'days',                  low: 0.5,  high: 2.0,  updateFrequency: 'Semiannual', costBehavior: 'Minimum billable cycle', activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Billable Day Floor Short-haul', value: 0.5, unit: 'days',                  low: 0.33, high: 1.0,  updateFrequency: 'Semiannual', costBehavior: 'Minimum billable cycle', activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Empty KM Min Local',           value: 20,   unit: 'km',                    low: 10,   high: 60,   updateFrequency: 'Semiannual', costBehavior: 'Minimum repositioning',  activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Empty KM Min Short-haul',      value: 40,   unit: 'km',                    low: 20,   high: 100,  updateFrequency: 'Semiannual', costBehavior: 'Minimum repositioning',  activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Min Trip Cost Local USD',      value: 200,  unit: 'USD',                   low: 100,  high: 500,  updateFrequency: 'Semiannual', costBehavior: 'Minimum production cost', activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Min Trip Cost Short-haul USD', value: 150,  unit: 'USD',                   low: 75,   high: 400,  updateFrequency: 'Semiannual', costBehavior: 'Minimum production cost', activation: 'By Lane' },
  // E6 backhaul semantic: a backhaul opportunity reduces expected deadhead vs a
  // one-way, but doesn't eliminate residual reposition (patio → pickup, delivery
  // → next). Factor scales the one-way deadhead. Set to 0 for a confirmed backhaul
  // where the return load starts exactly at destination.
  { section: 'UTILIZATION', field: 'Backhaul Deadhead Factor',    value: 0.5,  unit: 'fraction of one-way',   low: 0,    high: 1,    updateFrequency: 'Semiannual', costBehavior: 'Residual reposition',    activation: 'By Lane' },
  // E4 Drayage time (port dwell + delivery service feed the billable cycle floor).
  { section: 'UTILIZATION', field: 'Port Dwell Hours',           value: 2,    unit: 'hours',                 low: 0.5,  high: 8,    updateFrequency: 'Semiannual', costBehavior: 'Terminal dwell',         activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Delivery Service Hours',     value: 2,    unit: 'hours',                 low: 0.5,  high: 8,    updateFrequency: 'Semiannual', costBehavior: 'Live unload/strip',      activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Billable Day Floor Drayage', value: 1.0,  unit: 'days',                  low: 0.5,  high: 2.0,  updateFrequency: 'Semiannual', costBehavior: 'Minimum billable cycle', activation: 'By Lane' },
  // E5: tandem hooking/unhooking + inspection of the 2nd trailer + dolly per cycle.
  { section: 'UTILIZATION', field: 'Tandem Maneuver Hours',      value: 1.0,  unit: 'hours',                 low: 0,    high: 4,    updateFrequency: 'Annual',     costBehavior: 'Hook/unhook 2nd unit',   activation: 'By Config' },
  // E7: previously-hardcoded engine constants, now editable (no silent magic).
  { section: 'UTILIZATION', field: 'Roundtrip Empty Factor',     value: 0.03, unit: 'fraction',              low: 0,    high: 0.2,  updateFrequency: 'Semiannual', costBehavior: 'Deadhead between RT legs', activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Billable Day Floor Long-haul', value: 0.33, unit: 'days',                low: 0.25, high: 1.0,  updateFrequency: 'Semiannual', costBehavior: 'Minimum billable cycle', activation: 'By Lane' },
  // (Maint+Tires per km/mile is DERIVED from COST_MAINT/COST_TIRES cost cards — see engine.outputs.ts)

  // ── BORDER ───────────────────────────────────────────────────────────
  { section: 'BORDER', field: 'Border Friction Time',      value: 0.75, unit: 'days/trip',  low: 0.25, high: 2,    updateFrequency: 'Monthly', costBehavior: 'Cross-border delay (CFU time)', activation: 'By Border' },
  // Base transactional = Border Crossing Fee 175 + ACE/eManifest 25 = 200; Yard transfer (150) optional
  { section: 'BORDER', field: 'Border Transactional Cost', value: 200,  unit: 'USD/trip',   low: 150,  high: 600,  updateFrequency: 'Monthly', costBehavior: 'Per-trip border cost',         activation: 'By Border' },
  { section: 'BORDER', field: 'Yard Transfer Cost',        value: 150,  unit: 'USD/trip',   low: 0,    high: 300,  updateFrequency: 'Monthly', costBehavior: 'Optional yard transfer',       activation: 'By Border' },
  { section: 'BORDER', field: 'Inspection Delay Reserve',  value: 0.02, unit: '% linehaul', low: 0,    high: 0.08, updateFrequency: 'Monthly', costBehavior: 'Inspection risk',              activation: 'By Border' },

  // ── RISK ─────────────────────────────────────────────────────────────
  { section: 'RISK', field: 'MX Security Risk Reserve',   value: 0.025, unit: '% MX linehaul', low: 0,  high: 0.08, updateFrequency: 'Monthly',   costBehavior: 'Risk reserve',     activation: 'By Lane' },
  { section: 'RISK', field: 'Tight Market Premium',       value: 0.10, unit: '% uplift',      low: 0,   high: 0.25, updateFrequency: 'Weekly',    costBehavior: 'Market risk',      activation: 'By Market' },
  { section: 'RISK', field: 'Expedited Premium',          value: 0.20, unit: '% uplift',      low: 0.1, high: 0.4,  updateFrequency: 'Weekly',    costBehavior: 'Service risk',     activation: 'By Shipment' },
  { section: 'RISK', field: 'Flatbed Complexity Factor',  value: 0.25, unit: '% uplift',      low: 0,   high: 0.40, updateFrequency: 'Quarterly', costBehavior: 'Equipment risk',   activation: 'By Equipment' },
  { section: 'RISK', field: 'Hazmat Premium',             value: 0.35, unit: '% uplift',      low: 0.1, high: 0.5,  updateFrequency: 'Quarterly', costBehavior: 'Commodity risk',   activation: 'By Shipment' },
  { section: 'RISK', field: 'Weather Disruption Buffer',  value: 0.02, unit: '% uplift',      low: 0,   high: 0.08, updateFrequency: 'Seasonal',  costBehavior: 'Weather risk',     activation: 'By Season' },
  { section: 'RISK', field: 'Config Risk Premium Tandem', value: 0.10, unit: '% uplift',      low: 0,   high: 0.15, updateFrequency: 'Annual',    costBehavior: '% technical cost', activation: 'By Config' },

  // ── CONFIG ───────────────────────────────────────────────────────────
  { section: 'CONFIG', field: 'Tandem Toll Premium',       value: 0.30, unit: '% uplift', low: 0, high: 0.5,  updateFrequency: 'Annual', costBehavior: '% base tolls',      activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem Fuel Penalty',       value: 0.12, unit: '% uplift', low: 0, high: 0.3,  updateFrequency: 'Annual', costBehavior: '% efficiency loss', activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem Maint/Tires Factor', value: 1.35, unit: 'factor',   low: 1, high: 2,    updateFrequency: 'Annual', costBehavior: 'factor',            activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem CFU Factor',         value: 1.20, unit: 'factor',   low: 1, high: 2,    updateFrequency: 'Annual', costBehavior: 'DEPRECATED — replaced by Tandem Second Unit Monthly (E5)', activation: 'By Config' },
  // E5: tandem CFU is now ADDITIVE (real 2nd-trailer + dolly monthly cost), not a
  // flat multiplier — so the tandem uplift varies by corridor (higher % on short
  // lanes where fixed cost dominates), matching the benchmarks.
  { section: 'CONFIG', field: 'Tandem Second Unit Monthly USD', value: 1800, unit: 'USD/month', low: 0, high: 6000, updateFrequency: 'Annual', costBehavior: '2nd trailer + dolly (invest/rent/insure)', activation: 'By Config' },
  // E4 Drayage cycle (physical legs as fraction of loaded linehaul, + chassis/day).
  { section: 'CONFIG', field: 'Chassis Day Cost USD',          value: 25,   unit: 'USD/day', low: 0,   high: 80,  updateFrequency: 'Annual',   costBehavior: 'Chassis rental/ownership', activation: 'By Config' },
  { section: 'CONFIG', field: 'Drayage Port Pickup Factor',    value: 0.20, unit: 'x linehaul', low: 0, high: 1,   updateFrequency: 'Annual',   costBehavior: 'Yard → port deadhead',     activation: 'By Lane' },
  { section: 'CONFIG', field: 'Drayage Final Reposition Factor', value: 0.10, unit: 'x linehaul', low: 0, high: 1, updateFrequency: 'Annual',  costBehavior: 'Return → yard deadhead',   activation: 'By Lane' },
  { section: 'CONFIG', field: 'Drayage Drop-Off Factor',       value: 0.40, unit: 'x linehaul', low: 0, high: 1,   updateFrequency: 'Annual',   costBehavior: 'Interior drop-off return',  activation: 'By Lane' },

  // ── TECHNICAL_MARGIN — UT (Utility) margin applied as Tariff = Cost / (1 − UT) ──
  { section: 'TECHNICAL_MARGIN', field: 'UT Rate One Way',   value: 0.3, unit: '% margin', low: 0.15, high: 0.45, updateFrequency: 'Quarterly', costBehavior: 'Carrier utility margin', activation: 'By Service' },
  { section: 'TECHNICAL_MARGIN', field: 'UT Rate Backhaul',  value: 0.1, unit: '% margin', low: 0.05, high: 0.25, updateFrequency: 'Quarterly', costBehavior: 'Carrier utility margin', activation: 'By Service' },
  { section: 'TECHNICAL_MARGIN', field: 'UT Rate Roundtrip', value: 0.2, unit: '% margin', low: 0.10, high: 0.35, updateFrequency: 'Quarterly', costBehavior: 'Carrier utility margin', activation: 'By Service' },
  // ── Commercial layer (V3.0 Buy/Sell blueprint — configurable per carrier) ──
  { section: 'TECHNICAL_MARGIN', field: 'Minimum Gross Margin', value: 0.12, unit: '% margin', low: 0.05, high: 0.25, updateFrequency: 'Quarterly', costBehavior: 'Sell floor margin',    activation: 'By Customer' },
  { section: 'TECHNICAL_MARGIN', field: 'Target Gross Margin',  value: 0.18, unit: '% margin', low: 0.10, high: 0.35, updateFrequency: 'Quarterly', costBehavior: 'Sell target margin',   activation: 'By Customer' },
  { section: 'TECHNICAL_MARGIN', field: 'Premium Gross Margin', value: 0.25, unit: '% margin', low: 0.15, high: 0.45, updateFrequency: 'Quarterly', costBehavior: 'Sell premium margin',  activation: 'By Customer' },
  { section: 'TECHNICAL_MARGIN', field: 'Buy Market Weight',    value: 0.95, unit: 'factor',   low: 0.80, high: 1.10, updateFrequency: 'Monthly',   costBehavior: 'Market vs cost buy', activation: 'By Market' },
  // E7: rate-rounding granularity, previously hardcoded (MROUND) in the engine.
  { section: 'TECHNICAL_MARGIN', field: 'Rate Rounding MEX USD', value: 100,  unit: 'USD',      low: 1,   high: 250,  updateFrequency: 'Annual',  costBehavior: 'MEX tariff rounding', activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Rate Rounding USA USD', value: 50,   unit: 'USD',      low: 1,   high: 250,  updateFrequency: 'Annual',  costBehavior: 'USA tariff rounding', activation: 'Always' },
]

// High-level assumptions + the full editable cost-card detail (engine derives
// Monthly Fixed Cost & Maint/Tires from the cost cards via engine.outputs.ts).
export const DEFAULT_ASSUMPTIONS = [...BASE_ASSUMPTIONS, ...COST_CARDS]

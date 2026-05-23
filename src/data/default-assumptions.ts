// Default assumption parameters extracted from the Freight Cost Model Google Sheet
export const DEFAULT_ASSUMPTIONS = [
  // ── GENERAL_BASE ──────────────────────────────────────────────────────
  { section: 'GENERAL_BASE', field: 'Gasto Adicional sobre Ruta',  value: 0.05,  unit: '% route expenses',     low: 0,     high: 0.1,   updateFrequency: 'Quarterly',  costBehavior: 'Operational contingency', activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Periodo de Operación',        value: 26,    unit: 'days/month',           low: 24,    high: 28,    updateFrequency: 'Semiannual', costBehavior: 'Fixed cost allocation',   activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Tamaño de Flota',             value: 50,    unit: 'tractors',             low: 25,    high: 100,   updateFrequency: 'Semiannual', costBehavior: 'Scale allocation',        activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Índice de Operatividad',      value: 0.9,   unit: 'ratio',                low: 0.85,  high: 0.93,  updateFrequency: 'Monthly',    costBehavior: 'Fleet utilization',       activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Operadores',                  value: 52,    unit: 'operators',            low: 50,    high: 58,    updateFrequency: 'Monthly',    costBehavior: 'Driver coverage',         activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Kilómetros promedio x operador', value: 22000, unit: 'km/month/operator', low: 14000, high: 22000, updateFrequency: 'Monthly',    costBehavior: 'Productivity',            activation: 'Always' },

  // ── FUEL ─────────────────────────────────────────────────────────────
  { section: 'FUEL', field: 'Diesel MX',               value: 28,    unit: 'MXN/L',       low: 25,   high: 31,   updateFrequency: 'Weekly',    costBehavior: 'Fuel cost',              activation: 'By Country' },
  { section: 'FUEL', field: 'Diesel US Border',         value: 1.49,  unit: 'USD/L',       low: 1.25, high: 1.6,  updateFrequency: 'Weekly',    costBehavior: 'Fuel cost',              activation: 'By Country' },
  { section: 'FUEL', field: 'Fuel Purchase Mix MX',     value: 0.3,   unit: 'ratio',       low: 0.1,  high: 0.6,  updateFrequency: 'Monthly',   costBehavior: 'Fuel sourcing',          activation: 'By Lane' },
  { section: 'FUEL', field: 'Fuel Purchase Mix US',     value: 0.7,   unit: 'ratio',       low: 0.4,  high: 0.9,  updateFrequency: 'Monthly',   costBehavior: 'Fuel sourcing',          activation: 'By Lane' },
  { section: 'FUEL', field: 'Rendimiento Cargado',      value: 2.8,   unit: 'km/L',        low: 2.2,  high: 3.1,  updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency',        activation: 'By Equipment' },
  { section: 'FUEL', field: 'Rendimiento Vacío',        value: 3.2,   unit: 'km/L',        low: 2.7,  high: 3.7,  updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency',        activation: 'By Equipment' },
  { section: 'FUEL', field: 'Fuel Escalation Buffer',   value: 0.05,  unit: '% fuel cost', low: 0,    high: 0.15, updateFrequency: 'Monthly',   costBehavior: 'Fuel volatility reserve', activation: 'By Market' },

  // ── LABOR ─────────────────────────────────────────────────────────────
  { section: 'LABOR', field: 'Sueldo Base Operador MX', value: 500,  unit: 'MXN/day',      low: 350,  high: 650,  updateFrequency: 'Quarterly', costBehavior: 'Fixed labor',    activation: 'By Country' },
  { section: 'LABOR', field: 'Tarifa Operador MX',      value: 0.18, unit: 'USD/mile',     low: 0.15, high: 0.22, updateFrequency: 'Quarterly', costBehavior: 'Variable labor', activation: 'By Country' },
  { section: 'LABOR', field: 'Tarifa Operador US',      value: 0.6,  unit: 'USD/mile',     low: 0.55, high: 0.7,  updateFrequency: 'Quarterly', costBehavior: 'Variable labor', activation: 'By Country' },
  { section: 'LABOR', field: 'Carga Social',            value: 0.3,  unit: '% payroll',    low: 0.25, high: 0.35, updateFrequency: 'Annual',    costBehavior: 'Payroll burden', activation: 'By Country' },
  { section: 'LABOR', field: 'Viáticos MX',             value: 350,  unit: 'MXN/day',      low: 250,  high: 500,  updateFrequency: 'Quarterly', costBehavior: 'Driver travel cost', activation: 'By Country' },
  { section: 'LABOR', field: 'Team Driver Premium',     value: 0.35, unit: '% labor uplift', low: 0.25, high: 0.5, updateFrequency: 'Quarterly', costBehavior: 'Labor premium', activation: 'By Shipment' },
  { section: 'LABOR', field: 'Hazmat Driver Premium',   value: 0.35, unit: '% labor uplift', low: 0.05, high: 0.2, updateFrequency: 'Quarterly', costBehavior: 'Labor premium', activation: 'By Shipment' },

  // ── FINANCE ──────────────────────────────────────────────────────────
  { section: 'FINANCE', field: 'Tipo de Cambio',            value: 17.5,   unit: 'MXN/USD',    low: 0,    high: 0,    updateFrequency: 'Weekly',    costBehavior: 'Currency conversion', activation: 'Always' },
  { section: 'FINANCE', field: 'Cost of Capital MX',        value: 0.14,   unit: 'annual rate', low: 0.12, high: 0.18, updateFrequency: 'Monthly',   costBehavior: 'Finance cost',        activation: 'By Country' },
  { section: 'FINANCE', field: 'Cost of Capital US',        value: 0.1,    unit: 'annual rate', low: 0.08, high: 0.14, updateFrequency: 'Monthly',   costBehavior: 'Finance cost',        activation: 'By Country' },
  { section: 'FINANCE', field: 'Carrier Payment Days',      value: 14,     unit: 'days',        low: 7,    high: 30,   updateFrequency: 'Monthly',   costBehavior: 'AP timing',           activation: 'By Customer' },
  { section: 'FINANCE', field: 'Customer Collection Days',  value: 30,     unit: 'days',        low: 21,   high: 60,   updateFrequency: 'Monthly',   costBehavior: 'AR timing',           activation: 'By Customer' },
  { section: 'FINANCE', field: 'Inflation Buffer',          value: 0.04,   unit: 'annual rate', low: 0.02, high: 0.08, updateFrequency: 'Quarterly', costBehavior: 'Cost escalation',     activation: 'Always' },
  // Monthly fleet fixed cost: insurance ($50k) + admin payroll w/burden ($33.4k) + company expenses ($15.5k)
  // + equipment capital/depreciation ($242.7k) + crossborder compliance ($28.4k) + infrastructure ($9.95k)
  { section: 'FINANCE', field: 'Monthly Fixed Cost',        value: 381384, unit: 'USD/month',   low: 250000, high: 600000, updateFrequency: 'Quarterly', costBehavior: 'Fixed cost allocation', activation: 'Always' },

  // ── UTILIZATION ──────────────────────────────────────────────────────
  { section: 'UTILIZATION', field: 'Deadhead Base',            value: 0.15, unit: '% loaded miles',         low: 0.08, high: 0.3,  updateFrequency: 'Monthly',   costBehavior: 'Empty repositioning',  activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Trailer Utilization',      value: 0.85, unit: 'ratio',                  low: 0.75, high: 0.95, updateFrequency: 'Monthly',   costBehavior: 'Trailer productivity', activation: 'By Equipment' },
  { section: 'UTILIZATION', field: 'Truck Utilization Days',   value: 23,   unit: 'productive days/month',  low: 18,   high: 26,   updateFrequency: 'Monthly',   costBehavior: 'Asset utilization',    activation: 'Always' },
  { section: 'UTILIZATION', field: 'Load Time',                value: 2,    unit: 'hours',                  low: 1,    high: 6,    updateFrequency: 'Quarterly', costBehavior: 'Operational cycle',   activation: 'By Shipment' },
  { section: 'UTILIZATION', field: 'Unload Time',              value: 2,    unit: 'hours',                  low: 1,    high: 6,    updateFrequency: 'Quarterly', costBehavior: 'Operational cycle',   activation: 'By Shipment' },
  { section: 'UTILIZATION', field: 'Free Time',                value: 2,    unit: 'hours/event',            low: 1,    high: 4,    updateFrequency: 'Quarterly', costBehavior: 'Detention threshold', activation: 'By Contract' },
  { section: 'UTILIZATION', field: 'Detention Rate',           value: 85,   unit: 'USD/hour',               low: 60,   high: 125,  updateFrequency: 'Quarterly', costBehavior: 'Delay pricing',       activation: 'By Contract' },
  // Maint+Tires: PM 10k/100k/250k ($0.10/km) + reserves DEF/DPF/PM-unsched/lubs ($0.08/km) + tires ($0.05/km)
  { section: 'UTILIZATION', field: 'Maint and Tires Rate per KM', value: 0.23, unit: 'USD/km',            low: 0.15, high: 0.35, updateFrequency: 'Quarterly', costBehavior: 'Maintenance + tires',  activation: 'By Equipment' },

  // ── BORDER ───────────────────────────────────────────────────────────
  { section: 'BORDER', field: 'Border Friction Time',       value: 0.75, unit: 'days/trip',  low: 0.25, high: 2,    updateFrequency: 'Monthly',   costBehavior: 'Cross-border delay',    activation: 'By Border' },
  // Transactional: Border Crossing Fee $175 + ACE/eManifest $25 + Yard Transfer $150 = $350/trip
  { section: 'BORDER', field: 'Border Transactional Cost',  value: 350,  unit: 'USD/trip',   low: 200,  high: 600,  updateFrequency: 'Monthly',   costBehavior: 'Per-trip border cost',  activation: 'By Border' },
  { section: 'BORDER', field: 'Inspection Delay Reserve',   value: 0.02, unit: '% linehaul', low: 0,    high: 0.08, updateFrequency: 'Monthly',   costBehavior: 'Inspection risk',       activation: 'By Border' },

  // ── RISK ─────────────────────────────────────────────────────────────
  { section: 'RISK', field: 'MX Security Risk Reserve',  value: 0.03, unit: '% MX linehaul', low: 0,    high: 0.08, updateFrequency: 'Monthly',    costBehavior: 'Risk reserve',     activation: 'By Lane' },
  { section: 'RISK', field: 'Tight Market Premium',      value: 0.10, unit: '% uplift',       low: 0,    high: 0.25, updateFrequency: 'Weekly',     costBehavior: 'Market risk',      activation: 'By Market' },
  { section: 'RISK', field: 'Expedited Premium',         value: 0.20, unit: '% uplift',       low: 0.1,  high: 0.4,  updateFrequency: 'Weekly',     costBehavior: 'Service risk',     activation: 'By Shipment' },
  { section: 'RISK', field: 'Flatbed Complexity Factor', value: 0.25, unit: '% uplift',       low: 0,    high: 0.15, updateFrequency: 'Quarterly',  costBehavior: 'Equipment risk',   activation: 'By Equipment' },
  { section: 'RISK', field: 'Hazmat Premium',            value: 0.35, unit: '% uplift',       low: 0.1,  high: 0.35, updateFrequency: 'Quarterly',  costBehavior: 'Commodity risk',   activation: 'By Shipment' },
  { section: 'RISK', field: 'Weather Disruption Buffer', value: 0.02, unit: '% uplift',       low: 0,    high: 0.08, updateFrequency: 'Seasonal',   costBehavior: 'Weather risk',     activation: 'By Season' },
  { section: 'RISK', field: 'Config Risk Premium Tandem', value: 0.1, unit: '% uplift',       low: 0,    high: 0,    updateFrequency: 'Annual',     costBehavior: '% technical cost', activation: 'By Config' },

  // ── CONFIG ───────────────────────────────────────────────────────────
  { section: 'CONFIG', field: 'Tandem Toll Premium',       value: 0.3,  unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: '% base tolls',     activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem Fuel Penalty',       value: 0.12, unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: '% efficiency loss', activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem Maint/Tires Factor', value: 1.35, unit: 'factor',   low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor',           activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem CFU Factor',         value: 1.2,  unit: 'factor',   low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor',           activation: 'By Config' },

  // ── TECHNICAL_MARGIN ─────────────────────────────────────────────────
  { section: 'TECHNICAL_MARGIN', field: 'UT Rate One Way',  value: 0.3,  unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor', activation: 'By UT' },
  { section: 'TECHNICAL_MARGIN', field: 'UT Rate Backhaul', value: 0.1,  unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor', activation: 'By UT' },
  { section: 'TECHNICAL_MARGIN', field: 'UT Rate Roundtrip', value: 0.2, unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor', activation: 'By UT' },
] as const

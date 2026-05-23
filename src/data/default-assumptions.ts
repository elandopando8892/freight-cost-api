// Default assumption parameters extracted from the MARKSMAN D2D.01 Freight Cost Model spreadsheet
// Values verified against d2d_mexRateProduction production sheet
export const DEFAULT_ASSUMPTIONS = [
  // ── GENERAL_BASE ──────────────────────────────────────────────────────
  { section: 'GENERAL_BASE', field: 'Rendimiento',             value: 3,        unit: 'km/L',            low: 2.5,   high: 3.5,   updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency (km per liter)',    activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'CBVR Rate per KM',        value: 0.6676,   unit: 'USD/km',          low: 0.55,  high: 0.85,  updateFrequency: 'Monthly',   costBehavior: 'Variable route cost per km',        activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'UT Per Trip',             value: 80,       unit: 'USD/trip',        low: 60,    high: 110,   updateFrequency: 'Quarterly', costBehavior: 'Per-trip overhead (Utilidad Det.)',  activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Gasto Adicional sobre Ruta', value: 0.05,  unit: '% route expenses', low: 0,    high: 0.1,   updateFrequency: 'Quarterly', costBehavior: 'Operational contingency',           activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Periodo de Operación',    value: 26,       unit: 'days/month',      low: 24,    high: 28,    updateFrequency: 'Semiannual', costBehavior: 'Fixed cost allocation',            activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Tamaño de Flota',         value: 50,       unit: 'tractors',        low: 25,    high: 100,   updateFrequency: 'Semiannual', costBehavior: 'Scale allocation',                 activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Índice de Operatividad',  value: 0.9,      unit: 'ratio',           low: 0.85,  high: 0.93,  updateFrequency: 'Monthly',   costBehavior: 'Fleet utilization',                activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Operadores',              value: 52,       unit: 'operators',       low: 50,    high: 58,    updateFrequency: 'Monthly',   costBehavior: 'Driver coverage',                  activation: 'Always' },
  { section: 'GENERAL_BASE', field: 'Kilómetros promedio x operador', value: 22000, unit: 'km/month/operator', low: 14000, high: 22000, updateFrequency: 'Monthly', costBehavior: 'Productivity',              activation: 'Always' },

  // ── FUEL ─────────────────────────────────────────────────────────────
  { section: 'FUEL', field: 'Diesel MX',             value: 28,    unit: 'MXN/L',       low: 25,   high: 31,   updateFrequency: 'Weekly',    costBehavior: 'Fuel cost (MX domestic routes)',  activation: 'By Country' },
  { section: 'FUEL', field: 'Diesel US Border',       value: 0.95,  unit: 'USD/L',       low: 0.75, high: 1.20, updateFrequency: 'Weekly',    costBehavior: 'Fuel cost (US border / D2D)',     activation: 'By Country' },
  { section: 'FUEL', field: 'Diesel MX USD/L',        value: 1.20,  unit: 'USD/L',       low: 0.90, high: 1.60, updateFrequency: 'Weekly',    costBehavior: 'MX diesel fallback in USD',       activation: 'By Country' },
  { section: 'FUEL', field: 'Fuel Purchase Mix MX',   value: 0.5,   unit: 'ratio',       low: 0.1,  high: 0.8,  updateFrequency: 'Monthly',   costBehavior: 'Fuel sourcing mix (domestic)',    activation: 'By Lane' },
  { section: 'FUEL', field: 'Fuel Purchase Mix US',   value: 0.5,   unit: 'ratio',       low: 0.2,  high: 0.9,  updateFrequency: 'Monthly',   costBehavior: 'Fuel sourcing mix (US)',          activation: 'By Lane' },
  { section: 'FUEL', field: 'Rendimiento Cargado',    value: 2.8,   unit: 'km/L',        low: 2.2,  high: 3.1,  updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency loaded',          activation: 'By Equipment' },
  { section: 'FUEL', field: 'Rendimiento Vacío',      value: 3.2,   unit: 'km/L',        low: 2.7,  high: 3.7,  updateFrequency: 'Quarterly', costBehavior: 'Fuel efficiency empty',           activation: 'By Equipment' },
  { section: 'FUEL', field: 'Fuel Escalation Buffer', value: 0.05,  unit: '% fuel cost', low: 0,    high: 0.15, updateFrequency: 'Monthly',   costBehavior: 'Fuel volatility reserve',         activation: 'By Market' },

  // ── LABOR ─────────────────────────────────────────────────────────────
  { section: 'LABOR', field: 'Sueldo Base Operador MX', value: 500,  unit: 'MXN/day',     low: 350,  high: 650,  updateFrequency: 'Quarterly', costBehavior: 'Fixed labor',    activation: 'By Country' },
  { section: 'LABOR', field: 'Tarifa Operador MX',      value: 0.18, unit: 'USD/mile',    low: 0.15, high: 0.22, updateFrequency: 'Quarterly', costBehavior: 'Variable labor', activation: 'By Country' },
  { section: 'LABOR', field: 'Tarifa Operador US',      value: 0.6,  unit: 'USD/mile',    low: 0.55, high: 0.7,  updateFrequency: 'Quarterly', costBehavior: 'Variable labor', activation: 'By Country' },
  { section: 'LABOR', field: 'Carga Social',            value: 0.3,  unit: '% payroll',   low: 0.25, high: 0.35, updateFrequency: 'Annual',    costBehavior: 'Payroll burden', activation: 'By Country' },
  { section: 'LABOR', field: 'Viáticos MX',             value: 350,  unit: 'MXN/day',     low: 250,  high: 500,  updateFrequency: 'Quarterly', costBehavior: 'Driver travel cost', activation: 'By Country' },
  { section: 'LABOR', field: 'Team Driver Premium',     value: 0.35, unit: '% labor uplift', low: 0.25, high: 0.5, updateFrequency: 'Quarterly', costBehavior: 'Labor premium', activation: 'By Shipment' },
  { section: 'LABOR', field: 'Hazmat Driver Premium',   value: 0.35, unit: '% labor uplift', low: 0.05, high: 0.2, updateFrequency: 'Quarterly', costBehavior: 'Labor premium', activation: 'By Shipment' },

  // ── FINANCE ──────────────────────────────────────────────────────────
  // CBFA Daily Rate = sum of all fixed cost items per productive truck-day
  //   (insurance + admin payroll + capex + cross-border compliance + infrastructure)
  //   = $381,384/month ÷ 50 tractors ÷ 0.90 operativity ÷ 23 productive days ÷ 0.85 trailer utilization = $73.5648/truck-day
  { section: 'FINANCE', field: 'CBFA Daily Rate',          value: 73.5648, unit: 'USD/truck-day', low: 55,    high: 100,   updateFrequency: 'Monthly',   costBehavior: 'Fixed asset base cost (amortized)',  activation: 'Always' },
  { section: 'FINANCE', field: 'Tipo de Cambio',           value: 17.5,    unit: 'MXN/USD',      low: 0,     high: 0,     updateFrequency: 'Weekly',    costBehavior: 'Currency conversion',               activation: 'Always' },
  { section: 'FINANCE', field: 'Cost of Capital MX',       value: 0.14,    unit: 'annual rate',  low: 0.12,  high: 0.18,  updateFrequency: 'Monthly',   costBehavior: 'Finance cost',                      activation: 'By Country' },
  { section: 'FINANCE', field: 'Cost of Capital US',       value: 0.10,    unit: 'annual rate',  low: 0.08,  high: 0.14,  updateFrequency: 'Monthly',   costBehavior: 'Finance cost',                      activation: 'By Country' },
  { section: 'FINANCE', field: 'Carrier Payment Days',     value: 14,      unit: 'days',         low: 7,     high: 30,    updateFrequency: 'Monthly',   costBehavior: 'AP timing',                         activation: 'By Customer' },
  { section: 'FINANCE', field: 'Customer Collection Days', value: 30,      unit: 'days',         low: 21,    high: 60,    updateFrequency: 'Monthly',   costBehavior: 'AR timing',                         activation: 'By Customer' },
  { section: 'FINANCE', field: 'Inflation Buffer',         value: 0.04,    unit: 'annual rate',  low: 0.02,  high: 0.08,  updateFrequency: 'Quarterly', costBehavior: 'Cost escalation',                   activation: 'Always' },
  { section: 'FINANCE', field: 'Monthly Fixed Cost',       value: 381384,  unit: 'USD/month',    low: 250000, high: 600000, updateFrequency: 'Quarterly', costBehavior: 'Fixed cost allocation',            activation: 'Always' },

  // ── UTILIZATION ──────────────────────────────────────────────────────
  { section: 'UTILIZATION', field: 'Avg Speed KmH',            value: 55,   unit: 'km/h',                   low: 45,   high: 65,   updateFrequency: 'Quarterly', costBehavior: 'Transit time estimation',     activation: 'Always' },
  { section: 'UTILIZATION', field: 'CAGR Daily Rate',           value: 21.4286, unit: 'USD/12h-day',        low: 15,   high: 30,   updateFrequency: 'Monthly',   costBehavior: 'Route/toll expense coefficient', activation: 'Always' },
  { section: 'UTILIZATION', field: 'Load Time',                 value: 2,    unit: 'hours',                  low: 1,    high: 6,    updateFrequency: 'Quarterly', costBehavior: 'Operational cycle',           activation: 'By Shipment' },
  { section: 'UTILIZATION', field: 'Unload Time',               value: 2,    unit: 'hours',                  low: 1,    high: 6,    updateFrequency: 'Quarterly', costBehavior: 'Operational cycle',           activation: 'By Shipment' },
  { section: 'UTILIZATION', field: 'Deadhead Base',             value: 0.15, unit: '% loaded miles',         low: 0.08, high: 0.3,  updateFrequency: 'Monthly',   costBehavior: 'Empty repositioning',         activation: 'By Lane' },
  { section: 'UTILIZATION', field: 'Trailer Utilization',       value: 0.85, unit: 'ratio',                  low: 0.75, high: 0.95, updateFrequency: 'Monthly',   costBehavior: 'Trailer productivity',        activation: 'By Equipment' },
  { section: 'UTILIZATION', field: 'Truck Utilization Days',    value: 23,   unit: 'productive days/month',  low: 18,   high: 26,   updateFrequency: 'Monthly',   costBehavior: 'Asset utilization',           activation: 'Always' },
  { section: 'UTILIZATION', field: 'Free Time',                 value: 2,    unit: 'hours/event',            low: 1,    high: 4,    updateFrequency: 'Quarterly', costBehavior: 'Detention threshold',         activation: 'By Contract' },
  { section: 'UTILIZATION', field: 'Detention Rate',            value: 85,   unit: 'USD/hour',               low: 60,   high: 125,  updateFrequency: 'Quarterly', costBehavior: 'Delay pricing',               activation: 'By Contract' },
  { section: 'UTILIZATION', field: 'Maint and Tires Rate per KM', value: 0.23, unit: 'USD/km',              low: 0.15, high: 0.35, updateFrequency: 'Quarterly', costBehavior: 'Maintenance + tires',         activation: 'By Equipment' },

  // ── BORDER ───────────────────────────────────────────────────────────
  { section: 'BORDER', field: 'Border Friction Time',      value: 0.75, unit: 'days/trip',  low: 0.25, high: 2,    updateFrequency: 'Monthly', costBehavior: 'Cross-border delay',    activation: 'By Border' },
  { section: 'BORDER', field: 'Border Transactional Cost', value: 350,  unit: 'USD/trip',   low: 200,  high: 600,  updateFrequency: 'Monthly', costBehavior: 'Per-trip border cost',  activation: 'By Border' },
  { section: 'BORDER', field: 'Inspection Delay Reserve',  value: 0.02, unit: '% linehaul', low: 0,    high: 0.08, updateFrequency: 'Monthly', costBehavior: 'Inspection risk',       activation: 'By Border' },

  // ── RISK ─────────────────────────────────────────────────────────────
  { section: 'RISK', field: 'MX Security Risk Reserve',   value: 0.03, unit: '% MX linehaul', low: 0,   high: 0.08, updateFrequency: 'Monthly',   costBehavior: 'Risk reserve',     activation: 'By Lane' },
  { section: 'RISK', field: 'Tight Market Premium',       value: 0.10, unit: '% uplift',      low: 0,   high: 0.25, updateFrequency: 'Weekly',    costBehavior: 'Market risk',      activation: 'By Market' },
  { section: 'RISK', field: 'Expedited Premium',          value: 0.20, unit: '% uplift',      low: 0.1, high: 0.4,  updateFrequency: 'Weekly',    costBehavior: 'Service risk',     activation: 'By Shipment' },
  { section: 'RISK', field: 'Flatbed Complexity Factor',  value: 0.25, unit: '% uplift',      low: 0,   high: 0.40, updateFrequency: 'Quarterly', costBehavior: 'Equipment risk',   activation: 'By Equipment' },
  { section: 'RISK', field: 'Hazmat Premium',             value: 0.35, unit: '% uplift',      low: 0.1, high: 0.35, updateFrequency: 'Quarterly', costBehavior: 'Commodity risk',   activation: 'By Shipment' },
  { section: 'RISK', field: 'Weather Disruption Buffer',  value: 0.02, unit: '% uplift',      low: 0,   high: 0.08, updateFrequency: 'Seasonal',  costBehavior: 'Weather risk',     activation: 'By Season' },
  { section: 'RISK', field: 'Config Risk Premium Tandem', value: 0.10, unit: '% uplift',      low: 0,   high: 0.15, updateFrequency: 'Annual',    costBehavior: '% technical cost', activation: 'By Config' },

  // ── CONFIG ───────────────────────────────────────────────────────────
  { section: 'CONFIG', field: 'Tandem Toll Premium',       value: 0.30, unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: '% base tolls',      activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem Fuel Penalty',       value: 0.12, unit: '% uplift', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: '% efficiency loss', activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem Maint/Tires Factor', value: 1.35, unit: 'factor',   low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor',            activation: 'By Config' },
  { section: 'CONFIG', field: 'Tandem CFU Factor',         value: 1.20, unit: 'factor',   low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'factor',            activation: 'By Config' },

  // ── TECHNICAL_MARGIN — km-tier margin table ───────────────────────────
  // Verified from d2d_mexRateProduction: MARGEN = CBTT × margenPct by km tier
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 1 Max',    value: 501,   unit: 'km', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Upper bound for Tier 1 (≤501 km)', activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 1 Margin', value: 0.40,  unit: 'ratio', low: 0.25, high: 0.60, updateFrequency: 'Annual', costBehavior: 'Margin % for short routes',       activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 2 Max',    value: 1001,  unit: 'km', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Upper bound for Tier 2 (≤1001 km)', activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 2 Margin', value: 0.35,  unit: 'ratio', low: 0.20, high: 0.55, updateFrequency: 'Annual', costBehavior: 'Margin % for mid-range routes',   activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 3 Max',    value: 1501,  unit: 'km', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Upper bound for Tier 3 (≤1501 km)', activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 3 Margin', value: 0.30,  unit: 'ratio', low: 0.15, high: 0.50, updateFrequency: 'Annual', costBehavior: 'Margin % for long routes',        activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 4 Max',    value: 2001,  unit: 'km', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Upper bound for Tier 4 (≤2001 km)', activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 4 Margin', value: 0.25,  unit: 'ratio', low: 0.10, high: 0.45, updateFrequency: 'Annual', costBehavior: 'Margin % for extra-long routes',  activation: 'Always' },
  { section: 'TECHNICAL_MARGIN', field: 'Tier KM 5 Margin', value: 0.20,  unit: 'ratio', low: 0.10, high: 0.40, updateFrequency: 'Annual', costBehavior: 'Margin % for transcontinental',   activation: 'Always' },

  // ── FACTORS — multiplier table from d2dFactors sheet ─────────────────
  // Trailer type factors
  { section: 'FACTORS', field: 'Trailer Factor Dry Van',    value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Trailer Factor Flatbed',    value: 1.25, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Trailer Factor Reefer',     value: 2.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Trailer Factor Hazmat',     value: 1.50, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Trailer Factor Chassis',    value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Trailer Factor Power Only', value: 0.80, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Trailer Factor Overdim',    value: 5.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Trailer type ICEM multiplier', activation: 'By Equipment' },
  // Operation type factors
  { section: 'FACTORS', field: 'Op Factor D2D Export',    value: 1.20, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Op Factor D2D Import',    value: 0.70, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Op Factor MX Northbound', value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Op Factor MX Southbound', value: 0.50, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Op Factor Local',         value: 0.25, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Op Factor Drayage',       value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Op Factor Intra-Mex',     value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Operation ICEM multiplier', activation: 'By Lane' },
  // Service type factors
  { section: 'FACTORS', field: 'Svc Factor One Way',   value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Service CBVR multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Svc Factor Backhaul',  value: 0.40, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Service CBVR multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Svc Factor Roundtrip', value: 1.50, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Service CBVR multiplier', activation: 'By Lane' },
  { section: 'FACTORS', field: 'Svc Factor Expedited', value: 2.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Service CBVR multiplier', activation: 'By Lane' },
  // Equipment config factors
  { section: 'FACTORS', field: 'Config Factor Single', value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Config ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Config Factor Tandem', value: 1.30, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Config ICEM multiplier', activation: 'By Equipment' },
  // Driver type factors
  { section: 'FACTORS', field: 'Driver Factor B1',         value: 1.00, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Driver ICEM multiplier', activation: 'By Equipment' },
  { section: 'FACTORS', field: 'Driver Factor Licencia E', value: 1.25, unit: 'factor', low: 0, high: 0, updateFrequency: 'Annual', costBehavior: 'Driver ICEM multiplier', activation: 'By Equipment' },
] as const

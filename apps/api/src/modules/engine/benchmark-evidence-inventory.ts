import { PARAMETER_DEFINITIONS } from '../../data/parameter-catalog.js'

export const PILOT_ECONOMIC_SECTIONS = [
  'COST_CAPITAL', 'COST_COMPANY', 'COST_INSURANCE', 'COST_MAINT', 'COST_PAYROLL',
  'COST_TIRES', 'FINANCE', 'FUEL', 'GENERAL_BASE', 'LABOR', 'RISK',
  'TECHNICAL_MARGIN', 'UTILIZATION',
] as const

type Country = 'MX' | 'US'
type ResearchStatus = 'CANDIDATO' | 'CONTRASTE' | 'FALTANTE'
export type EvidenceRegisterRow = {
  key: string; section: string; unit: string; countries: Country[]; rates: string[]
  status: ResearchStatus; sourceLocator: string; adoptionGap: string
}
type Requirements = Record<Country, Record<string, string[]>>
type InventoryIssue = { key: string; country?: Country; code: string }
const countries = ['MX', 'US'] as const
const definitions = new Map(PARAMETER_DEFINITIONS.map(p => [p.key, p]))
const statuses: ResearchStatus[] = ['CANDIDATO', 'CONTRASTE', 'FALTANTE']
const unwrap = (text: string) => text.replace(/[`*]/g, '').trim()

/** Reads only the research table, never the catalog's recommended values. */
export function parseBenchmarkEvidenceRegister(markdown: string): EvidenceRegisterRow[] {
  const rows: EvidenceRegisterRow[] = []
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (!/^\s*\|\s*`?fcm\./.test(line)) continue
    const cells = line.trim().split('|').slice(1, -1).map(cell => cell.trim())
    if (cells.length !== 8) throw new Error(`Invalid evidence register row ${index + 1}: expected eight columns`)
    const [key, label, unit, countryCell, rateCell, statusCell, sourceLocator, adoptionGap] = cells
    const rowCountries = countryCell.split('/').map(country => country.trim())
    const status = unwrap(statusCell)
    const rates = rateCell.split(/<br\s*\/?\s*>/i).map(unwrap)
    const section = label.split('·')[0].trim()
    if (!rowCountries.length || rowCountries.some(country => country !== 'MX' && country !== 'US') ||
        new Set(rowCountries).size !== rowCountries.length || !statuses.includes(status as ResearchStatus) ||
        !section || !unwrap(unit) || rates.some(rate => !rate) || new Set(rates).size !== rates.length ||
        !sourceLocator || !adoptionGap) {
      throw new Error(`Invalid evidence register row ${index + 1}: invalid research metadata`)
    }
    rows.push({ key: unwrap(key), section, unit: unwrap(unit), countries: rowCountries as Country[],
      rates, status: status as ResearchStatus, sourceLocator, adoptionGap })
  }
  if (!rows.length) throw new Error('Evidence register has no canonical parameter rows')
  return rows
}

/** Documentation coverage is not source verification, calibration or adoption. */
export function reconcileBenchmarkEvidenceInventory(rows: EvidenceRegisterRow[], requirements: Requirements) {
  const issues: InventoryIssue[] = []
  const registered = new Map<string, EvidenceRegisterRow>()
  for (const row of rows) {
    if (registered.has(row.key)) issues.push({ key: row.key, code: 'DUPLICATE_REGISTER_KEY' })
    else registered.set(row.key, row)
    const definition = definitions.get(row.key)
    if (!definition) issues.push({ key: row.key, code: 'UNKNOWN_REGISTER_KEY' })
    else {
      if (definition.section !== row.section) issues.push({ key: row.key, code: 'SECTION_MISMATCH' })
      if (definition.unit !== row.unit) issues.push({ key: row.key, code: 'UNIT_MISMATCH' })
    }
  }
  const neededByCountry = Object.fromEntries(countries.map(country =>
    [country, new Set(Object.values(requirements[country]).flat())])) as Record<Country, Set<string>>
  const neededUnion = new Set(countries.flatMap(country => [...neededByCountry[country]]))
  for (const row of rows) {
    if (!neededUnion.has(row.key)) issues.push({ key: row.key, code: 'UNUSED_REGISTER_KEY' })
    for (const country of row.countries) {
      if (!neededByCountry[country].has(row.key)) issues.push({ key: row.key, country, code: 'UNUSED_COUNTRY_ENTRY' })
    }
    const actualRates = new Set(countries.flatMap(country => Object.entries(requirements[country])
      .filter(([, keys]) => keys.includes(row.key)).map(([rate]) => rate)))
    if (row.rates.length !== actualRates.size || row.rates.some(rate => !actualRates.has(rate))) {
      issues.push({ key: row.key, code: 'RATE_DEPENDENCY_MISMATCH' })
    }
  }
  const counts = (keys: string[], country?: Country) => {
    const scopedRows = keys.map(key => registered.get(key)).map(row =>
      row && (!country || row.countries.includes(country)) ? row : undefined)
    return { required: keys.length, documented: scopedRows.filter(Boolean).length,
      candidate: scopedRows.filter(row => row?.status === 'CANDIDATO').length,
      contrast: scopedRows.filter(row => row?.status === 'CONTRASTE').length,
      missingEvidence: scopedRows.filter(row => row?.status === 'FALTANTE').length,
      undocumented: scopedRows.filter(row => !row).length, adopted: 0 }
  }
  const countryReports = countries.map(country => {
    const keys = [...neededByCountry[country]]
    for (const key of keys) {
      if (!definitions.has(key)) issues.push({ key, country, code: 'UNKNOWN_FORMULA_KEY' })
      const row = registered.get(key)
      if (!row) issues.push({ key, country, code: 'UNDOCUMENTED_REQUIREMENT' })
      else if (!row.countries.includes(country)) issues.push({ key, country, code: 'MISSING_COUNTRY_ENTRY' })
    }
    return { country, counts: counts(keys, country),
      sections: PILOT_ECONOMIC_SECTIONS.map(section => {
        const sectionKeys = keys.filter(key => definitions.get(key)?.section === section)
        return { section, formulaScope: sectionKeys.length ? 'CONSUMED' : 'NOT_CONSUMED_NOT_CERTIFIED',
          counts: counts(sectionKeys, country) }
      }),
      rates: Object.entries(requirements[country]).map(([rate, rateKeys]) => ({
        rate, economicStatus: 'REVIEW_REQUIRED', counts: counts([...new Set(rateKeys)], country),
        parameters: [...new Set(rateKeys)].map(key => {
          const row = registered.get(key)
          const scopedRow = row?.countries.includes(country) ? row : undefined
          const definition = definitions.get(key)
          return { key, section: definition?.section ?? null, field: definition?.field ?? null,
            unit: definition?.unit ?? null, researchStatus: scopedRow?.status ?? 'UNDOCUMENTED',
            sourceLocator: scopedRow?.sourceLocator ?? null, adoptionGap: scopedRow?.adoptionGap ?? null }
        }),
      })) }
  })
  return { model: 'FCM_B1_EVIDENCE_INVENTORY_V1',
    inventoryStatus: issues.length ? 'BLOCKED' : 'DOCUMENTATION_RECONCILED',
    economicStatus: 'INCOMPLETE', calibrated: false, quoteReady: false, parameterValuesIncluded: false,
    counts: counts([...neededUnion]), countries: countryReports, issues,
    exclusions: ['Trip distances/time, tolls and border/interchange events require separate route evidence.',
      'Purchase and sale prices are independent; public comparisons do not determine either.',
      'A documented candidate or contrast is not an adopted parameter or a verified source.',
      'Sections not consumed by these formulas remain uncalibrated, not approved or irrelevant.'] }
}

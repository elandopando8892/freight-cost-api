import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
// Any accidental access to a database fails, not just connections to live data.
vi.mock('../src/config/prisma.js', () => ({ prisma: new Proxy({}, {
  get() { throw new Error('Database access is forbidden in the inventory audit') },
}) }))
import { benchmarkRateRequirements } from '../src/modules/engine/benchmark-rates.js'
import { parseBenchmarkEvidenceRegister, reconcileBenchmarkEvidenceInventory, PILOT_ECONOMIC_SECTIONS } from '../src/modules/engine/benchmark-evidence-inventory.js'

const markdown = readFileSync(resolve(__dirname, '../../../docs/C1_B1_PARAMETER_SOURCE_REGISTER_2026-09-29.md'), 'utf8')
const requirements = { MX: benchmarkRateRequirements('MX'), US: benchmarkRateRequirements('US') }
const register = () => parseBenchmarkEvidenceRegister(markdown)
const report = () => reconcileBenchmarkEvidenceInventory(register(), requirements)

describe('B1 research evidence inventory', () => {
  it('keeps the original dated inventory pinned and preserves later documentation in a revision', () => {
    const manifest=JSON.parse(readFileSync(resolve(__dirname,'../../../docs/research/B2_ECONOMIC_REFERENCE_CARDS_2026-09-30.json'),'utf8'))
    const pin=manifest.sources.find((s:{id:string}) => s.id==='inventory')
    expect(createHash('sha256').update(markdown).digest('hex')).toBe(pin.sha256)
    expect(pin.sha256).toBe('a31864f52ce5cd3d9f111056ec4dc58181587e99258614f1e2636e61ff992f0a')
    const latest=readFileSync(resolve(__dirname,'../../../docs/C1_B1_PARAMETER_SOURCE_REGISTER_2026-10-01.md'),'utf8')
    const revised=parseBenchmarkEvidenceRegister(latest)
    const previous=register()
    expect(revised.map(r => [r.key,r.section,r.unit,r.countries,r.rates,r.status])).toEqual(
      previous.map(r => [r.key,r.section,r.unit,r.countries,r.rates,r.status]))
    const updatedKey='fcm.v3.cost-insurance.periodo-de-poliza'
    expect(revised.filter(r => r.key!==updatedKey)).toEqual(previous.filter(r => r.key!==updatedKey))
    expect(revised.find(r => r.key===updatedKey)!.sourceLocator).toContain('B2_INSURANCE_EMPLOYER_COMPONENTS_2026-10-01.md')
    expect(revised.find(r => r.key===updatedKey)!.status).toBe('FALTANTE')
    expect(latest).toContain('Adaptador de investigación implementado el1oct')
    expect(markdown).toContain('Adaptador no implementado.')
    expect(reconcileBenchmarkEvidenceInventory(revised,requirements)).toMatchObject({
      issues:[],counts:{required:135,documented:135,candidate:3,contrast:47,missingEvidence:85,adopted:0},
      calibrated:false,quoteReady:false,economicStatus:'INCOMPLETE'})
  })
  it('reconciles the actual register with current formula dependencies without values', () => {
    const result = report()
    expect(result.issues).toEqual([])
    expect(result.inventoryStatus).toBe('DOCUMENTATION_RECONCILED')
    expect(result.counts).toEqual({ required: 135, documented: 135, candidate: 3,
      contrast: 47, missingEvidence: 85, undocumented: 0, adopted: 0 })
    expect(result.countries.map(country => country.counts.required)).toEqual([132, 131])
    expect(JSON.stringify(result)).not.toMatch(/"(?:value|defaultValue|low|high)"\s*:/)
  })
  it('does not certify unconsumed sections or count them as economic completion', () => {
    for (const country of report().countries) {
      expect(country.sections.map(section => section.section)).toEqual(PILOT_ECONOMIC_SECTIONS)
      for (const section of country.sections.filter(section => ['RISK', 'UTILIZATION', 'TECHNICAL_MARGIN'].includes(section.section))) {
        expect(section.formulaScope).toBe('NOT_CONSUMED_NOT_CERTIFIED')
        expect(section.counts.required).toBe(0)
      }
    }
  })
  it('keeps administrative social burden separate from the driver rate dependency', () => {
    for (const country of ['MX', 'US'] as const) {
      expect(requirements[country].monthlyFixedUsd).toContain('fcm.v3.labor.carga-social')
      expect(requirements[country].driverUsdPerKm).toEqual([
        `fcm.v3.labor.tarifa-operador-${country.toLowerCase()}`,
      ])
    }
    // This does not certify driver total compensation; B2 must document benefits.
    expect(report()).toMatchObject({ economicStatus: 'INCOMPLETE', calibrated: false, quoteReady: false })
  })
  it('keeps research incomplete even when every entry is a candidate', () => {
    const rows = register().map(row => ({ ...row, status: 'CANDIDATO' as const }))
    expect(reconcileBenchmarkEvidenceInventory(rows, requirements)).toMatchObject({
      inventoryStatus: 'DOCUMENTATION_RECONCILED', economicStatus: 'INCOMPLETE', calibrated: false,
      quoteReady: false, parameterValuesIncluded: false, counts: { adopted: 0 },
    })
  })
  it('reports every rate affected by an omitted parameter without fallback', () => {
    const rows = register(); const removed = rows.shift()!
    const result = reconcileBenchmarkEvidenceInventory(rows, requirements)
    expect(result.inventoryStatus).toBe('BLOCKED')
    expect(result.counts.undocumented).toBe(1)
    for (const country of result.countries) {
      expect(result.issues).toContainEqual({ key: removed.key, country: country.country, code: 'UNDOCUMENTED_REQUIREMENT' })
      for (const rate of country.rates.filter(rate => removed.rates.includes(rate.rate))) {
        expect(rate.parameters.find(parameter => parameter.key === removed.key)?.researchStatus).toBe('UNDOCUMENTED')
      }
    }
  })
  it.each(['UNIT_MISMATCH', 'SECTION_MISMATCH', 'RATE_DEPENDENCY_MISMATCH', 'DUPLICATE_REGISTER_KEY', 'UNKNOWN_REGISTER_KEY'])(
    'blocks %s rather than masking documentary drift', code => {
      const rows = register()
      if (code === 'UNIT_MISMATCH') rows[0].unit = 'wrong'
      if (code === 'SECTION_MISMATCH') rows[0].section = 'FUEL'
      if (code === 'RATE_DEPENDENCY_MISMATCH') rows[0].rates = ['imaginaryRate']
      if (code === 'DUPLICATE_REGISTER_KEY') rows.push({ ...rows[0] })
      if (code === 'UNKNOWN_REGISTER_KEY') rows[0].key = 'fcm.v3.unknown'
      const result = reconcileBenchmarkEvidenceInventory(rows, requirements)
      expect(result.inventoryStatus).toBe('BLOCKED')
      expect(result.issues.some(issue => issue.code === code)).toBe(true)
    })
  it('does not borrow MX documentary coverage for a US requirement', () => {
    const rows = register(); rows[0].countries = ['MX']
    const result = reconcileBenchmarkEvidenceInventory(rows, requirements)
    expect(result.issues).toContainEqual({ key: rows[0].key, country: 'US', code: 'MISSING_COUNTRY_ENTRY' })
    expect(result.countries[1].counts.undocumented).toBe(1)
  })
  it('finds removed formula inputs rather than retaining a stale register', () => {
    const rows = register(); const key = rows[0].key
    const changed = Object.fromEntries(Object.entries(requirements).map(([country, rates]) =>
      [country, Object.fromEntries(Object.entries(rates).map(([rate, keys]) => [rate, keys.filter(item => item !== key)]))])) as typeof requirements
    expect(reconcileBenchmarkEvidenceInventory(rows, changed).issues).toContainEqual({ key, code: 'UNUSED_REGISTER_KEY' })
  })
  it('detects new dependencies even when the register has not changed', () => {
    const key = 'fcm.v3.unknown-new-formula-input'
    const result = reconcileBenchmarkEvidenceInventory(register(), {
      MX: { ...requirements.MX, addedRate: [key] }, US: requirements.US,
    })
    expect(result.issues).toContainEqual({ key, country: 'MX', code: 'UNKNOWN_FORMULA_KEY' })
    expect(result.issues).toContainEqual({ key, country: 'MX', code: 'UNDOCUMENTED_REQUIREMENT' })
  })
  it.each(['ADOPTADO', 'CERTIFIED', 'MX / MX', 'CA', 'CANDIDATO | extra'])('rejects invalid metadata %s', replacement => {
    const row = '| `fcm.v3.fuel.diesel-mx` | FUEL · Diesel MX | `MXN/L` | MX | dieselUsdPerLiter | **CANDIDATO** | [CNE] | Review needed |'
    const changed = replacement.includes('MX') || replacement === 'CA'
      ? row.replace('| MX |', `| ${replacement} |`) : row.replace('**CANDIDATO**', replacement)
    expect(() => parseBenchmarkEvidenceRegister(changed)).toThrow()
  })
  it('rejects an empty register', () => { expect(() => parseBenchmarkEvidenceRegister('# No rows')).toThrow() })
})

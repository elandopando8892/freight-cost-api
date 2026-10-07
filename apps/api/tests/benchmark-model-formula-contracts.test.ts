import { describe, expect, it } from 'vitest'
import { auditFixedMaintenanceFormulaContracts } from '../scripts/lib/model-formula-contracts.js'
import { deriveMaintTiresPerKm, deriveMonthlyFixedCost } from '../src/modules/engine/engine.outputs.js'
import { PARAMETER_DEFINITIONS } from '../src/data/parameter-catalog.js'

describe('independent fixed and scheduled-maintenance contracts against the actual pure kernel', () => {
  it('checks82 independent price/quantity/time/ownership equations, not just source reads', () => {
    const r = auditFixedMaintenanceFormulaContracts()
    expect(r.checkedEquations).toBe(82)
    expect(r.testedEquationsMatch).toBe(true)
    expect(r.failures).toEqual([])
    expect(new Set(r.rows.map(row => row.id)).size).toBe(82)
    expect(r.rows.every(row => row.canonicalKeys.every(key => PARAMETER_DEFINITIONS.some(d => d.key === key)))).toBe(true)
    expect(r.sourceSha256).toBe('3640a05d4cc10820f84de5f295f8d7e0413ad48a87a3921be8981336b6ef5d8b')
    expect(r).toMatchObject({ detailedAndPublicMethodsEquivalent: false, legacyKernelChanged: false, calibrated: false, adoptedValues: 0 })
  })
  it('reports altered monthly arithmetic as failures, never passing it on matching metadata', () => {
    const r = auditFixedMaintenanceFormulaContracts((m, options) => deriveMonthlyFixedCost(m, options) + 1)
    expect(r.testedEquationsMatch).toBe(false)
    expect(r.failures.length).toBeGreaterThan(0)
    expect(r.failures.every(row => row.section !== 'COST_MAINT')).toBe(true)
  })
  it('detects interval/reserve corruption separately from valid monthly equations', () => {
    const r = auditFixedMaintenanceFormulaContracts(deriveMonthlyFixedCost, m => deriveMaintTiresPerKm(m) * 1000)
    expect(r.failures).toHaveLength(18)
    expect(r.failures.every(row => row.section === 'COST_MAINT')).toBe(true)
    expect(r.rows.filter(row => row.section !== 'COST_MAINT').every(row => row.matches)).toBe(true)
  })
  it('does not collapse financial modes or foreign packages into the same cost', () => {
    const rows = auditFixedMaintenanceFormulaContracts().rows
    expect(rows.find(r => r.id === 'FINANCE:ASSET')!.observed).toBe(150)
    expect(rows.find(r => r.id === 'CAPITAL:Remolque:EXCLUDED')!.observed).toBe(0)
    expect(rows.find(r => r.id === 'WORKING_CAPITAL:US')!.observed).toBe(64)
    expect(rows.find(r => r.id === 'COMPLIANCE:Seguros adicionales:DISABLED')!.observed).toBe(0)
  })
})

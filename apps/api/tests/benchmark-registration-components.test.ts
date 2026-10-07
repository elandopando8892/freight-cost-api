import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { readLocalDocument } from '../scripts/assemble-economic-reference-cards.js'
import { reconcileBinationalFixedBudget } from '../src/modules/engine/benchmark-binational-budget.js'

const dossier = JSON.parse(readLocalDocument('docs/research/B2_FIXED_REGISTRATION_COMPONENTS_2026-10-01.json'))
type Pin = {file: string; sha256: string}
type FeeRow = {bracket: string; vehicleRange: string; annualUsd: number}
type Schedule = {registrationYear: number; section: string; rows: FeeRow[]}
const archived = (id: string) => readLocalDocument(dossier.sources.find((s: {id: string}) => s.id === id).archive.file)

describe('published registration components, not a complete binational budget', () => {
  it.each(dossier.pins as Pin[])('preserves case/selection/budget pin $file', pin => {
    expect(createHash('sha256').update(readLocalDocument(pin.file)).digest('hex')).toBe(pin.sha256)
  })
  it.each(dossier.sources.filter((s: {archive: Pin | null}) => s.archive) as {id: string; archive: Pin}[])
  ('verifies captured source $id bytes', source => {
    expect(createHash('sha256').update(readLocalDocument(source.archive.file)).digest('hex')).toBe(source.archive.sha256)
  })
  it.each(dossier.ucr.schedules as Schedule[])('reads final UCR schedule for registration year $registrationYear', schedule => {
    const caption = new RegExp(`<caption>[\\s\\S]*?Table 1 to[^<]*${schedule.section}[\\s\\S]*?<\\/caption>[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`)
    // Anchor to the final table's own caption, not an earlier impact-analysis table.
    const tableStart = archived('UCR_FINAL_RULE').indexOf(`<caption><p class="title">Table 1 to &sect;&thinsp;${schedule.section}`)
    expect(tableStart).toBeGreaterThan(0)
    const table = archived('UCR_FINAL_RULE').slice(tableStart).match(caption)![1]
    const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map(c => c[1])
      return {bracket: cells[0], vehicleRange: cells[1], annualUsd: Number(cells[2].replace(/[$,]/g, ''))}
    })
    expect(rows).toEqual(schedule.rows)
    rows.forEach(row => expect((row.annualUsd / 12) * 12).toBeCloseTo(row.annualUsd, 8))
  })
  it('does not select 2027 because the rule becomes effective in 2026 or bill once per leg', () => {
    expect(dossier.ucr).toMatchObject({unit: 'entity/registration-year', selectedRegistrationYear: null,
      selectedBracket: null, applicableRegistrantCount: null, allocatedMonthlyUsd: null})
    expect(dossier.ucr.schedules.map((s: Schedule) => s.rows[0].annualUsd)).toEqual([46,55])
    expect((46 / 12).toFixed(2)).toBe('3.83')
    expect(3.83 * 12).not.toBe(46)
  })
  it.each([1,2,3,4,5])('normalizes a %i-year token base without confusing upfront cash with annual expense', years => {
    expect(archived('TX_TOKEN')).toContain('registration costs $15 per year')
    expect(dossier.tokenTrailer.annualBaseUsd * years / (12 * years)).toBe(1.25)
    expect(dossier.tokenTrailer.monthlyBaseReferenceUsd).toBe(1.25)
  })
  it('retains unknown local fees, profile, payment and full trailer permit budget', () => {
    expect(dossier.tokenTrailer).toMatchObject({localFeesUsd:null, selectedPaymentMethod:null,
      selectedTermYears:null, compatibleRegistrationProfile:null, completeMonthlyPermitUsd:null,
      creditCardSurcharge:{fixedUsd:0.25,percent:2.25}})
    expect(archived('TX_TOKEN')).toContain('6,000')
    expect(dossier.tokenTrailer.annualBaseUsd).not.toBe(45)
  })
  it('does not turn an authority opening fee into a recurring USD 25/month', () => {
    expect(dossier.authority).toMatchObject({feePerIndividualAuthorityUsd:300,
      chargeBasis:'ONE_TIME_NONREFUNDABLE_APPLICATION', recurringAnnualUsd:null,
      monthlyRecurringUsd:null, selectedNewAuthorityCount:null, amortizationMonths:null})
    expect(dossier.sources.find((s: {id: string}) => s.id === 'FMCSA_AUTHORITY').archive).toBeNull()
  })
  it.each(dossier.mxPermitObservations as {procedure: string; feeByApplicationChannel: Record<string, number>; feeValidityYear: null; selectedChannel: null; monthlyUsd: null}[])
  ('retains scope and unresolved validity of $procedure; channels are alternatives', row => {
    const sourceRow = archived('SICT_FEE_TABLE').split(`<td>${row.procedure}</td>`)[1].split('</tr>')[0]
    Object.values(row.feeByApplicationChannel).forEach(fee => expect(sourceRow).toContain(fee.toLocaleString('en-US', {maximumFractionDigits:2})))
    expect(row).toMatchObject({feeValidityYear:null,selectedChannel:null,monthlyUsd:null})
  })
  it('does not average an old indexed fee into a verified current fee', () => {
    expect(dossier.mxHistoricalIndexConflict).toMatchObject({capture:'SEARCH_INDEX_ONLY_LIVE_OPEN_FAILED',selectedCurrentFee:null})
    expect(dossier.mxHistoricalIndexConflict.indexedFeesMxn).toEqual({IN_PERSON:4858,ELECTRONIC:3705})
    expect(dossier.irp).toMatchObject({annualUsd:null,monthlyUsd:null})
    expect(archived('TX_IRP')).toContain('distance percentages')
  })
  it('does not certify unavailable acquisition evidence or adopt any partial budget', () => {
    expect(dossier.capitalFreshness[1]).toMatchObject({status:'LIVE_404_PREVIOUS_REFERENCE_HISTORICAL_ONLY',askingPrice:null})
    expect(dossier.outcome).toMatchObject({completeMonthlyFixedBudgetUsd:null,cfuUsd:null,cvuUsd:null,
      calibrated:false,quoteReady:false,adoptedValues:0})
    const worksheet = JSON.parse(readLocalDocument(dossier.pins[2].file))
    expect(worksheet.budget.expenses).toHaveLength(10)
    expect(worksheet.budget.expenses.every((e: {amount: unknown}) => e.amount === null)).toBe(true)
    const result = reconcileBinationalFixedBudget(worksheet.budget)
    expect(result.issues).toHaveLength(15)
    expect(result.monthlyFixedUsdByResource).toBeNull()
    expect(result.adoptedValues).toBe(0)
  })
})

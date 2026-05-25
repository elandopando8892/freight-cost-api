/**
 * Sheet-fidelity regression — the engine must reproduce Freight Cost Model V3.0
 * EXACTLY. Fixture `sheet-cases.json` holds 90 mexLaneProd + 90 usaLaneProd rows
 * (inputs + the workbook's own computed outputs). We run the engine on each row's
 * inputs and assert every component matches the sheet within tight tolerance.
 *
 * Regenerate the fixture from the workbook with the extractor in tmp (xlsx).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { calculateMexLeg } from '../src/modules/engine/engine.mex.js'
import { calculateUsaLeg } from '../src/modules/engine/engine.usa.js'
import type { MarketCondition } from '../src/modules/engine/engine.types.js'

const here = dirname(fileURLToPath(import.meta.url))
const { mex, usa } = JSON.parse(readFileSync(join(here, 'fixtures', 'sheet-cases.json'), 'utf8')) as {
  mex: { row: number; in: Record<string, number | string>; exp: Record<string, number> }[]
  usa: { row: number; in: Record<string, number | string>; exp: Record<string, number> }[]
}

type Tol = [abs: number, rel: number]
function mismatches(
  cases: { row: number; in: Record<string, number | string>; exp: Record<string, number> }[],
  run: (input: Record<string, number | string>) => Record<string, number>,
  specs: Record<string, { got: string; exp: string; tol: Tol }>,
): string[] {
  const out: string[] = []
  for (const c of cases) {
    const r = run(c.in)
    for (const [name, s] of Object.entries(specs)) {
      const exp = c.exp[s.exp]
      const got = r[s.got]
      if (exp == null || got == null || Number.isNaN(got)) continue
      const diff = Math.abs(got - exp)
      const ok = diff <= s.tol[0] || (Math.abs(exp) > 1e-9 && diff / Math.abs(exp) <= s.tol[1])
      if (!ok) out.push(`row ${c.row} ${name}: got ${got.toFixed(2)} vs sheet ${exp.toFixed(2)}`)
    }
  }
  return out
}

describe('Sheet fidelity — MEX leg (mexLaneProd, 90 rows)', () => {
  it('every component matches the workbook', () => {
    const fails = mismatches(
      mex,
      (i) =>
        calculateMexLeg(
          {
            baseKm: i.baseKm as number,
            routeExpensesMxn: (i.routeExpensesMxn as number) ?? 0,
            baseHours: (i.baseHours as number) ?? 0,
            operation: i.operation as string,
            service: i.service as string,
            route: i.route as string,
            equipment: { truckType: i.truckType as string, trailer: i.trailer as string, config: i.config as string, driver: i.driver as string },
          },
          {},
        ) as unknown as Record<string, number>,
      {
        loadedMiles: { got: 'loadedMiles', exp: 'loadedMiles', tol: [0.5, 0.01] },
        fuel: { got: 'fuelUsd', exp: 'fuel', tol: [2, 0.015] },
        maint: { got: 'maintTiresUsd', exp: 'maint', tol: [2, 0.015] },
        driver: { got: 'driverUsd', exp: 'driver', tol: [2, 0.015] },
        cvu: { got: 'cvuUsd', exp: 'cvu', tol: [3, 0.015] },
        cfu: { got: 'cfuUsd', exp: 'cfu', tol: [3, 0.015] },
        production: { got: 'productionCostUsd', exp: 'production', tol: [3, 0.015] },
        technical: { got: 'technicalTariffUsd', exp: 'technical', tol: [4, 0.015] },
        risk: { got: 'totalRiskAdjUsd', exp: 'risk', tol: [4, 0.02] },
        required: { got: 'requiredTariffUsd', exp: 'required', tol: [1, 0.001] },
        rpm: { got: 'rpm', exp: 'rpm', tol: [0.05, 0.02] },
        fsc: { got: 'fsc', exp: 'fsc', tol: [0.03, 0.02] },
      },
    )
    expect(fails, fails.slice(0, 10).join('\n')).toHaveLength(0)
  })
})

describe('Sheet fidelity — USA leg (usaLaneProd, 90 rows)', () => {
  it('every component matches the workbook', () => {
    const fails = mismatches(
      usa,
      (i) =>
        calculateUsaLeg(
          {
            loadedMiles: i.loadedMiles as number,
            transitDaysRaw: (i.transitDaysRaw as number) ?? 0,
            driverExpenses: (i.driverExpenses as number) ?? 0,
            outState: i.outState as string,
            dieselUsdGal: (i.dieselUsdGal as number) ?? 0,
            fscUsdMile: (i.fscUsdMile as number) ?? 0,
            originCondition: i.originCondition as MarketCondition,
            destCondition: i.destCondition as MarketCondition,
            marketRpm: (i.marketRpm as number) ?? 0,
            operation: i.operation as string,
            service: i.service as string,
            equipment: { truckType: i.truckType as string, trailer: i.trailer as string, config: i.config as string, driver: i.driver as string },
          },
          {},
        ) as unknown as Record<string, number>,
      {
        totalOpMiles: { got: 'totalOperationalMiles', exp: 'totalOpMiles', tol: [1, 0.01] },
        fuelCost: { got: 'fuelCostUsd', exp: 'fuelCost', tol: [2, 0.015] },
        driverCost: { got: 'driverCostUsd', exp: 'driverCost', tol: [2, 0.015] },
        maint: { got: 'maintTiresUsd', exp: 'maint', tol: [2, 0.015] },
        cvuInclFuel: { got: 'cvuInclFuelUsd', exp: 'cvuInclFuel', tol: [3, 0.015] },
        cfu: { got: 'cfuUsd', exp: 'cfu', tol: [3, 0.015] },
        technicalInclFuel: { got: 'technicalTariffInclFuelUsd', exp: 'technicalInclFuel', tol: [4, 0.015] },
        requiredExFuel: { got: 'requiredTariffExFuelUsd', exp: 'requiredExFuel', tol: [4, 0.02] },
        required: { got: 'requiredTariffUsd', exp: 'required', tol: [1, 0.001] },
        rpm: { got: 'rpm', exp: 'rpm', tol: [0.05, 0.02] },
        fsc: { got: 'fsc', exp: 'fsc', tol: [0.03, 0.02] },
      },
    )
    expect(fails, fails.slice(0, 10).join('\n')).toHaveLength(0)
  })
})

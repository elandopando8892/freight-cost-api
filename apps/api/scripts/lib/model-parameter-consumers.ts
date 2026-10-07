import { readFileSync, realpathSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { PARAMETER_DEFINITIONS } from '../../src/data/parameter-catalog.js'
import { deriveMaintTiresPerKm } from '../../src/modules/engine/engine.outputs.js'
import { BENCHMARK_TIRE_METHOD } from '../../src/modules/engine/benchmark-rates.js'

/** Read source, never import the quote engine or initialize its services. */
export const MODEL_PARAMETER_SOURCE_FILES = Object.freeze([
  'engine.outputs.ts', 'engine.mex.ts', 'engine.usa.ts', 'engine.drayage.ts',
  'engine.calculator.ts', 'engine.commercial.ts', 'engine.factors.ts',
].map(name => `apps/api/src/modules/engine/${name}`))

const root = fileURLToPath(new URL('../../../../', import.meta.url))
export function readModelParameterSource(file: string) {
  if (!MODEL_PARAMETER_SOURCE_FILES.includes(file)) throw new Error('MODEL_SOURCE_NOT_ALLOWLISTED')
  const engineRoot = realpathSync(resolve(root, 'apps/api/src/modules/engine'))
  const target = realpathSync(resolve(root, file)), scoped = relative(engineRoot, target)
  if (isAbsolute(scoped) || scoped === '..' || scoped.startsWith(`..${sep}`)) throw new Error('MODEL_SOURCE_OUTSIDE_ENGINE')
  return readFileSync(target, 'utf8')
}

/** Unequal synthetic prices expose actual arithmetic bindings without making
 * a researched price, lifetime or target-fleet calibration out of a fixture. */
export function auditTireFormulaBindings() {
  const positions = ['Direccion', 'Traccion', 'Recapeadas', 'Remolque'] as const
  const sourceFile = 'apps/api/src/modules/engine/engine.outputs.ts'
  const neutral = Object.fromEntries(PARAMETER_DEFINITIONS
    .filter(d => d.section === 'COST_MAINT' || d.section === 'COST_TIRES')
    .map(d => [`${d.section}__${d.field}`, 0]))
  positions.forEach((p, i) => {
    neutral[`COST_TIRES__PU ${p}`] = (i + 1) * 100
    neutral[`COST_TIRES__Life KM ${p}`] = 1000
  })
  const rows = positions.map(position => {
    const probe = { ...neutral, [`COST_TIRES__Qty ${position}`]: 1 }
    const legacyRowUsdPerKm = deriveMaintTiresPerKm(probe)
    const ownPriceRowUsdPerKm = probe[`COST_TIRES__PU ${position}`] / probe[`COST_TIRES__Life KM ${position}`]
    const priceBindings = positions.filter(p => {
      const shocked = { ...probe, [`COST_TIRES__PU ${p}`]: probe[`COST_TIRES__PU ${p}`] + 1 }
      return Math.abs(deriveMaintTiresPerKm(shocked) - legacyRowUsdPerKm) > 1e-12
    }).map(p => `COST_TIRES__PU ${p}`)
    if (priceBindings.length !== 1) throw new Error(`TIRE_FORMULA_UNRESOLVED_BINDING:${position}`)
    return { position, physicalPosition: position !== 'Recapeadas',
      canonicalKeys: PARAMETER_DEFINITIONS.filter(d => d.section === 'COST_TIRES' &&
        [`Qty ${position}`, `PU ${position}`, `Life KM ${position}`].includes(d.field)).map(d => d.key),
      legacyPriceField: priceBindings[0], ownPriceField: `COST_TIRES__PU ${position}`,
      legacyRowUsdPerKm, ownPriceRowUsdPerKm,
      matchingPriceBinding: priceBindings[0] === `COST_TIRES__PU ${position}`,
      ownPriceRowIsValidPhysicalLifecycle: position !== 'Recapeadas' ? 'SYNTHETIC_ARITHMETIC_ONLY' : 'UNRESOLVED_RETREAD_POSITION_OR_LIFECYCLE' }
  })
  return { section: 'COST_TIRES', scope: 'SYNTHETIC_BINDING_DIAGNOSTIC_NOT_ECONOMIC_CALIBRATION',
    sourceFile, sourceSha256: createHash('sha256').update(readModelParameterSource(sourceFile)).digest('hex'),
    rows, mismatchedPriceBindings: rows.filter(r => !r.matchingPriceBinding).length,
    priceBindingsEquivalent: rows.every(r => r.matchingPriceBinding),
    // Matching prices alone cannot prove replacement positions, retread-stage
    // allocation or equivalence to the separate public aggregate method.
    methodsEquivalent: false,
    benchmarkMethod: BENCHMARK_TIRE_METHOD,
    canonicalLifecycleBridgeComplete: false, calibrated: false, adoptedValues: 0 }
}

type Site = { file: string; line: number; reader: string; section: string; field: string }
/** Static literal reads prove a reference in source, not branch execution,
 * economic sufficiency, use in this pilot, or authenticity of a benchmark. */
export function auditModelParameterConsumers(benchmarkKeys: ReadonlySet<string>, readSource = readModelParameterSource) {
  const definitions = new Map(PARAMETER_DEFINITIONS.map(d => [`${d.section}__${d.field}`, d]))
  const byKey = new Map(PARAMETER_DEFINITIONS.map(d => [d.key, d]))
  if (definitions.size !== PARAMETER_DEFINITIONS.length || byKey.size !== PARAMETER_DEFINITIONS.length)
    throw new Error('MODEL_CATALOG_DUPLICATE_IDENTITY')
  for (const key of benchmarkKeys) if (!byKey.has(key)) throw new Error(`MODEL_BENCHMARK_UNKNOWN_KEY:${key}`)
  const reads = new Map<string, Site[]>(), outsideCatalogReads: Site[] = []
  const dynamicReads: { file: string; line: number; reader: string }[] = []
  const sourceFiles = MODEL_PARAMETER_SOURCE_FILES.map(file => {
    const body = readSource(file), source = ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const diagnostics = (source as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics
    if (diagnostics.length) throw new Error(`MODEL_SOURCE_SYNTAX:${file}`)
    let readerCalls = 0
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
          (node.expression.text === 'getParam' || (file.endsWith('/engine.outputs.ts') && node.expression.text === 'P'))) {
        readerCalls++
        const [section, field] = node.arguments.slice(1, 3)
        const site = { file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reader: node.expression.text }
        if (!section || !field || !ts.isStringLiteralLike(section) || !ts.isStringLiteralLike(field)) dynamicReads.push(site)
        else {
          const literal = { ...site, section: section.text, field: field.text }
          const definition = definitions.get(`${literal.section}__${literal.field}`)
          if (!definition) outsideCatalogReads.push(literal)
          else reads.set(definition.key, [...(reads.get(definition.key) ?? []), literal])
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    // A missing/empty replacement source cannot manufacture a passing audit.
    if (!readerCalls) throw new Error(`MODEL_SOURCE_NO_READER_CALLS:${file}`)
    return { file, sha256: createHash('sha256').update(body).digest('hex'), readerCalls }
  })
  const keys = PARAMETER_DEFINITIONS.map(d => {
    const consumers = reads.get(d.key) ?? [], consumedByBenchmark = benchmarkKeys.has(d.key)
    return { key: d.key, section: d.section, field: d.field, unit: d.unit,
      catalogActivation: d.activation, catalogCostBehavior: d.costBehavior,
      consumedByBenchmark, staticEngineConsumers: consumers,
      coverage: consumedByBenchmark ? 'PUBLIC_BENCHMARK_DEPENDENCY' as const : consumers.length
        ? 'OTHER_ENGINE_LITERAL_READ' as const : 'NO_LITERAL_READ_IN_SCANNED_FILES' as const,
      // Neither catalog recommendations nor factors constitute public evidence.
      benchmarkValue: null, adopted: false, calibrated: false }
  })
  const sectionCoverage = [...new Set(keys.map(k => k.section))].map(section => {
    const items = keys.filter(k => k.section === section)
    return { section, catalogKeys: items.length, benchmarkKeys: items.filter(k => k.consumedByBenchmark).length,
      nonBenchmarkWithLiteralReader: items.filter(k => !k.consumedByBenchmark && k.staticEngineConsumers.length).length,
      nonBenchmarkWithoutLiteralReader: items.filter(k => !k.consumedByBenchmark && !k.staticEngineConsumers.length).length }
  })
  return { scope: 'SEVEN_CORE_ENGINE_FILES_LITERAL_READS_NOT_EXECUTION_OR_ECONOMIC_ACCEPTANCE', sourceFiles,
    keys, sectionCoverage, outsideCatalogReads, dynamicReads,
    counts: { catalog: keys.length, benchmark: benchmarkKeys.size,
      outsideBenchmark: keys.filter(k => !k.consumedByBenchmark).length,
      outsideBenchmarkWithLiteralReader: keys.filter(k => !k.consumedByBenchmark && k.staticEngineConsumers.length).length,
      outsideBenchmarkWithoutLiteralReader: keys.filter(k => !k.consumedByBenchmark && !k.staticEngineConsumers.length).length },
    inactiveOrUnusedKeysInferred: false, allApplicationConsumersScanned: false,
    sourceRefreshPerformed: false, defaultsAdopted: 0, calibrated: false, quoteReady: false }
}

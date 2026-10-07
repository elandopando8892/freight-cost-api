import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Local analytical export only; no application state or economic input writes.
const args = process.argv.slice(2);
assert.ok(args.length === 1 && ['--write', '--check'].includes(args[0]),
  'Use --check for read-only verification or --write for new immutable review artifacts');
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = p => readFileSync(resolve(root, p));
const sha = b => createHash('sha256').update(b).digest('hex');
const packedPath = 'apps/api/src/modules/cost-bases/b2-family-source.pack.json';
const packed = JSON.parse(read(packedPath));
const bytes = gunzipSync(Buffer.from(packed.gzipBase64, 'base64'));
assert.equal(bytes.length, packed.bytes); assert.equal(sha(bytes), packed.sha256);
const source = JSON.parse(bytes);
const snapshot = JSON.parse(read('apps/api/src/modules/engine/b2-own-relay.snapshot.json'));
assert.equal(sha(JSON.stringify(snapshot.payload)), snapshot.sha256);
assert.equal(sha(JSON.stringify(source.cases)), snapshot.payload.sourceScenarioSha256);
assert.deepEqual(source.sourcePins, snapshot.payload.sourcePins);
for (const pin of source.sourcePins) assert.equal(sha(read(pin.file)), pin.sha256, pin.id);
assert.equal(source.quoteReady, false); assert.equal(source.adoptedValues, 0);
assert.equal(source.humanAcceptedResults, false);
const near = (a, b, label) => assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-7, label);
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
const key = c => [c.cycleId, c.fx.date, c.restInterpretation, c.fundingMode].join('|');
assert.equal(source.cases.length, 24); assert.equal(new Set(source.cases.map(key)).size, 24);
const checks = [];
for (const c of source.cases) {
  assert.equal(c.fixedLedger.length, 32); assert.equal(new Set(c.fixedLedger.map(r => r.id)).size, 32);
  assert.equal(c.lineage.variableCosts.length, 20);
  assert.equal(new Set(c.lineage.variableCosts.map(r => r.conceptId)).size, 20);
  assert.equal(c.lineage.exposures.filter(r => r.resourceId === 'SHARED_TRAILER').length, 1);
  const op = c.lineage.fixedOperatingComponent;
  near(sum(c.fixedLedger, 'monthlyUsd'), sum(c.resources, 'monthlyFixedUsd'), 'Monthly pool reconciliation');
  near(sum(c.fixedLedger, 'monthlyUsd') + op.monthlyUsd, c.planningOutputs.matchedMonthlySubtotalUsd, 'Monthly pool plus fixed employer quota');
  for (const r of c.resources) {
    const e = c.lineage.exposures.find(e => e.resourceId === r.resourceId);
    assert.ok(e.productiveKmPerMonth > 0 && e.productiveDaysPerMonth > 0 && op.compatibleCyclesPerMonth > 0);
    const fixed = Math.max(r.monthlyFixedUsd * e.totalCycleKm / e.productiveKmPerMonth,
      r.monthlyFixedUsd * e.cycleDays / e.productiveDaysPerMonth) + (r.resourceId === op.resourceId ? op.monthlyUsd / op.compatibleCyclesPerMonth : 0);
    near(fixed, r.cfuUsd, 'Independent MAX allocation and single quota');
  }
  const included = c.lineage.variableCosts.filter(r => r.disposition === 'DOCUMENTED_COMPONENT');
  const excluded = c.lineage.variableCosts.filter(r => r.disposition === 'DOCUMENTED_EXCLUSION');
  assert.equal(included.length, 18); assert.equal(excluded.length, 2);
  assert.ok(included.every(r => Number.isFinite(r.amountUsd) && r.amountUsd >= 0));
  assert.ok(excluded.every(r => r.amountUsd === null && r.exclusionOrZeroRationale));
  near(sum(included, 'amountUsd'), c.planningOutputs.cvuUsd, 'CVU sum');
  near(sum(c.resources, 'cfuUsd'), c.planningOutputs.cfuUsd, 'CFU sum');
  near(c.planningOutputs.cfuUsd + c.planningOutputs.cvuUsd, c.planningOutputs.productiveCostUsd, 'Productive total');
  assert.equal(c.quoteReady, false); assert.equal(c.adoptedValues, 0);
  assert.equal(c.planningOutputs.purchaseUsd, null); assert.equal(c.planningOutputs.sellUsd, null);
  checks.push({ caseKey: key(c), reconciled: true, cfuUsd: c.planningOutputs.cfuUsd,
    cvuUsd: c.planningOutputs.cvuUsd, productiveCostUsd: c.planningOutputs.productiveCostUsd });
}
for (const cash of source.cases.filter(c => c.fundingMode === 'CASH')) {
  const financed = source.cases.find(c => c.cycleId === cash.cycleId && c.fx.date === cash.fx.date &&
    c.restInterpretation === cash.restInterpretation && c.fundingMode === 'FINANCED');
  near(cash.planningOutputs.cvuUsd, financed.planningOutputs.cvuUsd, 'Funding leaves CVU unchanged');
  assert.deepEqual(cash.fixedLedger.filter((r, i) => r.monthlyUsd !== financed.fixedLedger[i].monthlyUsd).map(r => r.id).sort(),
    ['MX_TRACTOR_CAPITAL', 'SHARED_TRAILER_CAPITAL', 'US_TRACTOR_CAPITAL']);
}
const central = source.cases.filter(c => c.fx.date === '2026-09-30' && c.restInterpretation === 'RATE_EXCLUDES_WEEKLY_REST');
assert.equal(central.length, 4);
const reference = central.find(c => c.cycleId === 'NETWORK_EXPECTED_EMPTY_PROXY' && c.fundingMode === 'CASH');
const reserve = reference.fixedLedger.filter(r => r.disposition === 'EXPLICIT_PLANNING_REMAINDER');
assert.equal(reserve.length, 6);
const money = v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cycle = c => c.cycleId === 'NETWORK_EXPECTED_EMPTY_PROXY' ? 'Red / vacíos proxy' : 'Retorno dedicado vacío';
const row = c => `| ${cycle(c)} | ${c.fx.date} | ${c.restInterpretation === 'RATE_EXCLUDES_WEEKLY_REST' ? 'Descanso adicional' : 'Descanso incluido'} | ${c.fundingMode === 'CASH' ? 'Contado' : 'Financiado'} | ${money(c.planningOutputs.cfuUsd)} | ${money(c.planningOutputs.cvuUsd)} | ${money(c.planningOutputs.productiveCostUsd)} |`;
const report = {
  scope: 'R2_REVIEW_FOR_HUMAN_ACCEPTANCE_NOT_ADOPTION', referencePeriod: '2026-09', reviewedOn: '2026-10-07',
  packageSha256: sha(read(packedPath)), scenarioSha256: source.scenarioPayloadSha256,
  sourcePinsVerified: source.sourcePins.length, reconciledCases: checks,
  centralComparison: central.map(c => ({ caseKey: key(c), ...c.planningOutputs })),
  explicitMonthlyReservesUsd: sum(reserve, 'monthlyUsd'),
  referenceFixedPoolUsd: sum(reference.fixedLedger, 'monthlyUsd'),
  humanAcceptedResults: false, quoteReady: false, adoptedValues: 0,
  limitations: source.limitations,
};
const lines = [
  '# R2 · ficha económica para aceptación', '',
  'Referencia: septiembre de 2026. Revisión local: 7 de octubre de 2026. Resultado: compartible con límites; aceptación humana y adopción operativa pendientes.', '',
  'Empresa binacional ya operando, relevo propio MX/US, misma caja seca 53′, México DF–Fort Smith AR vía Puente III. Las 24 combinaciones son escenarios, no viajes observados ni una muestra de mercado.', '',
  '## Los 24 resultados', '',
  'USD por ciclo modelado. Incluye el tratamiento de vacíos. CFU es costo fijo asignado al ciclo y CVU es costo variable del ciclo; no son USD/km. Dos ciclos × tres FIX × dos tratamientos de descanso × contado/financiado. Redondeo sólo de presentación.', '',
  '| Ciclo | FIX de referencia | Pago vial | Capital | CFU USD | CVU USD | Productivo USD |',
  '|---|---|---|---|---:|---:|---:|', ...source.cases.map(row), '',
  '## Qué se verificó', '',
  '24 identidades únicas; 88 documentos íntegros; 32 partidas fijas y 20 conceptos variables por caso (18 importes y dos exclusiones explícitas). Se conciliaron pools mensuales, asignación MAX por recurso, cuota patronal fija una vez, CVU y total. En las 12 parejas contado/financiado sólo cambian las tres partidas de capital y CFU: CVU permanece igual.', '',
  '`CFU = suma MAX(pool mensual del recurso × km del ciclo/km productivos mensuales, pool mensual × días del ciclo/días productivos mensuales) + cuota patronal fija MX/ciclos compatibles`', '',
  '`CVU = suma de 18 importes identificados; costo productivo = CFU + CVU`', '',
  'La comprobación MAX usa los pools por recurso almacenados y contrasta su suma con el ledger; no constituye una auditoría independiente de cada fuente o de la regla original de reparto de centavos.', '',
  '## Inventario fijo: referencia red, contado, FIX 30-sep', '',
  'USD/mes, antes de asignar al ciclo. La cuota patronal fija MX se mantiene fuera de estas 32 partidas y se asigna una sola vez.', '',
  '| Concepto | USD/mes | Calidad de soporte |', '|---|---:|---|',
  ...reference.fixedLedger.map(r => `| ${r.id} | ${money(r.monthlyUsd)} | ${r.disposition === 'EXPLICIT_PLANNING_REMAINDER' ? 'Reserva explícita de planeación' : 'Componente público transferido; aplicabilidad pendiente'} |`), '',
  `Seis reservas explícitas suman USD ${money(sum(reserve, 'monthlyUsd'))}/mes sobre un pool fijo de USD ${money(sum(reference.fixedLedger, 'monthlyUsd'))}/mes. Ese subtotal de reservas no es su impacto directo por viaje; debe asignarse por recurso y exposición. Los demás componentes transferidos tampoco equivalen a costos observados del carrier.`, '',
  '## Inventario variable de la misma referencia', '',
  '| Concepto | USD/ciclo | Tratamiento |', '|---|---:|---|',
  ...reference.lineage.variableCosts.map(r => `| ${r.conceptId} | ${r.amountUsd === null ? 'Excluido; no cero' : money(r.amountUsd)} | ${r.disposition === 'DOCUMENTED_EXCLUSION' ? r.exclusionOrZeroRationale : 'Componente del escenario; ver derivación y evidencia en el paquete'} |`), '',
  '## Límites que condicionan la aceptación', '', ...source.limitations.map(x => '- ' + x), '',
  'Los seis remanentes y las políticas de prestaciones, hotel/pensión y peajes están descritos en [la entrega de planeación](../research/B2_PLANNING_CLOSEOUT_DELIVERY_2026-10-04.md) y [la política congelada](../research/B2_AUTHORIZED_PLANNING_POLICY_2026-10-04.json). No se refrescaron tarifas ni se certificó vigencia comercial de septiembre.', '',
  'La [matriz canónica existente](../research/B2_CANONICAL_INPUT_FORMULA_MATRIX_2026-10-03.md) identifica 135 claves consumidas y 13 secciones. Los 52 conceptos agregados de esta ficha no completan ni calibran por sí solos los 210 parámetros canónicos.', '',
  'La autorización anterior ya permitió construir escenarios de planeación. La decisión solicitada ahora es revisar y aceptar los resultados numéricos concretos de esta ficha; no volver a autorizar su construcción.', '',
  '## Decisión propuesta', '',
  'Aceptar estos 24 resultados exclusivamente como referencia pública de planeación y comparación de costos de terceros para el perfil descrito, conservando visibles reservas, transferencias y exclusiones. Esta aceptación no certifica costos reales, precios de venta, tarifas de mercado, COI, nómina ni calibración de los 210 parámetros. Compra y venta continúan null; quoteReady=false; cero valores adoptados.', '',
  'Estado: propuesta entregada; no se ha registrado aceptación humana. Una aceptación limitada de resultados no habilita publicación, adopción económica, escrituras de base ni sustitución de snapshots. Para uso comercial se necesita resolver el alcance de aplicabilidad y la integración/aceptación autenticada pendiente.', '',
  `Paquete SHA256: ${report.packageSha256}. Escenario SHA256: ${report.scenarioSha256}.`, '',
];
for (const [name, content] of [['B4_R2_ECONOMIC_ACCEPTANCE_2026-10-07.json', JSON.stringify(report, null, 2) + '\n'],
  ['B4_R2_ECONOMIC_ACCEPTANCE_2026-10-07.md', lines.join('\n')]]) {
  const target = resolve(root, 'docs/reviews', name);
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8'), content, `R2_REVIEW_DRIFT:${name}`);
  else writeFileSync(target, content, { flag: 'wx' });
}
console.log(JSON.stringify({ mode: args[0], casesVerified: checks.length, pinsVerified: source.sourcePins.length,
  centralComparison: report.centralComparison, explicitMonthlyReservesUsd: report.explicitMonthlyReservesUsd,
  humanAcceptedResults: false, quoteReady: false, adoptedValues: 0 }));

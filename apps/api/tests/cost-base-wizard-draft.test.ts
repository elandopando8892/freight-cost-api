import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildWizardReferenceCatalog, createWizardDraft, restoreWizardDraft, saveWizardDraft,
  type WizardDecision } from '../src/modules/cost-bases/cost-base-wizard-draft.js'
import { LocalWizardDraftStore } from '../scripts/lib/cost-base-wizard-local-store.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const documents = { fuel: readFileSync(join(root, 'docs/research/B2_FUEL_PRICE_PERFORMANCE_REFERENCE_2026-09-30.json'), 'utf8'),
  maintenance: readFileSync(join(root, 'docs/research/B2_US_MAINTENANCE_PLANNING_2026-10-03.json'), 'utf8') }
const catalog = buildWizardReferenceCatalog(documents)
const context = { orgId: 'test-org', baseId: 'test-base', versionId: 'test-draft' }
const initial = () => createWizardDraft(context, catalog)
const decision = (id = 'diesel-mx'): WizardDecision => ({ conceptId: id, referenceRevision: catalog.revision,
  mode: 'MARKSMAN', value: catalog.cards.find(c => c.id === id)!.standard.value, identification: 'YES',
  justification: '', provisionalAccepted: true })
const command = (decisions = [decision()], revision = 0) => ({ context, expectedRevision: revision, requestId: randomUUID(), decisions })
// jsonb preserves data and array order, but not object property insertion order.
function reorderedJson(value: unknown): any {
  if(Array.isArray(value))return value.map(reorderedJson)
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reorderedJson(item)]))
  return value
}

describe('W1 reference to draft contract', () => {
  it('recovers a JSONB-shaped draft and replays its original receipt without duplicating',()=>{
    const input=command(), saved=saveWizardDraft(initial(),input,catalog).draft
    const stored=reorderedJson(JSON.parse(JSON.stringify(saved)))
    const restored=restoreWizardDraft(stored,context,catalog)
    expect(restored).toEqual(saved)
    const replay=saveWizardDraft(restored,input,catalog)
    expect(replay.replayed).toBe(true);expect(replay.draft.revision).toBe(1);expect(replay.draft.receipts).toHaveLength(1)
  })
  it.each(['value','extra','array-order'])('still rejects changed reference %s after JSONB key normalization',change=>{
    const stored=reorderedJson(saveWizardDraft(initial(),command(),catalog).draft)
    if(change==='value')stored.references[0].standard.value=999
    if(change==='extra')stored.references[0].unreviewed='not in catalog'
    if(change==='array-order')stored.references.reverse()
    expect(()=>restoreWizardDraft(stored,context,catalog)).toThrow('STORED_CONTEXT_OR_REFERENCE_MISMATCH')
  })
  it('uses pinned research, not V3 commercial bounds as observed extrema', () => {
    expect(catalog.cards.map(c => c.statistics.minimum)).toEqual([null, null, null])
    expect(catalog.cards.map(c => c.statistics.maximum)).toEqual([null, null, null])
    expect(catalog.cards[0].statistics.central).toBe(27)
    expect(catalog.cards[1].statistics.central).toBeCloseTo(5.955 / 3.785411784, 12)
    expect(catalog.cards[2].statistics.central).toBe(.198)
    expect(catalog.cards[2].native).toBeNull()
    expect(catalog.cards[2].evidence.observationDate).toBe('2024')
    expect(catalog.statisticsFromCatalogDefaults).toBe(false)
  })
  it('validates source pins and accepts only CRLF/LF normalization', () => {
    expect(buildWizardReferenceCatalog({ ...documents, fuel: documents.fuel.replace(/\r\n/g, '\n') })).toEqual(catalog)
    expect(() => buildWizardReferenceCatalog({ ...documents, fuel: documents.fuel + ' ' })).toThrow('SOURCE_HASH_MISMATCH')
  })
  it('saves values, premises, source revision and quality in one bundle without adoption', () => {
    const before = initial()
    const saved = saveWizardDraft(before, command([decision(), decision('diesel-us'), decision('maintenance-us')]), catalog).draft
    expect(before.decisions).toEqual([])
    expect(saved.decisions).toHaveLength(3)
    expect(saved.nativeValues).toHaveLength(2)
    expect(saved.nativeValues.map(p => p.key)).toEqual(['fcm.v3.fuel.diesel-mx', 'fcm.v3.fuel.diesel-us-border'])
    expect(saved.decisions.every(d => d.evidenceQuality === 'PROVISIONAL_PROFILE_REFERENCE')).toBe(true)
    expect(saved.calibrated).toBe(false); expect(saved.quoteReady).toBe(false); expect(saved.productiveAdoptions).toBe(0)
    expect(restoreWizardDraft(JSON.parse(JSON.stringify(saved)), context, catalog)).toEqual(saved)
  })
  it('requires explicit provisional acceptance for source and standard selections', () => {
    expect(() => saveWizardDraft(initial(), command([{...decision(), provisionalAccepted: false}]), catalog)).toThrow('PROVISIONAL_ACCEPTANCE_REQUIRED')
    expect(() => saveWizardDraft(initial(), command([{...decision(), mode: 'CENTRAL', provisionalAccepted: false}]), catalog)).toThrow('PROVISIONAL_ACCEPTANCE_REQUIRED')
  })
  it('does not invent missing statistics or accept an altered source value', () => {
    expect(() => saveWizardDraft(initial(), command([{...decision(), mode: 'LOW'}]), catalog)).toThrow('STATISTIC_NOT_AVAILABLE')
    expect(() => saveWizardDraft(initial(), command([{...decision(), mode: 'HIGH'}]), catalog)).toThrow('STATISTIC_NOT_AVAILABLE')
    expect(() => saveWizardDraft(initial(), command([{...decision(), value: 28}]), catalog)).toThrow('REFERENCE_VALUE_MISMATCH')
  })
  it('stores manual values separately from evidence and requires a reason for incompatible premises', () => {
    const own = {...decision(), mode: 'MANUAL' as const, value: 35, provisionalAccepted: false, identification: 'NO' as const}
    expect(() => saveWizardDraft(initial(), command([own]), catalog)).toThrow('JUSTIFICATION_REQUIRED')
    const saved = saveWizardDraft(initial(), command([{...own, justification: 'Convenio propio para esta operación.'}]), catalog).draft
    expect(saved.nativeValues[0].value).toBe(35)
    expect(saved.references[0].statistics.central).toBe(27)
    expect(saved.decisions[0].mode).toBe('MANUAL')
  })
  it('enforces a supplied observed range without confusing it with mathematical domain', () => {
    const ranged = structuredClone(catalog)
    Object.assign(ranged.cards[0].statistics, { minimum: 24, maximum: 30 }) // synthetic test fixture only
    const own = {...decision(), mode: 'MANUAL' as const, value: 35, provisionalAccepted: false}
    expect(() => saveWizardDraft(initial(), command([own]), ranged)).toThrow('JUSTIFICATION_REQUIRED')
    expect(saveWizardDraft(initial(), command([{...own, justification:'Condiciones diferentes del ejemplo.'}]), ranged).draft.nativeValues[0].value).toBe(35)
  })
  it.each([-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe or negative numeric input %s', value => {
    expect(() => saveWizardDraft(initial(), command([{...decision(), mode:'MANUAL', value}]), catalog)).toThrow()
  })
  it('refuses cross-context, stale revision/reference and non-draft writes', () => {
    expect(() => saveWizardDraft(initial(), {...command(),context:{...context,orgId:'other'}}, catalog)).toThrow('DRAFT_CONTEXT_MISMATCH')
    expect(() => saveWizardDraft(initial(), command([decision()], 1), catalog)).toThrow('DRAFT_REVISION_CONFLICT')
    expect(() => saveWizardDraft(initial(), command([{...decision(),referenceRevision:'0'.repeat(64)}]), catalog)).toThrow('STALE_REFERENCE')
    expect(() => saveWizardDraft({...initial(),status:'ACTIVE'} as never,command(),catalog)).toThrow('VERSION_NOT_EDITABLE')
  })
  it('rejects unknown/duplicate concepts and browser claims of readiness', () => {
    expect(() => saveWizardDraft(initial(), command([{...decision(),conceptId:'unknown'}]), catalog)).toThrow('UNKNOWN_CONCEPT')
    expect(() => saveWizardDraft(initial(), command([decision(),decision()]), catalog)).toThrow('DUPLICATE_CONCEPT')
    expect(() => saveWizardDraft(initial(), {...command(),calibrated:true}, catalog)).toThrow()
  })
  it('replays the same request once and rejects reusing its key with other values', () => {
    const input=command(), first=saveWizardDraft(initial(),input,catalog)
    const replay=saveWizardDraft(first.draft,input,catalog)
    expect(replay.replayed).toBe(true); expect(replay.draft.revision).toBe(1); expect(replay.receipt).toEqual(first.receipt)
    expect(() => saveWizardDraft(first.draft,{...input,decisions:[{...decision(),mode:'MANUAL',value:35}]},catalog)).toThrow('REQUEST_ID_REUSED')
  })
  it('preserves other manual cards when saving another concept', () => {
    const first=saveWizardDraft(initial(),command([{...decision(),mode:'MANUAL',value:35}]),catalog).draft
    const next=saveWizardDraft(first,command([decision('diesel-us')],1),catalog).draft
    expect(next.nativeValues[0].value).toBe(35)
    expect(next.decisions[0].mode).toBe('MANUAL')
    expect(next.revision).toBe(2)
  })
  it('rejects a corrupt persisted native value, source snapshot or status instead of resetting', () => {
    const saved=saveWizardDraft(initial(),command(),catalog).draft
    for(const corrupt of [
      (d: typeof saved)=>{d.nativeValues[0].value=999},
      (d: typeof saved)=>{d.references[0].statistics.central=999},
      (d: typeof saved)=>{(d as any).calibrated=true},
      (d: typeof saved)=>{d.receipts=[]},
    ]) {const raw=structuredClone(saved);corrupt(raw);expect(()=>restoreWizardDraft(raw,context,catalog)).toThrow()}
  })
})

describe('W1 actual local file persistence, not database proof', () => {
  it('survives reopening, idempotent retry and rejected invalid save', async () => {
    const folder=await mkdtemp(join(tmpdir(),'fcm-w1-')), file=join(folder,'draft.json')
    const store=await LocalWizardDraftStore.open(file,context,catalog), input=command()
    await store.save(input)
    const reopened=await LocalWizardDraftStore.open(file,context,catalog)
    expect((await reopened.read()).nativeValues[0].value).toBe(27)
    expect((await reopened.save(input)).replayed).toBe(true)
    const bytes=await readFile(file,'utf8')
    await expect(reopened.save(command([{...decision(),value:-1}],1))).rejects.toThrow()
    expect(await readFile(file,'utf8')).toBe(bytes)
  })
  it('serializes two same-revision writes; the loser cannot overwrite the winner', async () => {
    const folder=await mkdtemp(join(tmpdir(),'fcm-w1-')), store=await LocalWizardDraftStore.open(join(folder,'draft.json'),context,catalog)
    const results=await Promise.allSettled([store.save(command()),store.save(command([decision('diesel-us')]))])
    expect(results.map(r=>r.status)).toEqual(['fulfilled','rejected'])
    expect((await store.read()).revision).toBe(1)
    await store.save(command([decision('diesel-us')],1))
    expect((await store.read()).revision).toBe(2)
  })
  it('fails closed for corrupt files and unexpected filesystem objects', async () => {
    const folder=await mkdtemp(join(tmpdir(),'fcm-w1-')), file=join(folder,'draft.json')
    await writeFile(file,'{broken')
    await expect(LocalWizardDraftStore.open(file,context,catalog)).rejects.toThrow()
    expect(await readFile(file,'utf8')).toBe('{broken')
    const directoryFile=join(folder,'not-a-file');await mkdir(directoryFile)
    await expect(LocalWizardDraftStore.open(directoryFile,context,catalog)).rejects.toThrow('LOCAL_STORE_UNSAFE_FILE')
  })
})

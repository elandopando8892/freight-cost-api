import {act,createElement} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FamilyProposalPanel} from '../app/(app)/cost-bases/family-proposal-panel'
import {parseFamilyProposalView} from '../lib/family-proposal'
import {fetcher,ClientApiError,sessionExpiredEvent} from '../lib/fetcher'
import {readOwnRelayReview} from '../../api/src/modules/engine/b2-own-relay-review'
import type {PlanningView} from '../lib/version-planning'
import type {FamilyProposalView} from '../../api/src/modules/cost-bases/family-base-contract'
vi.mock('../lib/fetcher',async original=>({...await original<typeof import('../lib/fetcher')>(),fetcher:vi.fn()}))
const selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
const scope={orgId:'org-a',sub:'actor-a'},context={orgId:'org-a',baseId:'base-a',versionId:'version-a'}
const calculation=readOwnRelayReview(selection,scope)
const planning:PlanningView={context,scope,revision:1,versionFingerprint:'a'.repeat(64),bindingSha256:'b'.repeat(64),editable:true,appliedToParams:false,
  latest:{kind:'FCM_VERSION_PLANNING_V1',versionId:'version-a',context,revision:1,requestId:'2d26f150-2bb4-4e7e-95f0-d098d2d4f274',
    commandSha256:'c'.repeat(64),savedAt:'2026-10-06T06:00:00.000Z',savedBy:scope.sub,versionFingerprint:'a'.repeat(64),bindingSha256:'b'.repeat(64),
    selection,note:'',planningAccepted:true,calculation}}
const none=():FamilyProposalView=>structuredClone({context,scope,revision:0,status:'NONE',latest:null,appliedToParams:false,quoteReady:false})
const saved=():FamilyProposalView=>({...none(),revision:1,status:'CURRENT',latest:{fingerprint:'d'.repeat(64),versionFingerprint:planning.versionFingerprint,
  bindingSha256:planning.bindingSha256,sourceSnapshotSha256:calculation.sha256,sourceScenarioSha256:calculation.sourceScenarioSha256,
  receipt:{revision:1,requestId:planning.latest!.requestId,commandSha256:planning.latest!.commandSha256},selection,referencePeriod:'2026-09',fixedEntryCount:32,
  policyReference:{file:'policy.md',sha256:'e'.repeat(64),scope:'PUBLIC_PLANNING_VALIDATION_ONLY_NOT_OPERATIONAL_CALIBRATION_OR_ADOPTION'},
  calibrated:false,published:false,adoptedValues:0}})
let host:HTMLDivElement,root:Root
const lock=vi.fn()
async function mount(p=planning){await act(async()=>root.render(createElement(FamilyProposalPanel,{planning:p,onLockChange:lock})))}
async function click(label:string){await act(async()=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label)!.click())}
beforeEach(async()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.mocked(fetcher).mockReset().mockResolvedValue(none());lock.mockReset();
  host=document.createElement('div');document.body.append(host);root=createRoot(host);await mount()})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks()})
it('requires a saved B3 receipt and recovered state before sending only technical references',async()=>{
  await mount({...planning,revision:0,latest:null});expect(host.textContent).toContain('Guarda primero el cálculo')
  await mount();expect(host.querySelectorAll('button')[1].disabled).toBe(true)
  await click('Consultar propuesta');expect(host.textContent).toContain('Aún sin propuesta guardada')
  vi.mocked(fetcher).mockResolvedValue(saved());await click('Guardar propuesta por familias')
  const [path,options]=vi.mocked(fetcher).mock.calls.at(-1)!
  expect(path).toBe('/api/v1/cost-bases/base-a/versions/version-a/family-proposal')
  expect(Object.keys(options!.json as object).sort()).toEqual(['context','expectedRevision','expectedVersionFingerprint',
    'expectedPlanningRequestId','expectedPlanningRevision','expectedSnapshot','requestId'].sort())
  expect(host.textContent).toContain('Propuesta vigente');expect(host.textContent).toContain('32 partidas fijas')
  expect(host.querySelectorAll('button')[1].disabled).toBe(true)
})
it('replays the same UUID on uncertainty, locks parent writes, and does not automatically retry',async()=>{
  await click('Consultar propuesta');vi.mocked(fetcher).mockRejectedValue(new ClientApiError(502,null,'unreachable'))
  await click('Guardar propuesta por familias');const cmd=vi.mocked(fetcher).mock.calls.at(-1)![1]!.json
  expect(lock).toHaveBeenLastCalledWith(true);const before=vi.mocked(fetcher).mock.calls.length
  await act(async()=>{});expect(vi.mocked(fetcher).mock.calls).toHaveLength(before)
  vi.mocked(fetcher).mockResolvedValue({...saved(),replayed:true});await click('Reintentar misma propuesta')
  expect(vi.mocked(fetcher).mock.calls.at(-1)![1]!.json).toEqual(cmd);expect(host.textContent).toContain('sin duplicar')
  expect(lock).toHaveBeenLastCalledWith(false)
})
it('requires recovery on conflict instead of showing saved or retrying with a new UUID',async()=>{
  await click('Consultar propuesta');vi.mocked(fetcher).mockRejectedValue(new ClientApiError(409,null,'conflict'))
  await click('Guardar propuesta por familias');expect(host.textContent).toContain('Recupera el cálculo y consulta la propuesta')
  expect(host.textContent).not.toContain('Reintentar misma propuesta');expect(host.querySelectorAll('button')[1].disabled).toBe(true)
})
it.each([401,403])('withdraws provenance on denied access %s',async status=>{
  vi.mocked(fetcher).mockResolvedValue(saved());await click('Consultar propuesta')
  vi.mocked(fetcher).mockRejectedValue(new ClientApiError(status,null,'denied'));await click('Consultar propuesta')
  expect(host.textContent).not.toContain('32 partidas fijas');expect(host.textContent).toContain('Acceso invalidado')
})
it('ignores late response after expiry and clears pending receipts',async()=>{
  let finish!:(v:unknown)=>void;vi.mocked(fetcher).mockImplementation(()=>new Promise(resolve=>{finish=resolve}) as ReturnType<typeof fetcher>)
  await click('Consultar propuesta');await act(async()=>window.dispatchEvent(new Event(sessionExpiredEvent)))
  await act(async()=>finish(saved()));expect(host.textContent).not.toContain('32 partidas fijas')
})
it('validates response identity, receipt, version, source and non-adoption flags',()=>{
  for(const mutate of [(v:FamilyProposalView)=>{v.scope.sub='other'},(v:FamilyProposalView)=>{v.context.versionId='other'},
    (v:FamilyProposalView)=>{v.latest!.receipt.revision=2},(v:FamilyProposalView)=>{v.latest!.versionFingerprint='f'.repeat(64)},
    (v:FamilyProposalView)=>{v.latest!.sourceSnapshotSha256='0'.repeat(64)},(v:FamilyProposalView)=>{(v as unknown as {quoteReady:boolean}).quoteReady=true}]){
    const view=saved();mutate(view);expect(()=>parseFamilyProposalView(view,planning)).toThrow()
  }
})
it('distinguishes recovered historical replay from a current proposal and unlocks B3 recovery',async()=>{
  await click('Consultar propuesta');vi.mocked(fetcher).mockRejectedValue(new ClientApiError(502,null,'uncertain'))
  await click('Guardar propuesta por familias');const cmd=vi.mocked(fetcher).mock.calls.at(-1)![1]!.json
  vi.mocked(fetcher).mockResolvedValue({...saved(),status:'STALE',replayed:true})
  await click('Reintentar misma propuesta')
  expect(vi.mocked(fetcher).mock.calls.at(-1)![1]!.json).toEqual(cmd)
  expect(host.textContent).toContain('Recibo recuperado sin duplicar. La propuesta es anterior')
  expect(host.textContent).toContain('recupera el cálculo B3');expect(host.textContent).not.toContain('Propuesta vigente')
  expect(lock).toHaveBeenLastCalledWith(false)
})

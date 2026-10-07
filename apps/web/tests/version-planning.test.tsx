import { act,createElement } from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import { OwnRelayReview } from '../app/(app)/cost-bases/own-relay-review'
import { fetcher,ClientApiError,sessionExpiredEvent } from '../lib/fetcher'
import {readOwnRelayReview} from '../../api/src/modules/engine/b2-own-relay-review'
import {parsePlanningView,type PlanningView,type PlanningCommand} from '../lib/version-planning'
vi.mock('../lib/fetcher',async original=>({...await original<typeof import('../lib/fetcher')>(),fetcher:vi.fn()}))
const selection={cycleId:'NETWORK_EXPECTED_EMPTY_PROXY',fundingMode:'CASH',fxDate:'2026-09-30',restInterpretation:'RATE_EXCLUDES_WEEKLY_REST'} as const
const initial=():PlanningView=>({context:{orgId:'org-a',baseId:'base-a',versionId:'version-a'},scope:{orgId:'org-a',sub:'actor-a'},
  versionFingerprint:'a'.repeat(64),bindingSha256:'b'.repeat(64),revision:0,latest:null,editable:true,appliedToParams:false})
const calculated=()=>readOwnRelayReview(selection,initial().scope)
function saved(command?:PlanningCommand):PlanningView {return {...initial(),revision:1,latest:{kind:'FCM_VERSION_PLANNING_V1',
  versionId:'version-a',context:initial().context,revision:1,requestId:command?.requestId??'2d26f150-2bb4-4e7e-95f0-d098d2d4f274',
  commandSha256:'c'.repeat(64),savedAt:'2026-10-05T15:30:00.000Z',savedBy:'actor-a',versionFingerprint:initial().versionFingerprint,
  bindingSha256:initial().bindingSha256,selection,note:command?.note??'QA',planningAccepted:true,calculation:calculated()}}}
let host:HTMLDivElement,root:Root
async function mount(view=initial()){await act(async()=>root.render(createElement(OwnRelayReview,{expectedOrgId:'org-a',initialPlanning:view})))}
async function button(text:string){await act(async()=>{Array.from(host.querySelectorAll('button')).find(b=>b.textContent===text)!.click()})}
async function accept(){await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click())}
beforeEach(async()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.mocked(fetcher).mockReset().mockResolvedValue(calculated());
  host=document.createElement('div');document.body.append(host);root=createRoot(host);await mount()})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks()})
it('calculates, confirms, saves complete server result and reopens saved selection',async()=>{
  await button('Calcular escenario');expect(host.querySelector('table')).not.toBeNull()
  const save=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Guardar cálculo')!
  expect(save.disabled).toBe(true);await accept()
  vi.mocked(fetcher).mockImplementation(async(_p,options)=>saved(options?.json as PlanningCommand) as never)
  await button('Guardar cálculo');expect(host.textContent).toContain('Cálculo guardado con su escenario')
  const call=vi.mocked(fetcher).mock.calls.at(-1)!
  expect(call[0]).toBe('/api/v1/cost-bases/base-a/versions/version-a/planning');expect(call[1]?.method).toBe('PUT')
  expect((call[1]?.json as PlanningCommand).selection).toEqual(selection)
  await act(async()=>root.unmount());root=createRoot(host);await mount(saved())
  expect(host.textContent).toContain('Cálculo guardado recuperado');expect(host.querySelectorAll('select')[0].value).toBe(selection.cycleId)
})
it('keeps the same request after uncertain write and restores successful receipt without another UUID',async()=>{
  await button('Calcular escenario');await accept();vi.mocked(fetcher).mockRejectedValue(new ClientApiError(502,null,'unreachable'))
  await button('Guardar cálculo');const original=vi.mocked(fetcher).mock.calls.at(-1)![1]!.json as PlanningCommand
  expect(host.querySelector('select')!.disabled).toBe(true)
  vi.mocked(fetcher).mockImplementation(async(_p,o)=>({...saved(o?.json as PlanningCommand),replayed:true}) as never)
  await button('Reintentar mismo guardado');expect(vi.mocked(fetcher).mock.calls.at(-1)![1]!.json).toEqual(original)
  expect(host.textContent).toContain('sin duplicar');expect(host.querySelector('select')!.disabled).toBe(false)
})
it('recovers after revision conflict and never replaces it automatically',async()=>{
  await button('Calcular escenario');await accept();vi.mocked(fetcher).mockRejectedValue(new ClientApiError(409,null,'conflict'))
  await button('Guardar cálculo');expect(host.textContent).toContain('Recupera el cálculo guardado')
  vi.mocked(fetcher).mockResolvedValue(saved());await button('Recuperar cálculo guardado')
  expect(host.textContent).toContain('Revisión guardada 1');expect(host.querySelector('select')!.disabled).toBe(false)
})
it.each([401,403])('removes results and notes after denied recovery %s',async status=>{
  await mount(saved());vi.mocked(fetcher).mockRejectedValue(new ClientApiError(status,null,'denied'))
  await button('Recuperar cálculo guardado');expect(host.querySelector('table')).toBeNull();expect(host.querySelector('textarea')).toBeNull()
})
it('ignores a late save after session expiry',async()=>{
  await button('Calcular escenario');await accept();let finish!:(v:unknown)=>void
  vi.mocked(fetcher).mockImplementation(()=>new Promise(resolve=>{finish=resolve}) as ReturnType<typeof fetcher>)
  await button('Guardar cálculo');await act(async()=>window.dispatchEvent(new Event(sessionExpiredEvent)))
  await act(async()=>finish(saved()));expect(host.querySelector('table')).toBeNull();expect(host.querySelector('textarea')).toBeNull()
})
it('rejects another org, account, version, record context or inflated cost',()=>{
  for(const mutate of [(v:PlanningView)=>{v.scope.orgId='other'},(v:PlanningView)=>{v.scope.sub='other'},
    (v:PlanningView)=>{v.context.versionId='other'},(v:PlanningView)=>{v.latest!.context.baseId='other'},
    (v:PlanningView)=>{v.latest!.calculation.case.outputs.productiveCostUsd=1}]) {
    const next=saved();mutate(next);expect(()=>parsePlanningView(next,initial())).toThrow()
  }
})
it('withdraws results on selection change until server calculation',async()=>{
  await mount(saved());await act(async()=>{const select=host.querySelectorAll('select')[1];select.value='FINANCED';select.dispatchEvent(new Event('change',{bubbles:true}))})
  expect(host.querySelector('table')).toBeNull();expect(host.textContent).not.toContain('Guardar cálculo')
})
it('freezes the B3 editor while a family write is uncertain so its receipt cannot be lost',async()=>{
  // A fresh page load, not a prop-only update of the previous empty editor.
  await act(async()=>root.unmount());root=createRoot(host)
  await mount(saved());vi.mocked(fetcher).mockResolvedValue({context:initial().context,scope:initial().scope,
    revision:0,status:'NONE',latest:null,appliedToParams:false,quoteReady:false})
  await button('Consultar propuesta')
  vi.mocked(fetcher).mockRejectedValue(new ClientApiError(502,null,'uncertain'))
  await button('Guardar propuesta por familias')
  expect(Array.from(host.querySelectorAll('select')).every(s=>s.disabled)).toBe(true)
  expect(Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Recuperar cálculo guardado')!.disabled).toBe(true)
  expect(host.querySelector('textarea')!.matches(':disabled')).toBe(true)
  expect(host.textContent).toContain('Reintentar misma propuesta')
})

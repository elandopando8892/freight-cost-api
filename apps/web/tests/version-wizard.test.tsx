import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { VersionWizard } from '../app/(app)/cost-bases/version-wizard'
import { ClientApiError, fetcher, sessionExpiredEvent } from '../lib/fetcher'
import { sameWizardContext, versionWizardHref, versionWizardPath } from '../lib/cost-base-wizard-contract'
import { wizardFixture, wizardReviewFixture } from './fixtures/version-wizard'

vi.mock('../lib/fetcher',async importOriginal=>({...await importOriginal<typeof import('../lib/fetcher')>(),fetcher:vi.fn()}))
let host:HTMLDivElement,root:Root
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.mocked(fetcher).mockReset();host=document.createElement('div');document.body.append(host);root=createRoot(host)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals()})
const text=()=>host.textContent!
const button=(label:string)=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.includes(label))!
async function click(label:string){await act(async()=>button(label).click())}
async function mount(view=wizardFixture(),canEdit=true,key='A'){await act(async()=>root.render(createElement(VersionWizard,{initial:view,canEdit,key})))}
async function input(selector:string,value:string){await act(async()=>{
  const element=host.querySelector<HTMLInputElement>(selector)!
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(element,value)
  element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))
})}
async function review(){await click('Me identifico');await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click())}
const saved=()=>{const view=wizardFixture();view.draft.revision=1;return view}

it('encodes only base/version IDs and compares ownership',()=>{
  expect(versionWizardHref('a/b','c?d')).toBe('/cost-bases/a%2Fb/versions/c%3Fd/build')
  expect(versionWizardPath('a/b','c?d')).toBe('/cost-bases/a%2Fb/versions/c%3Fd/wizard')
  const other=wizardFixture();other.draft.context.orgId='other';expect(sameWizardContext(wizardFixture(),other)).toBe(false)
})
it('separates bound B2 review from unchanged economic profile in the existing wizard',async()=>{
  await mount(wizardReviewFixture())
  expect(text()).toContain('Contexto de revisión: relevo propio MX/US, misma caja')
  expect(text()).toContain('Perfil económico de la versión: no modificado')
  expect(text()).toContain('no acredita soporte V3 para cotizar')
  expect(fetcher).not.toHaveBeenCalled()
})
it('does not infer a relay binding from historical V3 fixture',async()=>{
  await mount();expect(text()).toContain('Contexto histórico V3')
  expect(text()).not.toContain('Perfil económico de la versión: no modificado')
})
it('binding or reference changes cannot replace the displayed review context',()=>{
  const initial=wizardReviewFixture(), changed=wizardReviewFixture()
  changed.reviewContext!.bindingSha256='d'.repeat(64);expect(sameWizardContext(initial,changed)).toBe(false)
  expect(sameWizardContext(initial,wizardFixture())).toBe(false)
  const source=wizardReviewFixture();source.catalog={...source.catalog,revision:'e'.repeat(64)};expect(sameWizardContext(initial,source)).toBe(false)
})
it('bound review saves only strict decisions, never the binding or an economic profile',async()=>{
  const view=wizardReviewFixture();await mount(view);await review()
  const next=wizardReviewFixture();next.draft.revision=1;vi.mocked(fetcher).mockResolvedValueOnce(next)
  await click('Guardar decisión')
  const command=vi.mocked(fetcher).mock.calls[0][1]!.json as Record<string,unknown>
  expect(Object.keys(command).sort()).toEqual(['context','decisions','expectedRevision','expectedVersionFingerprint','requestId'])
  expect(text()).toContain('Decisión guardada');expect(text()).toContain('Perfil económico de la versión: no modificado')
})
it('recovery cannot swap a bound review for legacy mode or another binding',async()=>{
  await mount(wizardReviewFixture());vi.mocked(fetcher).mockResolvedValueOnce(wizardFixture())
  await click('Recuperar decisiones')
  expect(text()).toContain('Recupera el acceso');expect(text()).not.toContain('Precio de diésel')
})
it.each(['WIZARD_REVIEW_SOURCE_CHANGED','WIZARD_REVIEW_HISTORY_CONFLICT','WIZARD_REVIEW_BINDING_INVALID'])('invalid %s context is removed, not preserved as editable',async code=>{
  await mount(wizardReviewFixture());await review()
  vi.mocked(fetcher).mockRejectedValueOnce(new ClientApiError(409,null,code));await click('Guardar decisión')
  expect(text()).toContain('Recupera el acceso');expect(text()).not.toContain('Perfil económico de la versión')
  expect(host.querySelector('button')).toBeNull()
})
it('does not fabricate extrema, defaults or explicit premise acceptance',async()=>{
  await mount();expect(host.querySelector<HTMLInputElement>('input[type=range]')!.disabled).toBe(true)
  expect(text()).toContain('Falta evidencia');expect(text()).toContain('0 inputs aplicados')
  expect(host.querySelector('button[aria-pressed=true]')).toBeNull()
  await click('Guardar decisión');expect(text()).toContain('Indica si');expect(fetcher).not.toHaveBeenCalled()
  await click('Me identifico');await click('Guardar decisión');expect(text()).toContain('Confirma que');expect(fetcher).not.toHaveBeenCalled()
})
it('allows no manual value and sends only scoped strict decision fields',async()=>{
  await mount();await review();vi.mocked(fetcher).mockResolvedValueOnce(saved());await click('Guardar decisión')
  expect(fetcher).toHaveBeenCalledWith('/api/v1/cost-bases/qa-base-A/versions/qa-version-A/wizard',expect.objectContaining({method:'PUT',silent:true,json:expect.objectContaining({
    context:wizardFixture().draft.context,expectedRevision:0,expectedVersionFingerprint:'a'.repeat(64),
    decisions:[{conceptId:'diesel-mx',referenceRevision:wizardFixture().catalog.revision,mode:'MARKSMAN',value:27,
      identification:'YES',justification:'',provisionalAccepted:true}],
  })}))
  expect(text()).toContain('Decisión guardada');expect(text()).toContain('revisión del wizard 1')
})
it('clearing optional manual input restores selected anchor and exact US conversion',async()=>{
  await mount();await click('Precio de diésel · EE. UU.');await review();await input('#manual-value','2');await input('#manual-value','')
  vi.mocked(fetcher).mockResolvedValueOnce(saved());await click('Guardar decisión')
  const command=vi.mocked(fetcher).mock.calls[0][1]!.json as import('../lib/cost-base-wizard-contract').VersionWizardSave
  expect(command.decisions[0].value).toBe(5.955/3.785411784);expect(command.decisions[0].mode).toBe('MARKSMAN')
})
it('manual value needs no preset acceptance and unknown position is honest',async()=>{
  await mount();await click('Me identifico');await input('#manual-value','28.125')
  expect(host.querySelector('input[type=checkbox]')).toBeNull();expect(text()).toContain('no tiene posición demostrable')
  vi.mocked(fetcher).mockResolvedValueOnce(saved());await click('Guardar decisión')
  expect((vi.mocked(fetcher).mock.calls[0][1]!.json as import('../lib/cost-base-wizard-contract').VersionWizardSave).decisions[0]).toMatchObject({mode:'MANUAL',value:28.125,provisionalAccepted:false})
})
it('blocks accidental dirty navigation and lets explicit recover discard',async()=>{
  await mount();await input('#manual-value','29');await click('Mantenimiento')
  expect(text()).toContain('antes de cambiar de concepto');expect(host.querySelector('article[aria-label="Concepto seleccionado"] h2')!.textContent).toContain('México')
  vi.mocked(fetcher).mockResolvedValueOnce(wizardFixture());await click('Descartar cambios');await click('Mantenimiento')
  expect(host.querySelector('article[aria-label="Concepto seleccionado"] h2')!.textContent).toContain('Mantenimiento');expect(text()).toContain('sin reparto artificial')
})
it.each(['VIEWER','OPERATOR','PUBLISHED','ACTIVE','ARCHIVED'])('keeps %s read only',async mode=>{
  const view=wizardFixture();if(mode==='PUBLISHED')view.version.status='PUBLISHED';if(mode==='ACTIVE')view.version.isActive=true;if(mode==='ARCHIVED')view.version.base.status='ARCHIVED'
  await mount(view,!['VIEWER','OPERATOR'].includes(mode));expect(button('Guardar decisión')).toBeUndefined()
  expect(host.querySelector('fieldset')!.disabled).toBe(true);expect(fetcher).not.toHaveBeenCalled()
})
it('reuses exact request UUID on uncertain network result without automatic retries',async()=>{
  await mount();await review();vi.mocked(fetcher).mockRejectedValueOnce(new Error('Network interrupted'))
  await click('Guardar decisión');expect(fetcher).toHaveBeenCalledTimes(1);const first=structuredClone(vi.mocked(fetcher).mock.calls[0][1]!.json)
  vi.mocked(fetcher).mockResolvedValueOnce(saved());await click('Guardar decisión')
  expect(vi.mocked(fetcher).mock.calls[1][1]!.json).toEqual(first)
})
it('does not silently reset a conflict or resave under a new revision',async()=>{
  await mount();await input('#manual-value','29');await click('Me identifico')
  vi.mocked(fetcher).mockRejectedValueOnce(new ClientApiError(409,null,'WIZARD_VERSION_CHANGED'));await click('Guardar decisión')
  expect(text()).toContain('El perfil o los parámetros cambiaron');expect(host.querySelector<HTMLInputElement>('#manual-value')!.value).toBe('29')
  expect(fetcher).toHaveBeenCalledTimes(1)
})
it('rejects another organization in a response',async()=>{
  await mount();const other=wizardFixture();other.draft.context.orgId='foreign';vi.mocked(fetcher).mockResolvedValueOnce(other)
  await click('Recuperar decisiones');expect(text()).toContain('Recupera el acceso');expect(host.querySelector('output')).toBeNull()
})
it('hides expired data and ignores a late response even if transport ignores abort',async()=>{
  await mount();let finish!:(value:ReturnType<typeof wizardFixture>)=>void
  vi.mocked(fetcher).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
  await click('Recuperar decisiones');await act(async()=>window.dispatchEvent(new Event(sessionExpiredEvent)))
  await act(async()=>finish(wizardFixture()));expect(text()).toContain('Tu sesión venció');expect(host.querySelector('output')).toBeNull()
  expect((vi.mocked(fetcher).mock.calls[0][1]!.signal as AbortSignal).aborted).toBe(true)
})
it('remount for account/version change cannot restore old response',async()=>{
  await mount();let finish!:(value:ReturnType<typeof wizardFixture>)=>void
  vi.mocked(fetcher).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));await click('Recuperar decisiones')
  const next=wizardFixture();next.version.base.name='Otra empresa QA';next.draft.context.orgId='qa-org-B'
  await mount(next,false,'B');await act(async()=>finish(wizardFixture()));expect(text()).toContain('Otra empresa QA');expect(text()).not.toContain('Base QA binacional')
})
it('positions MARKSMAN independently and interpolates only a synthetic complete range',async()=>{
  const view=wizardFixture();Object.assign(view.catalog.cards[0].statistics,{minimum:10,central:20,maximum:40});view.catalog.cards[0].standard.value=30
  await mount(view);expect(host.querySelector<HTMLInputElement>('input[type=range]')!.value).toBe('75')
  await input('#estimate-scale','25');expect(host.querySelector('output')!.textContent).toContain('15');expect(text()).toContain('Estimación propia')
})

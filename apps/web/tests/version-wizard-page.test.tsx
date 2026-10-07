import { createElement, type ComponentProps } from 'react'
import type { VersionWizard } from '../app/(app)/cost-bases/version-wizard'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect,it,vi,beforeEach } from 'vitest'
import { api,ApiError } from '@/lib/api'
import Page from '../app/(app)/cost-bases/[baseId]/versions/[versionId]/build/page'
import { wizardFixture } from './fixtures/version-wizard'
vi.mock('@/lib/api',()=>({api:vi.fn(),ApiError:class extends Error{constructor(public status:number,public body:unknown,message:string){super(message)}}}))
vi.mock('next/link',()=>({default:({prefetch:_prefetch,...props}:ComponentProps<'a'> & {prefetch?:boolean})=>createElement('a',props)}))
vi.mock('../app/(app)/cost-bases/version-wizard',()=>({VersionWizard:({initial,canEdit}:ComponentProps<typeof VersionWizard>)=>createElement('p',{},`${initial.version.base.name}; editable:${canEdit}`)}))
beforeEach(()=>{vi.mocked(api).mockReset()})
it.each(['ADMIN','OPERATOR','VIEWER'])('awaits version params and derives %s permissions from auth/me',async role=>{
  vi.mocked(api).mockImplementation(async path=>path==='/auth/me'?{id:'qa-user',role}:wizardFixture())
  const html=renderToStaticMarkup(await Page({params:Promise.resolve({baseId:'qa-base-A',versionId:'qa-version-A'})}))
  expect(api).toHaveBeenCalledWith('/cost-bases/qa-base-A/versions/qa-version-A/wizard')
  expect(html).toContain('href="/cost-bases?base=qa-base-A"');expect(html).toContain(`editable:${role==='ADMIN'}`)
})
it.each([404,409,422])('shows %i unavailable without substituting another base',async status=>{
  vi.mocked(api).mockRejectedValue(new ApiError(status,null,'unavailable'))
  const html=renderToStaticMarkup(await Page({params:Promise.resolve({baseId:'requested-base',versionId:'missing'})}))
  expect(html).toContain('No se abrirá otra base');expect(html).toContain('base=requested-base');expect(html).not.toContain('Base QA')
})

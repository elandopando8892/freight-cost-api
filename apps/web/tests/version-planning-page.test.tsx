import { beforeEach, expect, it, vi } from 'vitest'
import { api, ApiError } from '../lib/api'
import VersionPlanningPage from '../app/(app)/cost-bases/[baseId]/versions/[versionId]/planning/page'

vi.mock('@/lib/api', () => ({ api: vi.fn(), ApiError: class extends Error {
  constructor(public status:number,public body:unknown,message:string){super(message)}
} }))
vi.mock('../app/(app)/cost-bases/own-relay-review', () => ({ OwnRelayReview: () => null }))
const params=Promise.resolve({baseId:'base-a',versionId:'version-a'})
beforeEach(()=>{vi.mocked(api).mockReset()})

it('bounds the sole audited planning GET beyond the existing 15 s transaction, without an automatic retry',async()=>{
  const signal=new AbortController().signal
  const timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(signal)
  vi.mocked(api).mockResolvedValue({scope:{sub:'actor-a',orgId:'org-a'}})
  try {
    await VersionPlanningPage({params})
    expect(timeout).toHaveBeenCalledTimes(1)
    expect(timeout).toHaveBeenCalledWith(30_000)
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/cost-bases/base-a/versions/version-a/planning',{signal})
  } finally {timeout.mockRestore()}
})
it('preserves a transport timeout as a failure, not a fabricated empty or successful result',async()=>{
  const error=new DOMException('Timeout','TimeoutError')
  vi.mocked(api).mockRejectedValue(error)
  await expect(VersionPlanningPage({params})).rejects.toBe(error)
  expect(api).toHaveBeenCalledTimes(1)
})
it('preserves identity failure instead of rendering another account planning',async()=>{
  const error=new ApiError(401,null,'Unauthorized')
  vi.mocked(api).mockRejectedValue(error)
  await expect(VersionPlanningPage({params})).rejects.toBe(error)
  expect(api).toHaveBeenCalledTimes(1)
})
it.each([403,404,409,422])('retains the existing denied/unavailable handling for %s',async status=>{
  vi.mocked(api).mockRejectedValue(new ApiError(status,null,'Unavailable'))
  const result=await VersionPlanningPage({params})
  expect(result.type).toBe('main')
  expect(result.props.children[0].props.children).toBe('No se puede abrir esta planeación')
  expect(api).toHaveBeenCalledTimes(1)
})

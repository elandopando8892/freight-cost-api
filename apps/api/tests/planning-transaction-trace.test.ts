import type {Prisma} from '@prisma/client'
import {expect,it,vi} from 'vitest'
import {tracePlanningTransaction,type PlanningTraceEvent} from '../src/modules/cost-bases/planning-transaction-trace.js'
const tx={} as Prisma.TransactionClient
const direct=<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>work(tx)

it('separates acquisition, callback work and commit without logging payloads',async()=>{
  let clock=0
  const events:PlanningTraceEvent[]=[]
  const transaction=async<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>{
    clock+=20;const result=await work(tx);clock+=30;return result
  }
  const value=await tracePlanningTransaction(transaction,e=>events.push(e),async(_tx,step)=>{
    return step('append',()=>{clock+=10;return {secret:'never log this'}})
  },()=>clock)
  expect(value).toEqual({secret:'never log this'})
  expect(events.map(e=>[e.phase,e.status,e.durationMs])).toEqual([
    ['acquire','start',0],['acquire','ok',20],['append','start',0],['append','ok',10],['commit','start',0],['commit','ok',30],
  ])
  expect(new Set(events.map(e=>e.traceId)).size).toBe(1)
  expect(JSON.stringify(events)).not.toMatch(/secret|never log this/)
})
it.each(['acquire','version-lock','commit'] as const)('identifies %s failure and preserves the exact rejection without retry',async phase=>{
  const error=Object.assign(new Error('secret SQL credential'),{code:'P2028',meta:{secret:'private'}})
  const events:PlanningTraceEvent[]=[]
  const calls=vi.fn()
  const transaction=async<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>)=>{
    calls()
    if(phase==='acquire')throw error
    const result=await work(tx)
    if(phase==='commit')throw error
    return result
  }
  await expect(tracePlanningTransaction(transaction,e=>events.push(e),async(_tx,step)=>{
    await step('version-lock',()=>{if(phase==='version-lock')throw error})
    return 1
  })).rejects.toBe(error)
  expect(calls).toHaveBeenCalledTimes(1)
  expect(events.filter(e=>e.status==='error')).toEqual([expect.objectContaining({phase,code:'P2028'})])
  expect(events.some(e=>e.phase==='commit'&&e.status==='ok')).toBe(false)
  expect(JSON.stringify(events)).not.toMatch(/secret|credential|private/)
})
it('diagnostic observer failures cannot change a successful commit or its result',async()=>{
  const result=await tracePlanningTransaction(direct,()=>{throw new Error('sink failed')},async(_tx,step)=>step('append',()=>42))
  expect(result).toBe(42)
})
it('unknown error codes are redacted and failed work stops before append',async()=>{
  const events:PlanningTraceEvent[]=[],append=vi.fn(),error={code:'contains-private-id'}
  await expect(tracePlanningTransaction(direct,e=>events.push(e),async(_tx,step)=>{
    await step('read',()=>{throw error});await step('append',append)
  })).rejects.toBe(error)
  expect(append).not.toHaveBeenCalled()
  expect(events.at(-1)).toMatchObject({phase:'read',status:'error',code:'UNKNOWN'})
  expect(JSON.stringify(events)).not.toContain('private-id')
})
it('the default production path requires no observer and preserves result and errors',async()=>{
  expect(await tracePlanningTransaction(direct,undefined,async(_tx,step)=>step('validate',()=>7))).toBe(7)
  const error=new Error('original')
  await expect(tracePlanningTransaction(direct,undefined,async()=>{throw error})).rejects.toBe(error)
})

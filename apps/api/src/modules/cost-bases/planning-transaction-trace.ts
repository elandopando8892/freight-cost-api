import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'

type Transaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>
type WorkPhase = 'organization-lock' | 'version-lock' | 'read' | 'validate' | 'append'
export type PlanningTraceEvent = {
  event: 'B3_TRANSACTION_PHASE'; traceId: string;
  phase: WorkPhase | 'acquire' | 'commit'; status: 'start' | 'ok' | 'error';
  elapsedMs: number; durationMs: number; code?: string;
}
export type PlanningTraceObserver = (event: PlanningTraceEvent) => void
type Step = <T>(phase: WorkPhase, work: () => T | Promise<T>) => Promise<T>

/** Optional diagnostics. No SQL, identities, inputs, outputs or error messages.
 * Observers cannot change the result, swallow failures or trigger retries. */
export async function tracePlanningTransaction<T>(transaction: Transaction,
  observer: PlanningTraceObserver | undefined,
  work: (tx: Prisma.TransactionClient, step: Step) => Promise<T>, now = () => performance.now()): Promise<T> {
  if (!observer) return transaction(tx => work(tx, async (_phase, action) => action()))
  const traceId = randomUUID(), started = now()
  const emit = (phase: PlanningTraceEvent['phase'], status: PlanningTraceEvent['status'], since: number, error?: unknown) => {
    const at = now(), candidate = error && typeof error === 'object' ? (error as {code?:unknown}).code : undefined
    const code = status === 'error' ? typeof candidate === 'string' && /^P\d{4}$/.test(candidate) ? candidate : 'UNKNOWN' : undefined
    try { observer({event:'B3_TRANSACTION_PHASE',traceId,phase,status,
      elapsedMs:Math.max(0,Math.round(at-started)),durationMs:Math.max(0,Math.round(at-since)),...(code?{code}:{})}) }
    catch { /* Diagnostic sink failures must not affect a transaction. */ }
  }
  const step: Step = async (phase, action) => {
    const since=now();emit(phase,'start',since)
    try { const value=await action();emit(phase,'ok',since);return value }
    catch(error){emit(phase,'error',since,error);throw error}
  }
  let entered=false, commitStarted:number|undefined
  emit('acquire','start',started)
  try {
    const result=await transaction(async tx=>{
      entered=true;emit('acquire','ok',started)
      const value=await work(tx,step)
      commitStarted=now();emit('commit','start',commitStarted)
      return value
    })
    if(commitStarted!==undefined)emit('commit','ok',commitStarted)
    return result
  }catch(error){
    if(!entered)emit('acquire','error',started,error)
    else if(commitStarted!==undefined)emit('commit','error',commitStarted,error)
    throw error
  }
}

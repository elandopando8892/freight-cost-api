import { W2_CLOSEOUT_READBACK_MARKER } from './w2-closeout-gate.js'
import {isDeepStrictEqual} from 'node:util'
export const B3_RECOVERY_START='2026-10-06T01:41:29.343Z'
export const B3_RECOVERY_DEADLINE='2026-10-06T02:26:29.343Z'
export const B3_RECOVERY_MARKER=`FCM_B3_SAAS_RECOVERY:${B3_RECOVERY_DEADLINE}`
export const B3_RECOVERY_AUTHORITY=`human-autorizo-existing-revision1-recovery:${B3_RECOVERY_START}:one-activation-zero-new-save:${B3_RECOVERY_DEADLINE}`
export function assertB3RecoveryOpen(now=Date.now()){
  if(!Number.isFinite(now)||now<Date.parse(B3_RECOVERY_START)||now>=Date.parse(B3_RECOVERY_DEADLINE))throw new Error('B3 recovery window closed')
}
export function b3RecoveryReplayAllowed(actor:{orgId:string;sub:string},body:unknown,receipt:{actor:{orgId:string;sub:string};body:unknown}|undefined){
  return !!receipt&&actor.orgId===receipt.actor.orgId&&actor.sub===receipt.actor.sub&&isDeepStrictEqual(body,receipt.body)
}
export const B3_START='2026-10-05T15:06:36.000Z'
export const B3_DEADLINE='2026-10-05T18:06:36.000Z'
export const B3_MARKER=`FCM_B3_SAAS:${B3_DEADLINE}`
export const B3_REPAIR_MARKER=`FCM_B3_SAAS_REPAIR1:${B3_DEADLINE}`
export const B3_ROUTE_FIX_MARKER=`FCM_B3_SAAS_ROUTE_FIX:${B3_DEADLINE}`
export const B3_AUTHORITY=`human-b3-until-closed:${B3_START}:existing-qa-one-planning-save:${B3_DEADLINE}`
// Human reply: one additional activation, same deadline/grants and prior attempts retained.
export const B3_ROUTE_FIX_AUTHORITY=`human-b3-route-fix:call_mSYsuV9ju027QzsF7lbxOOPI:one-additional-execution:${B3_DEADLINE}`
export const B3_FINAL_START='2026-10-05T16:41:06.000Z'
export const B3_FINAL_DEADLINE='2026-10-05T17:11:06.000Z'
export const B3_FINAL_MARKER=`FCM_B3_SAAS_FINAL:${B3_FINAL_DEADLINE}`
export const B3_FINAL_AUTHORITY=`human-b3-final:call_MLzHQbMCW1K9egXLKrZzEJGQ:last-execution-30m:${B3_FINAL_DEADLINE}`
// Additional human authorization after local read consolidation; prior attempts remain consumed.
export const B3_OPTIMIZED_START='2026-10-05T18:06:00.000Z'
export const B3_OPTIMIZED_DEADLINE='2026-10-05T18:51:00.000Z'
export const B3_OPTIMIZED_MARKER=`FCM_B3_SAAS_OPTIMIZED:${B3_OPTIMIZED_DEADLINE}`
export const B3_OPTIMIZED_AUTHORITY=`human-continua-siguiente-proceso-tienes-mi-autorizacion:${B3_OPTIMIZED_START}:one-additional-save:${B3_OPTIMIZED_DEADLINE}`
export function assertB3OptimizedOpen(now=Date.now()) {
  if(!Number.isFinite(now)||now<Date.parse(B3_OPTIMIZED_START)||now>=Date.parse(B3_OPTIMIZED_DEADLINE))throw new Error('B3 optimized window closed')
}
export const B3_TRACE_START='2026-10-05T19:04:16.000Z'
export const B3_TRACE_DEADLINE='2026-10-05T19:49:16.000Z'
export const B3_TRACE_MARKER=`FCM_B3_SAAS_TRACE:${B3_TRACE_DEADLINE}`
export const B3_TRACE_AUTHORITY=`human-autorizo-phase-diagnostics:${B3_TRACE_START}:one-save-45m:${B3_TRACE_DEADLINE}`
export function assertB3TraceOpen(now=Date.now()) {
  if(!Number.isFinite(now)||now<Date.parse(B3_TRACE_START)||now>=Date.parse(B3_TRACE_DEADLINE))throw new Error('B3 trace window closed')
}
export function assertB3Open(now=Date.now()) {
  if(!Number.isFinite(now)||now<Date.parse(B3_START)||now>=Date.parse(B3_DEADLINE))throw new Error('B3 window closed')
}
export function assertB3FinalOpen(now=Date.now()) {
  assertB3Open(now)
  if(now<Date.parse(B3_FINAL_START)||now>=Date.parse(B3_FINAL_DEADLINE))throw new Error('B3 final window closed')
}
export function assertB3Role(role:{marker:string;login:boolean;sessions:number}|undefined,verifiedRepair:boolean|'route-fix'|'final-validation'|'optimized-validation'|'trace-validation'|'recovery-validation'=false) {
  const previous=verifiedRepair==='recovery-validation'?B3_TRACE_MARKER:verifiedRepair==='trace-validation'?B3_OPTIMIZED_MARKER:verifiedRepair==='optimized-validation'?B3_FINAL_MARKER:verifiedRepair==='final-validation'?B3_ROUTE_FIX_MARKER:verifiedRepair==='route-fix'?B3_REPAIR_MARKER:verifiedRepair?B3_MARKER:W2_CLOSEOUT_READBACK_MARKER
  if(!role||role.marker!==previous||role.login||role.sessions!==0)throw new Error('B3 previous role state differs')
}
export function b3RequestAllowed(method:string,url:string,baseId:string,versionId:string) {
  const path=url.split('?',1)[0],root=`/cost-bases/${baseId}/versions/${versionId}`
  return method==='GET'&&['/health','/ready','/auth/me',`${root}/wizard`,`${root}/planning`,'/engine/benchmark-owned-d2d/own-relay-review'].includes(path)
    ||method==='PUT'&&path===`${root}/planning`
}

// Human reply 6oct2026: one new family proposal in the SAME QA, 45 minutes,
// no reactivation/retry. The old role marker is the durable consumption boundary.
export const S2_FAMILY_AUTHORIZED_AT='2026-10-06T15:40:06.000Z'
export const S2_FAMILY_LAUNCH_UNTIL='2026-10-06T16:40:06.000Z'
export const S2_FAMILY_AUTHORITY=`human-autorizo-same-qa-one-family-save-45m:${S2_FAMILY_AUTHORIZED_AT}`
type FamilyWindow={startedAt:string;deadline:string;marker:string}
export const S2_FAMILY_ACTOR_FIX_AUTHORIZED_AT='2026-10-06T23:57:15.000Z'
export const S2_FAMILY_ACTOR_FIX_LAUNCH_UNTIL='2026-10-07T00:57:15.000Z'
export const S2_FAMILY_ACTOR_FIX_AUTHORITY=`human-autorizo-same-qa-actor-fix-one-execution-30m:${S2_FAMILY_ACTOR_FIX_AUTHORIZED_AT}`
export const S2_FAMILY_ACTOR_FIX_PRIOR_MARKER='FCM_S2_FAMILY_QA_AMENDMENT:2026-10-06T23:13:13.966Z:2026-10-06T23:58:13.966Z'
export function createS2FamilyActorFixWindow(now=Date.now()):FamilyWindow{
  if(!Number.isFinite(now)||now<Date.parse(S2_FAMILY_ACTOR_FIX_AUTHORIZED_AT)||now>=Date.parse(S2_FAMILY_ACTOR_FIX_LAUNCH_UNTIL))throw new Error('S2 actor-fix launch authorization expired')
  const startedAt=new Date(now).toISOString(),deadline=new Date(now+30*60_000).toISOString()
  return Object.freeze({startedAt,deadline,marker:`FCM_S2_FAMILY_QA_ACTOR_FIX:${startedAt}:${deadline}`})
}
export function assertS2FamilyActorFixOpen(w:FamilyWindow,now=Date.now()){
  const expected=createS2FamilyActorFixWindow(Date.parse(w.startedAt))
  if(!isDeepStrictEqual(expected,w)||!Number.isFinite(now)||now<Date.parse(w.startedAt)||now>=Date.parse(w.deadline))throw new Error('S2 actor-fix window closed or changed')
}
export function assertS2FamilyActorFixRole(role:{marker:string;login:boolean;sessions:number}|undefined){
  if(!role||role.marker!==S2_FAMILY_ACTOR_FIX_PRIOR_MARKER||role.login||role.sessions!==0)throw new Error('S2 prior amendment closure differs')
}
export const S2_FAMILY_AMENDMENT_AUTHORIZED_AT='2026-10-06T23:04:59.000Z'
export const S2_FAMILY_AMENDMENT_LAUNCH_UNTIL='2026-10-07T00:04:59.000Z'
export const S2_FAMILY_AMENDMENT_AUTHORITY=`human-autorizo-one-additional-same-qa-family-execution-45m:${S2_FAMILY_AMENDMENT_AUTHORIZED_AT}`
export const S2_FAMILY_PRIOR_MARKER='FCM_S2_FAMILY_QA:2026-10-06T15:51:02.872Z:2026-10-06T16:36:02.872Z'
export function createS2FamilyAmendedWindow(now=Date.now()):FamilyWindow{
  if(!Number.isFinite(now)||now<Date.parse(S2_FAMILY_AMENDMENT_AUTHORIZED_AT)||now>=Date.parse(S2_FAMILY_AMENDMENT_LAUNCH_UNTIL))throw new Error('S2 amended launch authorization expired')
  const startedAt=new Date(now).toISOString(),deadline=new Date(now+45*60_000).toISOString()
  return Object.freeze({startedAt,deadline,marker:`FCM_S2_FAMILY_QA_AMENDMENT:${startedAt}:${deadline}`})
}
export function assertS2FamilyAmendedOpen(w:FamilyWindow,now=Date.now()){
  const expected=createS2FamilyAmendedWindow(Date.parse(w.startedAt))
  if(!isDeepStrictEqual(expected,w)||!Number.isFinite(now)||now<Date.parse(w.startedAt)||now>=Date.parse(w.deadline))throw new Error('S2 amended window closed or changed')
}
export function assertS2FamilyAmendedRole(role:{marker:string;login:boolean;sessions:number}|undefined){
  if(!role||role.marker!==S2_FAMILY_PRIOR_MARKER||role.login||role.sessions!==0)throw new Error('S2 prior family closure differs')
}
export function createS2FamilyWindow(now=Date.now()):FamilyWindow{
  if(!Number.isFinite(now)||now<Date.parse(S2_FAMILY_AUTHORIZED_AT)||now>=Date.parse(S2_FAMILY_LAUNCH_UNTIL))throw new Error('S2 family launch authorization expired')
  const startedAt=new Date(now).toISOString(),deadline=new Date(now+45*60_000).toISOString()
  return Object.freeze({startedAt,deadline,marker:`FCM_S2_FAMILY_QA:${startedAt}:${deadline}`})
}
export function assertS2FamilyOpen(w:FamilyWindow,now=Date.now()){
  const expected=createS2FamilyWindow(Date.parse(w.startedAt))
  if(!isDeepStrictEqual(expected,w)||!Number.isFinite(now)||now<Date.parse(w.startedAt)||now>=Date.parse(w.deadline))throw new Error('S2 family window closed or changed')
}
export function assertS2FamilyRole(role:{marker:string;login:boolean;sessions:number}|undefined){
  if(!role||role.marker!==B3_RECOVERY_MARKER||role.login||role.sessions!==0)throw new Error('S2 previous RECOVERY closure differs')
}
export function s2FamilyRequestAllowed(method:string,url:string,baseId:string,versionId:string){
  const path=url.split('?',1)[0],root=`/cost-bases/${baseId}/versions/${versionId}`
  return method==='GET'&&['/health','/ready','/auth/me',`${root}/wizard`,`${root}/planning`,`${root}/family-proposal`,
    '/engine/benchmark-owned-d2d/own-relay-review'].includes(path)||method==='PUT'&&path===`${root}/family-proposal`
}
export function createS2FamilyAttempt(){
  type Receipt={actor:{orgId:string;sub:string};body:unknown}
  let pending:Receipt|undefined,successful:Receipt|undefined
  const receipt=(actor:Receipt['actor'],body:unknown)=>structuredClone({actor:{orgId:actor.orgId,sub:actor.sub},body})
  const deny=()=>{throw Object.assign(new Error('S2_FAMILY_ATTEMPT_CONSUMED'),{statusCode:409})}
  return {begin(actor:Receipt['actor'],body:unknown){
    const candidate=receipt(actor,body)
    if(pending){if(!successful||!isDeepStrictEqual(candidate,successful))deny();return}
    pending=candidate
  },completed(actor:Receipt['actor'],body:unknown){
    const candidate=receipt(actor,body)
    if(!pending||!isDeepStrictEqual(candidate,pending))deny()
    successful=candidate
  }}
}

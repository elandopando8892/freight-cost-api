import {spawn,spawnSync} from 'node:child_process'
import {readFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {createServer} from 'node:net'
import {createInterface} from 'node:readline'
import {parse} from 'dotenv'
import {B3_DEADLINE,B3_AUTHORITY,B3_FINAL_DEADLINE,B3_FINAL_AUTHORITY,assertB3Open,assertB3FinalOpen} from './lib/b3-saas-gate.js'
import {B3_OPTIMIZED_DEADLINE,B3_OPTIMIZED_AUTHORITY,assertB3OptimizedOpen} from './lib/b3-saas-gate.js'
import {B3_TRACE_DEADLINE,B3_TRACE_AUTHORITY,assertB3TraceOpen} from './lib/b3-saas-gate.js'
import {B3_RECOVERY_DEADLINE,B3_RECOVERY_AUTHORITY,assertB3RecoveryOpen} from './lib/b3-saas-gate.js'
import {S2_FAMILY_AUTHORITY,assertS2FamilyOpen} from './lib/b3-saas-gate.js'
import {S2_FAMILY_AMENDMENT_AUTHORITY,assertS2FamilyAmendedOpen} from './lib/b3-saas-gate.js'
import {S2_FAMILY_ACTOR_FIX_AUTHORITY,assertS2FamilyActorFixOpen} from './lib/b3-saas-gate.js'
const root=resolve(__dirname,'../../..'),cwd=resolve(root,'apps/web')
const final=process.argv.slice(2).join(' ')==='--final-validation'
const optimized=process.argv.slice(2).join(' ')==='--optimized-validation'
const trace=process.argv.slice(2).join(' ')==='--trace-validation'
const recovery=process.argv.slice(2).join(' ')==='--recovery-validation'
const familyAmended=process.argv.slice(2).join(' ')==='--family-amendment-validation'
const familyActorFix=process.argv.slice(2).join(' ')==='--family-actor-fix-validation'
const family=familyActorFix||familyAmended||process.argv.slice(2).join(' ')==='--family-validation'
const familyWindow=family?JSON.parse(process.env.FCM_S2_FAMILY_GATE_WINDOW??'null'):null
const deadline=family?familyWindow?.deadline:recovery?B3_RECOVERY_DEADLINE:trace?B3_TRACE_DEADLINE:optimized?B3_OPTIMIZED_DEADLINE:final?B3_FINAL_DEADLINE:B3_DEADLINE
async function main(){
  if(familyActorFix)assertS2FamilyActorFixOpen(familyWindow)
  else if(familyAmended)assertS2FamilyAmendedOpen(familyWindow)
  else if(family)assertS2FamilyOpen(familyWindow)
  else (recovery?assertB3RecoveryOpen:trace?assertB3TraceOpen:optimized?assertB3OptimizedOpen:final?assertB3FinalOpen:assertB3Open)()
  if((family?process.env.FCM_S2_FAMILY_GATE_APPROVAL:process.env.FCM_B3_GATE_APPROVAL)!==(familyActorFix?S2_FAMILY_ACTOR_FIX_AUTHORITY:familyAmended?S2_FAMILY_AMENDMENT_AUTHORITY:family?S2_FAMILY_AUTHORITY:recovery?B3_RECOVERY_AUTHORITY:trace?B3_TRACE_AUTHORITY:optimized?B3_OPTIMIZED_AUTHORITY:final?B3_FINAL_AUTHORITY:B3_AUTHORITY))throw new Error('B3 web authority reference missing')
  await new Promise<void>((ok,no)=>{const s=createServer();s.once('error',no);s.listen(3001,'127.0.0.1',()=>s.close(e=>e?no(e):ok()))})
  const publicSource=parse(readFileSync('D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830/apps/web/.env.local'))
  if(publicSource.NEXT_PUBLIC_SUPABASE_URL!=='https://alqjqzqagdmcywpjtnnr.supabase.co'||!publicSource.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw new Error('Public Auth config changed')
  const env={...process.env}
  for(const name of ['.env','.env.local','.env.development','.env.development.local']){
    const file=resolve(cwd,name);if(existsSync(file))for(const key of Object.keys(parse(readFileSync(file))))env[key]=''
  }
  for(const key of Object.keys(env))if(/DATABASE|SECRET|SERVICE_ROLE|OPENAI|ANTHROPIC|GOOGLE_.*KEY|MAPS_.*KEY|RATEWARE_API|CRON|SUPABASE.*KEY/.test(key))env[key]=''
  Object.assign(env,{NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',API_URL:'http://127.0.0.1:3002',
    NEXT_PUBLIC_SUPABASE_URL:publicSource.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:publicSource.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY})
  const child=spawn(process.execPath,[resolve(cwd,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3001'],{cwd,env,windowsHide:true,stdio:'ignore'})
  console.log(JSON.stringify({ownNextStarted:true,pid:child.pid,url:'http://localhost:3001',deadline}))
  let closing=false
  const stop=()=>{if(closing)return;closing=true;clearTimeout(timer)
    if(child.pid){const r=spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});console.log(JSON.stringify({ownNextStopped:true,pid:child.pid,status:r.status}))}
  }
  const timer=setTimeout(stop,Math.max(1,Date.parse(deadline)-Date.now()))
  child.once('error',()=>{clearTimeout(timer);console.error('B3 own Next launch failed');process.exit(1)})
  child.once('exit',(code)=>{clearTimeout(timer);console.log(JSON.stringify({ownNextExitVerified:true,pid:child.pid,exitCode:code}));process.exit(closing?0:code??1)})
  createInterface({input:process.stdin}).on('line',line=>{if(line==='stop')stop()})
  process.once('SIGINT',stop);process.once('SIGTERM',stop)
}
main().catch(()=>{console.error('B3 web stopped before launch; inspect configuration/port');process.exitCode=1})

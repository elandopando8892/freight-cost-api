import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { parse } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { LOCAL_READ_ROLE, LOCAL_READ_HOST, LOCAL_READ_EXPIRES, localReadPasswordResetSql, assertLocalReadEnvironment } from '../src/config/local-read-review.js'
import { readVerifiedPartnerPreviewTarget } from './inspect-partner-preview.js'
import { LOCAL_REVIEW_SHA, preparePrivateReviewDirectory, protectReviewCredential, readReviewCredential, fileGoogleReviewBudget, type ReviewCredential } from './lib/local-review-credential.js'
import { inspectReviewRole } from './lib/local-review-role.js'

const root = resolve(__dirname, '../../..')
let phase = 'preflight'
async function portFree(port: number) {
  const server = createServer()
  await new Promise<void>((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => server.close(error => error ? reject(error) : accept())) })
}
async function main() {
  const flags = process.argv.slice(2)
  if (flags.some(f => !['--recover-credential', '--review-google', '--start-web'].includes(f))) throw new Error('Unknown option')
  const recover = flags.includes('--recover-credential'), google = flags.includes('--review-google'), web = flags.includes('--start-web')
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore','pipe','pipe'] }).trim()
  if (git('branch','--show-current') !== 'codex/cost-tires-release-s14' || git('rev-parse','HEAD') !== LOCAL_REVIEW_SHA) throw new Error('Checkout changed')
  if (recover && process.env.FCM_LOCAL_READ_APPROVAL !== `RESET_AND_DPAPI:${LOCAL_READ_ROLE}:${LOCAL_REVIEW_SHA}`) throw new Error('Exact recovery approval missing')
  if (google && process.env.FCM_LOCAL_GOOGLE_REVIEW_APPROVAL !== `MAPS1_ROUTES1:LAREDO_FORT_SMITH:${LOCAL_REVIEW_SHA}`) throw new Error('Exact route review approval missing')
  await portFree(3002); if (web) await portFree(3000)
  const folder = preparePrivateReviewDirectory(root)
  if (recover && existsSync(resolve(folder,'credential.dpapi'))) throw new Error('Saved credential exists; resume without rotation')
  // Public Auth already approved; select only two values, not a whole env/old credentials.
  const source = parse(readFileSync('D:/andre/worktrees/freight-cost-model/supabase-auth-migration-20260830/apps/web/.env.local'))
  const authUrl = source.NEXT_PUBLIC_SUPABASE_URL, authKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (authUrl !== 'https://alqjqzqagdmcywpjtnnr.supabase.co' || !authKey?.startsWith('sb_publishable_')) throw new Error('Approved Auth source unavailable')
  const routeKey = google ? parse(readFileSync(resolve(root,'.env.google-routes.local'))).GOOGLE_ROUTES_API_KEY?.trim() : ''
  const browserKey = google ? parse(readFileSync(resolve(root,'apps/web/.env.local'))).NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() : ''
  if (google && (!/^AIza[A-Za-z0-9_-]{35}$/.test(routeKey ?? '') || !/^AIza[A-Za-z0-9_-]{35}$/.test(browserKey ?? '') || routeKey === browserKey)) throw new Error('Separate approved provider keys required')
  let credential: ReviewCredential
  if (recover) {
    phase = 'recover-scoped-credential'
    const ownerUrl = readVerifiedPartnerPreviewTarget(); ownerUrl.searchParams.set('connect_timeout','10'); ownerUrl.searchParams.set('connection_limit','1')
    const owner = new PrismaClient({ datasourceUrl: ownerUrl.toString(), log: [] })
    try {
      phase = 'verify-existing-role'
      const checked = await owner.$transaction(async tx => { await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY'); return inspectReviewRole(tx) }, { timeout: 20_000 })
      if (checked.sessions !== 0) throw new Error('Existing consumers must not be interrupted')
      credential = { version:1, role:LOCAL_READ_ROLE, host:LOCAL_READ_HOST, expiresAt:LOCAL_READ_EXPIRES, password:randomBytes(32).toString('hex') }
      // Check and persist encryption BEFORE changing the server password; no plaintext fallback.
      phase = 'protect-local-credential'
      protectReviewCredential(folder, credential)
      phase = 'reset-scoped-password'
      await owner.$transaction(async tx => {
        const finalCheck = await inspectReviewRole(tx)
        if (finalCheck.sessions !== 0) throw new Error('Consumer appeared; recovery stopped')
        await tx.$executeRawUnsafe(localReadPasswordResetSql(credential.password))
      }, { timeout:20_000 })
      console.log(JSON.stringify({ recoveredRole:LOCAL_READ_ROLE, expiresAt:LOCAL_READ_EXPIRES, grantsChanged:false, durationExtended:false, encryptedCredentialSaved:true, plaintextSaved:false }))
    } finally { await owner.$disconnect() }
  } else credential = readReviewCredential(folder)
  const limited = new URL(`postgresql://${LOCAL_READ_ROLE}@${LOCAL_READ_HOST}/neondb?sslmode=require&connect_timeout=10&connection_limit=2`)
  limited.password = credential.password
  const runtime = new PrismaClient({ datasourceUrl:limited.toString(),log:[] })
  try {
    phase='verify-limited-runtime'
    await runtime.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const identity = await tx.$queryRaw<{name:string;readonly:string}[]>`SELECT current_user AS name,current_setting('default_transaction_read_only') AS readonly`
      if (identity[0].name !== LOCAL_READ_ROLE || identity[0].readonly !== 'on') throw new Error('Limited identity required')
      await inspectReviewRole(tx)
    }, {timeout:20_000})
    const environment = { NODE_ENV:'development',VERCEL_ENV:'preview', FCM_PREVIEW_EXISTING_USERS_ONLY:'true', STAGING_DATABASE_URL:limited.toString(), DATABASE_URL:'', RELEASE_SHA:LOCAL_REVIEW_SHA,
      SUPABASE_URL:authUrl,SUPABASE_PUBLISHABLE_KEY:authKey,SUPABASE_EXPECTED_PROJECT_REF:'alqjqzqagdmcywpjtnnr', SUPABASE_JWT_AUDIENCE:'authenticated',PORT:'3002',LOG_LEVEL:'fatal',
      OPENAI_API_KEY:'',RATEWARE_API_URL:'',CRON_SECRET:'',EIA_API_KEY:'',FCM_TIRE_V2_RESEARCH_CAPTURE_ENABLED:'false',FCM_STAGING_MIGRATION_CONFIRMATION:'DISABLED',
      GOOGLE_ROUTES_API_KEY:routeKey ?? '',FCM_GOOGLE_ROUTE_REVIEW_ENABLED:google?'true':'false' }
    Object.assign(process.env,environment); assertLocalReadEnvironment(process.env,google)
    ;(globalThis as unknown as {prisma:PrismaClient}).prisma=runtime
    const budget=google?fileGoogleReviewBudget(folder):undefined
    const {buildApp}=await import('../src/app.js')
    const app=buildApp({localReadOnlyReview:true,localGoogleReviewBudget:budget})
    await app.listen({host:'127.0.0.1',port:3002})
    let child: ReturnType<typeof spawn> | undefined
    if (web) {
      // No owner/limited DB password, Routes key or management credential reaches Next.
      const childEnv: NodeJS.ProcessEnv = {}
      for (const name of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','APPDATA','LOCALAPPDATA','USERPROFILE','TEMP','TMP']) if(process.env[name]) childEnv[name]=process.env[name]
      Object.assign(childEnv,{NODE_ENV:'development',API_URL:'http://127.0.0.1:3002',NEXT_PUBLIC_SITE_URL:'http://localhost:3000',NEXT_PUBLIC_SUPABASE_URL:authUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:authKey,
        NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY:browserKey ?? '',OPENAI_API_KEY:'',GOOGLE_ROUTES_API_KEY:'',DATABASE_URL:'',NEXT_TELEMETRY_DISABLED:'1'})
      child=spawn(process.execPath,[resolve(root,'apps/web/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3000'],{cwd:resolve(root,'apps/web'),env:childEnv,windowsHide:true,stdio:'ignore'})
      child.once('error',()=>{console.error('Local web process unavailable; API remains scoped.');process.exitCode=1})
    }
    console.log(JSON.stringify({mode:google?'LOCAL_SELECT_PLUS_SCOPED_GOOGLE':'LOCAL_SELECT_ONLY',api:'http://127.0.0.1:3002',web:web?'http://localhost:3000':null,webPid:child?.pid,
      release:LOCAL_REVIEW_SHA,expiresAt:LOCAL_READ_EXPIRES,scope:google?'LAREDO_FORT_SMITH_NO_INTERMEDIATES':null,remainingMapLoads:budget?.remaining('map'),remainingRouteAttempts:budget?.remaining('routes'),businessWrites:false,provisioning:false,authChanged:false,deploy:false}))
    const close=async()=>{child?.kill();await app.close();await runtime.$disconnect();process.exit(0)}
    process.once('SIGINT',close);process.once('SIGTERM',close)
    // Do not leave pooled sessions alive after the original access window expires.
    setTimeout(()=>{void close()},Math.max(1,Date.parse(LOCAL_READ_EXPIRES)-Date.now())).unref()
  } catch(error) {await runtime.$disconnect();throw error}
}
main().catch(()=>{console.error(JSON.stringify({stopped:true,phase,role:LOCAL_READ_ROLE,message:'Scoped recovery stopped. No automatic rotation, expiry extension or budget reset. Inspect state before retry.'}));process.exitCode=1})

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync, openSync, closeSync } from 'node:fs'
import { resolve } from 'node:path'
import { LOCAL_READ_EXPIRES, LOCAL_READ_HOST, LOCAL_READ_ROLE } from '../../src/config/local-read-review.js'
import type { GoogleReviewBudget } from '../../src/modules/routing/google-route-review.routes.js'

export const LOCAL_REVIEW_SHA = '4f5fc2de0c3d178dace917231e1092040dec21fd'
const windowsPowerShell = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
// Do not inherit PowerShell 7's incompatible module path into Windows PowerShell 5.
const windowsEnvironment = () => ({...process.env,PSModulePath:'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'})
const entropy = `${LOCAL_READ_ROLE}:${LOCAL_READ_HOST}:${LOCAL_READ_EXPIRES}:v1`
export type ReviewCredential = { version: 1; role: typeof LOCAL_READ_ROLE; host: typeof LOCAL_READ_HOST; expiresAt: typeof LOCAL_READ_EXPIRES; password: string }

export function validateReviewCredential(raw: unknown, now = Date.now()): ReviewCredential {
  const v = raw as ReviewCredential
  if (!v || Object.keys(v).sort().join(',') !== 'expiresAt,host,password,role,version' || v.version !== 1 ||
      v.role !== LOCAL_READ_ROLE || v.host !== LOCAL_READ_HOST || v.expiresAt !== LOCAL_READ_EXPIRES ||
      !/^[a-f0-9]{64}$/.test(v.password) || Date.parse(v.expiresAt) <= now) throw new Error('Scoped credential invalid or expired')
  return v
}

function dpapi(mode: 'Protect' | 'Unprotect', input: Buffer): Buffer {
  if (process.platform !== 'win32') throw new Error('Windows CurrentUser protection required')
  try {
    // stdin/stdout captured in memory only: no password in argv, shell history or logging.
    const code = `$ErrorActionPreference='Stop'; try { Add-Type -AssemblyName System.Security; $data=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $entropy=[Text.Encoding]::UTF8.GetBytes('${entropy}'); $result=[Security.Cryptography.ProtectedData]::${mode}($data,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($result)) } catch { exit 2 }`
    const output = execFileSync(windowsPowerShell, ['-NoProfile', '-NonInteractive', '-Command', code], {
      input: input.toString('base64'), encoding: 'utf8', windowsHide: true, timeout: 15_000, env:windowsEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    if (!output || !/^[A-Za-z0-9+/=]+$/.test(output)) throw new Error('Protection output invalid')
    return Buffer.from(output, 'base64')
  } catch { throw new Error('Windows credential protection unavailable') }
}

export function preparePrivateReviewDirectory(root: string) {
  const physical = realpathSync(root)
  if (!/^[dD]:[\\/]/.test(physical)) throw new Error('Physical D workspace required')
  const folder = resolve(physical, '.fcm-local-review')
  if (existsSync(folder)) {
    if (realpathSync(folder).toLowerCase() !== folder.toLowerCase()) throw new Error('Private directory redirected')
  } else mkdirSync(folder)
  let protectionStage = 'git-ignore'
  try {
    execFileSync('git', ['check-ignore', '--quiet', '.fcm-local-review/credential.dpapi'], { cwd: physical, windowsHide: true, stdio: 'pipe' })
    protectionStage = 'current-user'
    const sid = execFileSync(windowsPowerShell, ['-NoProfile','-NonInteractive','-Command','[Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], {encoding:'utf8',windowsHide:true,timeout:15_000,stdio:'pipe',env:windowsEnvironment()}).trim()
    if (!/^S-1-5-\d+(?:-\d+)+$/.test(sid)) throw new Error('Current user SID unavailable')
    // DACL only; Set-Acl on Windows PowerShell can demand SACL privilege unnecessarily.
    protectionStage = 'dacl'
    execFileSync('C:/Windows/System32/icacls.exe',[folder,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true,timeout:15_000,stdio:'pipe'})
    const path = folder.replace(/'/g,"''")
    const check = `$ErrorActionPreference='Stop'; try { $acl=Get-Acl -LiteralPath '${path}'; if(-not $acl.AreAccessRulesProtected) { exit 2 }; foreach($entry in $acl.Access) { $who=$entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value; if($entry.IsInherited -or $who -notin @('${sid}','S-1-5-18') -or $entry.AccessControlType -ne 'Allow') { exit 2 } } } catch { exit 2 }`
    protectionStage = 'readback'
    execFileSync(windowsPowerShell,['-NoProfile','-NonInteractive','-Command',check],{windowsHide:true,timeout:15_000,stdio:'pipe',env:windowsEnvironment()})
  } catch { throw new Error(`Private ignored directory protection failed: ${protectionStage}`) }
  return folder
}

export function protectReviewCredential(folder: string, credential: ReviewCredential) {
  validateReviewCredential(credential)
  const path = resolve(folder, 'credential.dpapi')
  if (existsSync(path)) throw new Error('Credential already saved; no automatic rotation')
  const bytes = dpapi('Protect', Buffer.from(JSON.stringify(credential), 'utf8'))
  const roundtrip = validateReviewCredential(JSON.parse(dpapi('Unprotect', bytes).toString('utf8')))
  if (roundtrip.password !== credential.password) throw new Error('Credential protection mismatch')
  writeFileSync(path, bytes, { flag: 'wx' })
}

export function readReviewCredential(folder: string) {
  const path = resolve(folder, 'credential.dpapi')
  if (realpathSync(path).toLowerCase() !== path.toLowerCase()) throw new Error('Credential redirected')
  return validateReviewCredential(JSON.parse(dpapi('Unprotect', readFileSync(path)).toString('utf8')))
}

export function fileGoogleReviewBudget(folder: string): GoogleReviewBudget {
  const path = (kind: 'map' | 'routes') => {
    if (!['map', 'routes'].includes(kind)) throw new Error('Unknown budget kind')
    return resolve(folder, `${kind}.attempt`)
  }
  return {
    remaining: kind => Date.now() >= Date.parse(LOCAL_READ_EXPIRES) || existsSync(path(kind)) ? 0 : 1,
    reserve(kind) {
      if (Date.now() >= Date.parse(LOCAL_READ_EXPIRES)) return false
      try {
        const fd = openSync(path(kind), 'wx')
        try { writeFileSync(fd, JSON.stringify({ version: 1, release: LOCAL_REVIEW_SHA, expiresAt: LOCAL_READ_EXPIRES, reservedAt: new Date().toISOString(), kind })) }
        finally { closeSync(fd) }
        return true
      } catch { return false } // Existing or unwritable/corrupt markers never replenish budget.
    },
  }
}

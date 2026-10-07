// Human continuation of the proposed 90-minute W2 end-to-end closeout.
// Historical reservations remain consumed. Only the existing closed QA role is reused.
export const W2_CLOSEOUT_START='2026-10-05T08:05:06.000Z'
export const W2_CLOSEOUT_DEADLINE='2026-10-05T09:35:06.000Z'
export const W2_CLOSEOUT_MARKER=`FCM_W2_CLOSEOUT:${W2_CLOSEOUT_DEADLINE}`
export const W2_CLOSEOUT_READBACK_MARKER=`FCM_W2_CLOSEOUT_READBACK:${W2_CLOSEOUT_DEADLINE}`
export const W2_CLOSEOUT_PREVIOUS_MARKER='FCM_W2_EXISTING_DIAGNOSTIC:2026-10-05T06:54:50.000Z'
export const W2_CLOSEOUT_AUTHORITY=`human-continua:${W2_CLOSEOUT_START}:existing-qa-save-reload-replay:${W2_CLOSEOUT_DEADLINE}`
export const W2_CLOSEOUT_IDS=Object.freeze({baseId:'cmuuuwhbx0002sips941fqodr',versionId:'cmuuuwhc20004sipsywu5stvk',params:210})
export function assertW2CloseoutOpen(now=Date.now()){
  if(!Number.isFinite(now)||now<Date.parse(W2_CLOSEOUT_START)||now>=Date.parse(W2_CLOSEOUT_DEADLINE))throw new Error('W2 gate outside authorized window')
}
export function assertW2CloseoutRole(role:{marker:string;login:boolean;sessions:number}|undefined,saved=false){
  if(!role||role.marker!==(saved?W2_CLOSEOUT_MARKER:W2_CLOSEOUT_PREVIOUS_MARKER)||role.login||role.sessions!==0)throw new Error('Existing closeout role ownership/state differs')
}

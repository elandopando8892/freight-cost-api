import type { FcmAccessScope } from '../../src/modules/auth/fcm-access-scope.js'
import type { CutoverAuthMatch, CutoverUserInventory } from './production-cutover-plan.js'
import { buildScopedAccessPlan } from './scoped-access-plan.js'
import { createHash } from 'node:crypto'
export type ViewerMembershipInput = {
  scope: FcmAccessScope; users: CutoverUserInventory[]; authMatches: CutoverAuthMatch[];
  memberId: string; authorityReference: string; promotedPairReference: string;
}
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const q = (s: string) => "'" + s.replace(/'/g, "''") + "'"
const pgHash = (s: string) => `encode(sha256(convert_to(${s},'UTF8')),'hex')`
function guard(condition: string, code: string) {
  const body = `BEGIN IF ${condition} THEN RAISE EXCEPTION ${q(code)}; END IF; END`
  let delimiter = '$guard$'
  for (let i = 0; body.includes(delimiter); i++) delimiter = `$guard_${i}$`
  return `DO ${delimiter}${body}${delimiter};`
}
/** Preparation only. References and hashes are cooperative evidence, not consent
 * or proof that a deployment was promoted. A supervisor must verify those facts
 * before sending any returned SQL to a database. Never a public HTTP endpoint. */
export function buildViewerMembershipBundle(input: ViewerMembershipInput) {
  const plan = buildScopedAccessPlan(input)
  if (!plan.reviewReady || !/^[A-Za-z0-9_-]{1,96}$/.test(input.memberId) || input.users.some(u => u.id === input.memberId))
    throw new Error('MEMBERSHIP_PLAN_INVALID')
  for (const ref of [input.authorityReference, input.promotedPairReference])
    if (!/^[A-Za-z0-9:/_. @-]{1,512}$/.test(ref)) throw new Error('MEMBERSHIP_EVIDENCE_REFERENCE_REQUIRED')
  const ownerHash = sha('sales@heymarksman.com'), memberHash = sha('jgonzalez@xbfreight.com')
  const owner = plan.proposedExistingMappings.find(u => u.emailHash === ownerHash)
  const needed = plan.membershipRequired.find(u => u.emailHash === memberHash)
  if (!owner || !needed || plan.membershipRequired.length !== 1) throw new Error('MEMBERSHIP_OWNER_OR_MISSING_MEMBER_INVALID')
  const member = { id: input.memberId, orgId: owner.orgId, email: 'jgonzalez@xbfreight.com', supabaseId: needed.supabaseId, role: 'VIEWER' as const }
  const fingerprint = sha(JSON.stringify({ inventory: plan.inventoryFingerprint, member, authority: input.authorityReference, promotion: input.promotedPairReference }))
  const b = '"fcm_viewer_membership_backup"'
  const header = `BEGIN; SET LOCAL standard_conforming_strings=on; SET LOCAL search_path=pg_catalog,public;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'; SELECT pg_advisory_xact_lock(72707370);
LOCK TABLE public."User" IN EXCLUSIVE MODE;`
  const expected = input.users.map(u => `(${q(u.id)},${q(u.identityFingerprint)},${q(u.emailHash)},${q(u.orgId)},${q(u.role)})`).join(',')
  const originalGuard = guard(`(SELECT count(*) FROM public."User")<>${input.users.length}
OR EXISTS(WITH expected(id,hash,email_hash,org_id,role) AS (VALUES ${expected}) SELECT 1 FROM expected e LEFT JOIN public."User" u ON u.id=e.id WHERE u.id IS NULL OR ${pgHash('to_jsonb(u)::text')}<>e.hash
OR ${pgHash('lower(btrim(u.email))')} IS DISTINCT FROM e.email_hash OR u."orgId" IS DISTINCT FROM e.org_id OR u.role::text IS DISTINCT FROM e.role)`, 'MEMBERSHIP_INVENTORY_CHANGED')
  const backupGuard = `${guard(`to_regclass('fcm_viewer_membership_backup.manifest') IS NULL`, 'MEMBERSHIP_BACKUP_REQUIRED')}
LOCK TABLE ${b}.manifest,${b}.users IN EXCLUSIVE MODE;
${guard(`(SELECT count(*) FROM ${b}.manifest)<>1 OR NOT EXISTS(SELECT 1 FROM ${b}.manifest WHERE fingerprint=${q(fingerprint)} AND restore_verified)
OR (SELECT count(*) FROM ${b}.users)<>${input.users.length}
OR EXISTS(SELECT 1 FROM ${b}.users WHERE hash<>${pgHash('row_data::text')})`, 'MEMBERSHIP_BACKUP_CHANGED')}`
  const postGuard = guard(`(SELECT count(*) FROM public."User")<>${input.users.length + 1}
OR EXISTS(SELECT 1 FROM ${b}.users b LEFT JOIN public."User" u ON u.id=b.id WHERE u.id IS NULL OR
CASE WHEN b.id=${q(owner.id)} THEN (to_jsonb(u)-'supabaseId') IS DISTINCT FROM (b.row_data-'supabaseId') ELSE to_jsonb(u) IS DISTINCT FROM b.row_data END)
OR NOT EXISTS(SELECT 1 FROM public."User" WHERE id=${q(owner.id)} AND "supabaseId"=${q(owner.supabaseId)})
OR NOT EXISTS(SELECT 1 FROM public."User" u,${b}.manifest m,public."User" owner WHERE owner.id=${q(owner.id)} AND u.id=${q(member.id)} AND u."orgId"=owner."orgId" AND ${pgHash('to_jsonb(u)::text')}=m.member_hash)`, 'MEMBERSHIP_POSTCONDITION_CHANGED')
  const backupSql = `${header}\n${originalGuard}
CREATE SCHEMA ${b}; REVOKE ALL ON SCHEMA ${b} FROM PUBLIC;
CREATE TABLE ${b}.users AS SELECT id,to_jsonb(u) AS row_data,${pgHash('to_jsonb(u)::text')} AS hash FROM public."User" u;
CREATE TABLE ${b}.manifest (fingerprint text PRIMARY KEY,authority_reference text NOT NULL,promotion_reference text NOT NULL,restore_verified boolean NOT NULL DEFAULT false,phase text NOT NULL DEFAULT 'BACKED_UP',member_hash text,kinde_was_required boolean NOT NULL);
CREATE TABLE ${b}.probe (LIKE public."User" INCLUDING ALL);
REVOKE ALL ON ALL TABLES IN SCHEMA ${b} FROM PUBLIC;
INSERT INTO ${b}.manifest(fingerprint,authority_reference,promotion_reference,kinde_was_required) VALUES(${q(fingerprint)},${q(input.authorityReference)},${q(input.promotedPairReference)},EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='kindeId' AND is_nullable='NO'));
INSERT INTO ${b}.probe SELECT (jsonb_populate_record(NULL::${b}.probe,row_data)).* FROM ${b}.users;
${guard(`EXISTS(SELECT 1 FROM ${b}.users b FULL JOIN ${b}.probe p ON p.id=b.id WHERE p.id IS NULL OR b.id IS NULL OR to_jsonb(p) IS DISTINCT FROM b.row_data)`, 'MEMBERSHIP_RESTORE_FAILED')}
UPDATE ${b}.manifest SET restore_verified=true; COMMIT;`
  const applySql = `${header}\n${backupGuard}
${guard(`NOT EXISTS(SELECT 1 FROM ${b}.manifest WHERE phase='BACKED_UP')`, 'MEMBERSHIP_ALREADY_APPLIED')}
${originalGuard}
${guard(`EXISTS(SELECT 1 FROM public."User" WHERE id=${q(member.id)} OR lower(btrim(email))=${q(member.email)} OR "supabaseId"=${q(member.supabaseId)})
OR EXISTS(SELECT 1 FROM public."User" WHERE id=${q(owner.id)} AND "supabaseId" IS NOT NULL AND "supabaseId"<>${q(owner.supabaseId)})`, 'MEMBERSHIP_IDENTITY_CONFLICT')}
DO $legacy$ BEGIN IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='kindeId') THEN ALTER TABLE public."User" ALTER COLUMN "kindeId" DROP NOT NULL; END IF; END $legacy$;
UPDATE public."User" SET "supabaseId"=${q(owner.supabaseId)} WHERE id=${q(owner.id)};
INSERT INTO public."User"(id,"orgId",email,role,"supabaseId","createdAt","updatedAt") SELECT ${q(member.id)},"orgId",${q(member.email)},'VIEWER',${q(member.supabaseId)},clock_timestamp(),clock_timestamp() FROM public."User" WHERE id=${q(owner.id)};
UPDATE ${b}.manifest SET phase='APPLIED',member_hash=(SELECT ${pgHash('to_jsonb(u)::text')} FROM public."User" u WHERE id=${q(member.id)});
${postGuard} COMMIT;`
  const rollbackSql = `${header}\n${backupGuard}
${guard(`NOT EXISTS(SELECT 1 FROM ${b}.manifest WHERE phase='APPLIED')`, 'MEMBERSHIP_NOT_APPLIED')}
${postGuard}
DO $references$ DECLARE r record; predicate text; linked boolean; BEGIN
FOR r IN SELECT c.oid,c.conrelid,c.conkey,c.confkey,n.nspname,t.relname FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.contype='f' AND c.confrelid='public."User"'::regclass LOOP
SELECT string_agg(format('c.%I = u.%I',a.attname,p.attname),' AND ' ORDER BY k.ordinality) INTO predicate FROM unnest(r.conkey,r.confkey) WITH ORDINALITY k(child,parent,ordinality) JOIN pg_attribute a ON a.attrelid=r.conrelid AND a.attnum=k.child JOIN pg_attribute p ON p.attrelid='public."User"'::regclass AND p.attnum=k.parent;
EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I c JOIN public."User" u ON %s WHERE u.id=$1)',r.nspname,r.relname,predicate) INTO linked USING ${q(member.id)};
IF linked THEN RAISE EXCEPTION 'MEMBERSHIP_ROLLBACK_REFERENCES_EXIST'; END IF; END LOOP; END $references$;
DELETE FROM public."User" WHERE id=${q(member.id)};
UPDATE public."User" u SET "supabaseId"=b.row_data->>'supabaseId' FROM ${b}.users b WHERE u.id=${q(owner.id)} AND b.id=u.id;
DO $restorelegacy$ BEGIN IF EXISTS(SELECT 1 FROM ${b}.manifest WHERE kinde_was_required) THEN ALTER TABLE public."User" ALTER COLUMN "kindeId" SET NOT NULL; END IF; END $restorelegacy$;
${originalGuard} UPDATE ${b}.manifest SET phase='ROLLED_BACK'; COMMIT;`
  return { fingerprint, member, backupSql, applySql, rollbackSql, writesAuthorized: false as const, applyOnlyAfterPromotion: true as const }
}

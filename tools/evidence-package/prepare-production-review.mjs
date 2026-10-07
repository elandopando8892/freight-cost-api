import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// Mechanical control records for this explicit one-call review. No inference,
// live registry modification, customer data or authority generation.
const root = process.cwd();
const kit = 'D:/andre/apps/codex-home/integrations/claude-review';
const out = 'D:/andre/validation/fcm-production-cutover-20261007';
const registry = JSON.parse(readFileSync(kit + '/data/mcp-allowlist.json', 'utf8'));
const sprint = 'production-cutover-20261007', task = 'prod-review';
const project = registry.projects.find(p => p.project_root.replaceAll('\\', '/').toLowerCase() === root.replaceAll('\\', '/').toLowerCase());
if (!project || project.project_id !== 'freight-cost-model') throw Error('CANONICAL_PROJECT_NOT_REGISTERED');
if (registry.assignments.some(a => a.root_id === project.root_id && a.sprint_id === sprint)) throw Error('REVIEW_ALREADY_REGISTERED');
const candidate = structuredClone(registry);
candidate.projects.find(p => p.root_id === project.root_id).admissions_enabled = true;
candidate.assignments.push({ root_id: project.root_id, project_id: project.project_id, sprint_id: sprint,
  task_id: task, admissions_enabled: true, classification: 'sanitized', context_profile: 'legacy-small-v1',
  max_runs: 1, max_output_bytes: 2097152,
  instructions: 'Revisión sólo lectura, una llamada claude-opus-5-5/high de máximo15min. Sin herramientas, MCP, skills, plugins, escritura, red, tests, modelos adicionales, retries, resume o fallback. Sólo contexto sanitizado sellado: código y fixtures, no usuarios reales, credenciales ni historiales. Revisa respaldo/restore, ledger/checksums, reconciliación1:1, transición compatible y retiro tardío de kindeId. Hasta6hallazgos con evidencia, impacto, corrección mínima y prueba discriminante. Distingue riesgos demostrados de límites del contexto; no inventes verificaciones. Respuesta española <=12000caracteres.',
  acceptance: 'Revisión acotada del corte productivo, seis hallazgos máximo y veredicto con límites. No acepta datos económicos ni autoriza SQL o publicación.' });
candidate.revision = registry.revision + 1;
const authority = resolve(root, 'docs/reviews/PRODUCTION_SPRINT_AUTHORITY_2026-10-07.md');
const human = { path: authority, sha256: createHash('sha256').update(readFileSync(authority)).digest('hex'), decided_at: '2026-10-07T20:00:04+00:00' };
const policy = JSON.parse(readFileSync(kit + '/data/model-policies/sprint-model-budget-v1/v3.json', 'utf8'));
const auth = { authorization_id: 'fcm-production-cutover-auth-20261007', human_reference: human,
  policy: { id: policy.id, version: policy.version, hash: policy.hash },
  root_id: project.root_id, project_id: project.project_id, sprint_id: sprint, project_root: root,
  scope: { tasks: [project.project_id + ':' + sprint + ':' + task], task_prefix: '' },
  roles: ['review'], classification: 'sanitized', destination: 'claude-cli', accept_unknown_effort: true,
  context_profiles: ['legacy-small-v1'],
  limits: { models: { 'claude-sonnet-5-5': 0, 'claude-opus-5-5': 1, 'claude-fable-5-1': 0 },
    aggregate: 1, per_problem: 1, validity_days: 1, prompt_bytes: 24000, output_bytes: 2097152 } };
mkdirSync(out, { recursive: true });
for (const [name, value] of [['registry-candidate.json', candidate], ['sprint-authorization.json', auth]])
  writeFileSync(out + '/' + name, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ out, rootId: project.root_id, task: auth.scope.tasks[0], inferenceStarted: false }));

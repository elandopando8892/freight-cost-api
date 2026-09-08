import { readFileSync } from 'node:fs';
import { checkPreviewRevisions } from '../src/modules/pilot/preview-revisions.js';

// Offline, redacted provider evidence. Never reads credentials or calls a deployment.
const argument = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
try {
  const path = argument('evidence');
  const sha = argument('sha');
  if (!path || !sha) throw new Error('arguments');
  const result = checkPreviewRevisions(JSON.parse(readFileSync(path, 'utf8')), sha);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'BLOCK') process.exitCode = 1;
} catch {
  console.error('BLOCK: indica --evidence=<JSON redactado de Vercel> y --sha=<40 caracteres>. Archivo ausente o JSON inválido.');
  process.exitCode = 1;
}

import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveArchive, sha256, transformation, verifyArchive } from './archive.mjs';
import { containedFile, putImmutable } from './files.mjs';

const folder = 'docs/research/sources-sanitized';
const manifestPath = folder + '/manifest.json';
const within = (parent, child) => {
  const path = relative(parent, child);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep));
};
function externalVault(root, vault) {
  if (!vault || !isAbsolute(vault) || !existsSync(vault) || !lstatSync(vault).isDirectory() || lstatSync(vault).isSymbolicLink()) throw new Error('UNSAFE_VAULT');
  const repo = realpathSync(root), target = realpathSync(vault);
  if (within(repo, target) || within(target, repo)) throw new Error('VAULT_MUST_BE_EXTERNAL');
  return target;
}

export function preparePackage({ root, vault, files, baseCommit = null }) {
  vault = externalVault(root, vault);
  if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length) throw new Error('INVALID_SOURCE_LIST');
  const payloads = files.map(originalPath => {
    if (!/^docs\/research\/sources\/[A-Za-z0-9_.-]+\.html$/.test(originalPath)) throw new Error('UNSAFE_PATH');
    const original = readFileSync(containedFile(root, originalPath));
    const { bytes, redactions } = deriveArchive(original);
    if (!redactions.length) throw new Error('SOURCE_NOT_FLAGGED');
    const row = { originalPath, originalSha256: sha256(original), originalBytes: original.length,
      derivedPath: folder + '/' + basename(originalPath), derivedSha256: sha256(bytes), derivedBytes: bytes.length, redactions };
    verifyArchive(row, bytes, original);
    return { row, original, bytes };
  });
  const manifest = { schemaVersion: 'fcm.sanitized-evidence.v1', transformation, baseCommit,
    intendedUse: 'REVIEW_DERIVATIVES_NOT_CANONICAL_ECONOMIC_SOURCES', readyForProduction: false,
    originalsIncludedInGit: false, records: payloads.map(p => p.row) };
  // Copies and mechanically generated derivatives; never rewrite authored/economic files.
  mkdirSync(containedFile(root, folder), { recursive: true });
  for (const { row, original, bytes } of payloads) {
    putImmutable(containedFile(vault, row.originalSha256 + '.html'), original);
    putImmutable(containedFile(root, row.derivedPath), bytes);
  }
  putImmutable(containedFile(root, manifestPath), Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  return manifest;
}

export function verifyPackage({ root, vault }) {
  if (vault !== undefined) vault = externalVault(root, vault);
  const manifest = JSON.parse(readFileSync(containedFile(root, manifestPath), 'utf8'));
  if (manifest.schemaVersion !== 'fcm.sanitized-evidence.v1' || manifest.transformation !== transformation || !Array.isArray(manifest.records) || !manifest.records.length) throw new Error('INVALID_MANIFEST');
  const paths = new Set();
  for (const row of manifest.records) {
    if (!/^docs\/research\/sources-sanitized\/[A-Za-z0-9_.-]+\.html$/.test(row.derivedPath) || !/^[a-f0-9]{64}$/.test(row.originalSha256) || paths.has(row.derivedPath)) throw new Error('INVALID_MANIFEST');
    paths.add(row.derivedPath);
    const derived = readFileSync(containedFile(root, row.derivedPath));
    const original = vault === undefined ? undefined : readFileSync(containedFile(vault, row.originalSha256 + '.html'));
    verifyArchive(row, derived, original);
  }
  return { derivativesVerified: manifest.records.length, originalsVerified: vault === undefined ? 0 : manifest.records.length,
    redactedOccurrences: manifest.records.reduce((sum, row) => sum + row.redactions.length, 0),
    readyForProduction: false,
    manifestSha256: sha256(readFileSync(containedFile(root, manifestPath))) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, ...options] = process.argv.slice(2);
    if (!['prepare', 'verify'].includes(mode) || options.length % 2 || options.filter((_, i) => i % 2 === 0).some(v => v !== '--vault') || options.length > 2) throw new Error('INVALID_ARGUMENTS');
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const vault = options[1];
    if (mode === 'prepare') {
      const candidate = JSON.parse(readFileSync(containedFile(root, 'docs/reviews/B4_RUNTIME_CANDIDATE_REVIEW_2026-10-06.json'), 'utf8'));
      preparePackage({ root, vault, files: candidate.globalSecretScan.potentialGoogleKeyArchives, baseCommit: candidate.baseCommit });
    }
    console.log(JSON.stringify(verifyPackage({ root, vault }), null, 2));
  } catch (error) {
    // Do not print filesystem content, keys, or provider responses on failures.
    console.error('Evidence package failed:', /^[A-Z_]+$/.test(error.message) ? error.message : error.code ?? 'VALIDATION_ERROR');
    process.exitCode = 1;
  }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const api = await import('./package.mjs').catch(() => null);
function setup(t) {
  const temp = mkdtempSync(join(tmpdir(), 'fcm-evidence-bundle-'));
  t.after(() => {
    assert.equal(resolve(temp).startsWith(resolve(tmpdir()) + '\\fcm-evidence-bundle-') || resolve(temp).startsWith(resolve(tmpdir()) + '/fcm-evidence-bundle-'), true);
    rmSync(temp, { recursive: true });
  });
  const root = join(temp, 'repo'), vault = join(temp, 'vault');
  mkdirSync(join(root, 'docs/research/sources'), { recursive: true });
  mkdirSync(vault);
  const file = 'docs/research/sources/fixture.html';
  const raw = Buffer.from('<p>MXN 250</p>' + 'AI' + 'za' + 'a'.repeat(35));
  writeFileSync(join(root, file), raw);
  return { root, vault, files: [file], raw, file };
}

test('prepares real files without changing original, replays and verifies external lineage', t => {
  assert.ok(api, 'package capability must exist');
  const setupData = setup(t);
  const first = api.preparePackage(setupData);
  const second = api.preparePackage(setupData);
  assert.deepEqual(second, first);
  assert.deepEqual(readFileSync(join(setupData.root, setupData.file)), setupData.raw);
  assert.equal(api.verifyPackage(setupData).originalsVerified, 1);
  assert.equal(api.verifyPackage({ root: setupData.root }).originalsVerified, 0);
  assert.equal(api.verifyPackage({ root: setupData.root }).derivativesVerified, 1);
});

test('rejects vault within repository and preserves originals when generated output conflicts', t => {
  assert.ok(api, 'package capability must exist');
  const config = setup(t);
  assert.throws(() => api.preparePackage({ ...config, vault: config.root }), /VAULT_MUST_BE_EXTERNAL/);
  api.preparePackage(config);
  writeFileSync(join(config.root, 'docs/research/sources-sanitized/fixture.html'), 'tampered');
  assert.throws(() => api.preparePackage(config), /OUTPUT_CONFLICT/);
  assert.deepEqual(readFileSync(join(config.root, config.file)), config.raw);
});

test('fails closed for corrupt external original; never reports original verification', t => {
  assert.ok(api, 'package capability must exist');
  const config = setup(t), manifest = api.preparePackage(config);
  writeFileSync(join(config.vault, manifest.records[0].originalSha256 + '.html'), 'wrong');
  assert.throws(() => api.verifyPackage(config), /ORIGINAL_HASH/);
});

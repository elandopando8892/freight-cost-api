import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const api = await import('./files.mjs').catch(() => null);
function sandbox(t) {
  const root = mkdtempSync(join(tmpdir(), 'fcm-evidence-test-'));
  t.after(() => {
    assert.equal(resolve(root).startsWith(resolve(tmpdir()) + '\\fcm-evidence-test-') || resolve(root).startsWith(resolve(tmpdir()) + '/fcm-evidence-test-'), true);
    rmSync(root, { recursive: true });
  });
  return root;
}

test('immutable generated output replays exact bytes but rejects overwrite', t => {
  assert.ok(api, 'immutable output capability must exist');
  const root = sandbox(t), path = join(root, 'copy.html');
  api.putImmutable(path, Buffer.from('250\r\n'));
  api.putImmutable(path, Buffer.from('250\r\n'));
  assert.throws(() => api.putImmutable(path, Buffer.from('251\r\n')), /OUTPUT_CONFLICT/);
  assert.equal(readFileSync(path, 'utf8'), '250\r\n');
});

test('rejects path traversal and absolute paths before resolving files', t => {
  assert.ok(api, 'safe path capability must exist');
  const root = sandbox(t);
  assert.throws(() => api.containedFile(root, '../other.html'), /UNSAFE_PATH/);
  assert.throws(() => api.containedFile(root, join(root, 'other.html')), /UNSAFE_PATH/);
});

test('rejects symlink/junction ancestors before reading output', t => {
  assert.ok(api, 'safe path capability must exist');
  const root = sandbox(t), target = join(root, 'target'), link = join(root, 'link');
  mkdirSync(target);
  writeFileSync(join(target, 'copy.html'), '250');
  symlinkSync(target, link, 'junction');
  assert.throws(() => api.containedFile(root, 'link/copy.html'), /SYMLINK_PATH/);
});

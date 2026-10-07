import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Read-only comparison of committed bytes with both Windows and LF checkout
// filters. Uses current attributes so an uncommitted correction is reviewable.
const cwd = fileURLToPath(new URL('../../', import.meta.url));
const git = (args, input) => execFileSync('git', args, {
  cwd, input, maxBuffer: 256 * 1024 * 1024, windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});
try {
  const files = git(['ls-tree', '-r', '--name-only', '-z', 'HEAD']).toString('utf8').split('\0').filter(file =>
    file && (file.startsWith('docs/') || file.endsWith('.md') || file.endsWith('.snapshot.json') || file.endsWith('/b2-family-source.pack.json')));
  if (!files.length || files.some(file => /[\r\n]/.test(file))) throw new Error('INVALID_SOURCE_INVENTORY');
  const input = files.map(file => `HEAD:${file} ${file}\n`).join('');
  const batch = '--batch=%(objectname) %(objecttype) %(objectsize) %(rest)';
  const original = git(['cat-file', batch], input);
  for (const autocrlf of ['true', 'false']) {
    const checkout = git(['-c', `core.autocrlf=${autocrlf}`, 'cat-file', batch, '--filters'], input);
    if (!original.equals(checkout)) throw new Error(`CHECKOUT_BYTE_DRIFT_${autocrlf.toUpperCase()}`);
  }
  console.log(JSON.stringify({ filesVerified: files.length, checkoutFilters: ['autocrlf=true', 'autocrlf=false'],
    matchesCommittedBytes: true, scope: 'committed evidence namespaces; current working attributes', remoteSystemsChecked: false }));
} catch (error) {
  console.error(/^[A-Z_]+$/.test(error.message) ? error.message : 'CHECKOUT_VERIFICATION_FAILED');
  process.exitCode = 1;
}

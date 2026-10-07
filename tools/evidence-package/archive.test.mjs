import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Synthetic key assembled at runtime: no credential in fixtures or logs.
const key = 'AI' + 'za' + 'x'.repeat(35);
const raw = Buffer.from('<p>Tarifa MXN 250\r\n</p><script>' + key + '</script>');
const hash = value => createHash('sha256').update(value).digest('hex');
const api = await import('./archive.mjs').catch(() => null);

test('replaces only credential bytes and retains economic text and CRLF', () => {
  assert.ok(api, 'derivation capability must exist');
  const result = api.deriveArchive(raw);
  assert.equal(result.bytes.toString(), '<p>Tarifa MXN 250\r\n</p><script>[REDACTED_GOOGLE_API_KEY]</script>');
  assert.deepEqual(result.redactions, [{ offset: 31, length: 39 }]);
  assert.equal(raw.includes(Buffer.from(key)), true);
});

test('preserves non-UTF8 bytes outside redactions', () => {
  assert.ok(api, 'derivation capability must exist');
  const input = Buffer.concat([Buffer.from([255, 254]), Buffer.from(key), Buffer.from([128])]);
  assert.deepEqual(api.deriveArchive(input).bytes, Buffer.concat([Buffer.from([255, 254]), Buffer.from('[REDACTED_GOOGLE_API_KEY]'), Buffer.from([128])]));
});

test('rejects binary NUL instead of letting the scanner skip the derivative', () => {
  assert.ok(api, 'derivation capability must exist');
  assert.throws(() => api.deriveArchive(Buffer.from([0, 1])), /BINARY_ARCHIVE/);
});

function fixture() {
  const { bytes, redactions } = api.deriveArchive(raw);
  return { bytes, row: { originalSha256: hash(raw), originalBytes: raw.length,
    derivedSha256: hash(bytes), derivedBytes: bytes.length, redactions } };
}

test('verifies original lineage and reports derivative-only validation honestly', () => {
  assert.ok(api, 'derivation capability must exist');
  const { bytes, row } = fixture();
  assert.equal(api.verifyArchive(row, bytes, raw), 'ORIGINAL_AND_DERIVATION_VERIFIED');
  assert.equal(api.verifyArchive(row, bytes), 'DERIVATIVE_ONLY_VERIFIED');
});

test('rejects changed derivative even when a tariff remains plausible', () => {
  assert.ok(api, 'derivation capability must exist');
  const { bytes, row } = fixture();
  assert.throws(() => api.verifyArchive(row, Buffer.from(bytes.toString().replace('250', '251')), raw), /DERIVED_HASH/);
});

test('rejects corrupted original and altered redaction metadata', () => {
  assert.ok(api, 'derivation capability must exist');
  const { bytes, row } = fixture();
  assert.throws(() => api.verifyArchive(row, bytes, Buffer.concat([raw, Buffer.from('x')])), /ORIGINAL_HASH/);
  assert.throws(() => api.verifyArchive({ ...row, redactions: [] }, bytes, raw), /DERIVATION_MISMATCH/);
});

test('rejects rebased derivative hash for a modification outside redacted bytes', () => {
  assert.ok(api, 'derivation capability must exist');
  const { bytes, row } = fixture();
  const altered = Buffer.from(bytes.toString().replace('250', '251'));
  assert.throws(() => api.verifyArchive({ ...row, derivedSha256: hash(altered) }, altered, raw), /DERIVATION_MISMATCH/);
});

import { createHash } from 'node:crypto';

export const transformation = 'GOOGLE_KEY_ASCII_REDACTION_V1';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Latin-1 offsets map one-to-one to bytes; no UTF-8/EOL normalization. */
export function deriveArchive(original) {
  if (!Buffer.isBuffer(original) || original.includes(0)) throw new Error('BINARY_ARCHIVE');
  const pattern = /\bAIza[0-9A-Za-z_-]{35}\b/g;
  const redactions = [];
  const pieces = [];
  let cursor = 0;
  for (const match of original.toString('latin1').matchAll(pattern)) {
    const offset = match.index;
    pieces.push(original.subarray(cursor, offset), Buffer.from('[REDACTED_GOOGLE_API_KEY]'));
    redactions.push({ offset, length: match[0].length });
    cursor = offset + match[0].length;
  }
  pieces.push(original.subarray(cursor));
  return { bytes: Buffer.concat(pieces), redactions };
}

export function verifyArchive(row, derived, original) {
  if (sha256(derived) !== row.derivedSha256 || derived.length !== row.derivedBytes) throw new Error('DERIVED_HASH');
  const stillSensitive = deriveArchive(derived);
  if (stillSensitive.redactions.length) throw new Error('DERIVED_CREDENTIAL_PATTERN');
  if (original === undefined) return 'DERIVATIVE_ONLY_VERIFIED';
  if (sha256(original) !== row.originalSha256 || original.length !== row.originalBytes) throw new Error('ORIGINAL_HASH');
  const expected = deriveArchive(original);
  if (!expected.bytes.equals(derived) || JSON.stringify(expected.redactions) !== JSON.stringify(row.redactions)) throw new Error('DERIVATION_MISMATCH');
  return 'ORIGINAL_AND_DERIVATION_VERIFIED';
}

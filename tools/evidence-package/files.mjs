import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export function containedFile(root, name) {
  if (isAbsolute(name) || name.includes('\\') || name.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('UNSAFE_PATH');
  let current = resolve(root);
  if (lstatSync(current).isSymbolicLink()) throw new Error('SYMLINK_PATH');
  for (const part of name.split('/')) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('SYMLINK_PATH');
  }
  return current;
}

/** Generated/copy artifacts only. Never overwrite different bytes. */
export function putImmutable(path, bytes) {
  try { writeFileSync(path, bytes, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (lstatSync(path).isSymbolicLink() || !readFileSync(path).equals(bytes)) throw new Error('OUTPUT_CONFLICT');
  }
}

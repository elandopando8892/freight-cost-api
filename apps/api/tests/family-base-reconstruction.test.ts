import { expect, it } from 'vitest'
import { packageFamilySource } from '../scripts/package-family-base-source.js'
import packed from '../src/modules/cost-bases/b2-family-source.pack.json'

// Intentionally remains in the full suite. Missing originals must fail visibly;
// test:runtime-package is the separate, narrower checkout-only verification.
it('reconstructs the exact frozen package from independently pinned research originals', () => {
  expect(packageFamilySource()).toEqual(packed)
}, 30_000)

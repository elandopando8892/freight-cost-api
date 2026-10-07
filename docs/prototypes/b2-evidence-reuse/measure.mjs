import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const ownLines = async (name) => (await readFile(`${here}/${name}`, 'utf8')).split(/\r?\n/).filter((l) => l.trim()).length;
const metrics = {
  at: new Date().toISOString(),
  method: 'Nonblank source lines; variant entry plus variant hook/provider. Shared UI/data/CSS excluded from variant difference. Independent builds with --mode actual and --mode refine; JS bytes reachable from each generated HTML, unique paths, plus gzip per file. Not a Next production bundle or measured developer time savings.',
  code: {
    actual: await ownLines('actual.tsx') + await ownLines('actual-entry.tsx'),
    refine: await ownLines('refine.tsx') + await ownLines('refine-entry.tsx'),
    shared: Object.fromEntries(await Promise.all(['review.tsx', 'contracts.ts', 'style.css'].map(async (file) => [file, await ownLines(file)]))),
  },
  bundles: {},
};
async function reachable(name) {
  const html = await readFile(`${here}/dist/${name}/${name}.html`, 'utf8');
  const assets = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)"/g)].map((m) => m[1]));
  const queue = [...assets];
  let bytes = 0, gzipBytes = 0;
  while (queue.length) {
    const path = queue.pop();
    const body = await readFile(`${here}/dist/${name}${path}`);
    bytes += body.byteLength; gzipBytes += gzipSync(body).byteLength;
    for (const match of body.toString().matchAll(/(?:from\s*|import\s*)["']\.\/([^"']+\.js)["']/g)) {
      const next = `/assets/${match[1]}`;
      if (!assets.has(next)) { assets.add(next); queue.push(next); }
    }
  }
  return { bytes, gzipBytes, files: [...assets].sort() };
}
metrics.bundles.actual = await reachable('actual');
metrics.bundles.refine = await reachable('refine');
const mainLock = JSON.parse(await readFile(`${root}/package-lock.json`, 'utf8'));
const isolatedLock = JSON.parse(await readFile(`${here}/package-lock.json`, 'utf8'));
const existingNames = new Set(Object.keys(mainLock.packages).filter((p) => p.includes('node_modules/')).map((p) => p.split('node_modules/').at(-1)));
const baseline = new Set(['react', 'react-dom', 'scheduler', '@tanstack/react-query', '@tanstack/query-core', '@types/react', '@types/react-dom', 'csstype']);
const packages = Object.keys(isolatedLock.packages).filter((p) => p.includes('node_modules/') && !isolatedLock.packages[p].link).map((p) => ({
  name: p.split('node_modules/').at(-1), version: isolatedLock.packages[p].version,
}));
metrics.dependencies = {
  isolatedPackageCount: packages.length,
  refineNonBaselinePackages: packages.filter((p) => !baseline.has(p.name)),
  namesNotInMainLock: packages.filter((p) => !existingNames.has(p.name)),
};
await writeFile(`${root}/tmp/reuse-spike-evidence/metrics.json`, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));

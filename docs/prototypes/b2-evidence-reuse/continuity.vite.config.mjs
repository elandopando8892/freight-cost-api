import { createRequire } from 'node:module';
import base from './vite.config.mjs';
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
export default env => ({ ...base(env), css: { postcss: { plugins: [require('@tailwindcss/postcss')()] } } });

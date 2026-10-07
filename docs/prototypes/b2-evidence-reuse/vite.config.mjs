import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const web = fileURLToPath(new URL('../../../apps/web/', import.meta.url));
const modules = fileURLToPath(new URL('node_modules/', import.meta.url));
export default defineConfig(({ mode }) => {
  const variant = ['actual', 'refine'].includes(mode) ? mode : null;
  return {
  root: here,
  publicDir: `${web}/public`,
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      { find: '@', replacement: web },
      { find: /^react($|\/)/, replacement: `${modules}react$1` },
      { find: /^react-dom($|\/)/, replacement: `${modules}react-dom$1` },
      { find: '@tanstack/react-query', replacement: `${modules}@tanstack/react-query` },
    ],
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } },
  build: {
    outDir: variant ? `dist/${variant}` : 'dist',
    copyPublicDir: false,
    rollupOptions: { input: variant ? `${here}/${variant}.html` : { actual: `${here}/actual.html`, refine: `${here}/refine.html` } },
  },
  };
});

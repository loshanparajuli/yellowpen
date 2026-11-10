import { defineConfig } from 'vite';
// @ts-expect-error Build-only JavaScript plugin.
import { seoPlugin } from './scripts/seo.mjs';
export default defineConfig({
  plugins: [seoPlugin()],
  optimizeDeps: { include: ['mediabunny', 'zod', 'fflate'] },
  worker: { format: 'es' },
});

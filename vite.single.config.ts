// One self-contained HTML file (JS, CSS and fonts inlined) that opens by double-click, no server or
// Node needed. Used to share the prototype for review and founder tests. `npm run build:single`.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  // One file only: no public/ (robots.txt, the 1.5 MB demo video), so no link to the video either.
  publicDir: false,
  define: { __DEMO_VIDEO__: 'null' },
  build: { outDir: 'dist-single', emptyOutDir: true },
});

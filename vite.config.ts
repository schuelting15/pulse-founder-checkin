/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Inline the app's one stylesheet into index.html. It is small (4 kB gzip) but render-blocking, and
 * on a throttled phone the extra round trip cost about a second of first paint (Lighthouse).
 * Font URLs are rewritten from the CSS file's folder (assets/) to the page's.
 */
function inlineCss(): Plugin {
  return {
    name: 'pulse-inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') return;
      const chunksCode = Object.values(bundle).map((f) => (f.type === 'chunk' ? f.code : '')).join('\n');
      for (const f of Object.values(bundle)) {
        if (f.type !== 'asset' || !f.fileName.endsWith('.css') || chunksCode.includes(f.fileName)) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*href="\\./${f.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
        const page = String(html.source);
        if (!tag.test(page)) continue;
        const css = String(f.source).replace(/url\(\.\//g, 'url(./assets/');
        html.source = page.replace(tag, () => `<style>${css}</style>`);
        delete bundle[f.fileName];
      }
    },
  };
}

// base './' keeps the static build portable (any host, any sub-path); routing uses HashRouter.
// public/pulse-demo.mp4 is copied as-is, so the deployed site can link to the demo video.
export default defineConfig({
  base: './',
  plugins: [react(), inlineCss()],
  define: { __DEMO_VIDEO__: JSON.stringify('./pulse-demo.mp4') },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'design/**/*.test.ts'],
  },
});

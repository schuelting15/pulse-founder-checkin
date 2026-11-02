// Convert the newest Playwright recording of e2e/demo.spec.ts to public/pulse-demo.mp4 (H.264, web-safe).
// public/ ships with the site, so the deployed app can link to it.
// Usage: npm run demo   (runs the test, then this script). Needs ffmpeg on PATH.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function videos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? videos(p) : e.name.endsWith('.webm') && p.includes('demo-') ? [p] : [];
  });
}
const found = videos('test-results').sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
if (!found.length) throw new Error('No demo recording in test-results/. Run: npx playwright test e2e/demo.spec.ts');
mkdirSync('public', { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', found[0], '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', '-an', 'public/pulse-demo.mp4'], { stdio: 'inherit' });
console.log(`public/pulse-demo.mp4 from ${found[0]}`);

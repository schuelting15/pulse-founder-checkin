import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (vite preview), not the dev server.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});

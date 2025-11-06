import { defineConfig, devices } from '@playwright/test';

const HOST = process.env.HOST || 'example.local';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '9000';
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';

const BASE_URL = `http://${HOST}:${FRONTEND_PORT}`;
const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'echo "Backend should be running on ' + BACKEND_URL + '"',
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});


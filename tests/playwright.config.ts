import { defineConfig, devices } from '@playwright/test';

const HOST = process.env.HOST || 'example.local';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '9000';
const BACKEND_HOST = process.env.BACKEND_HOST || HOST;
const BACKEND_PORT = process.env.BACKEND_PORT || '9001';

// Always include port in URL for consistency
// In test environment with network_mode: service:frontend, use localhost:80
// (internal container port, not host port)
// HOST=localhost indicates test environment with network_mode: service:frontend
const BASE_URL = HOST === 'localhost'
  ? `http://localhost:80`  // Internal container port when using network_mode: service:frontend
  : `http://${HOST}:${FRONTEND_PORT}`;
// For API calls, use backend directly (tests have access to Docker network)
// But for browser requests, use BASE_URL + /api (proxied through nginx)
const BACKEND_URL = HOST === 'localhost'
  ? BASE_URL  // Use frontend URL, API is proxied through nginx
  : `http://${BACKEND_HOST}:${BACKEND_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
    launchOptions: {
      args: [
        `--unsafely-treat-insecure-origin-as-secure=${BASE_URL}`,
        `--allow-insecure-localhost`
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
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


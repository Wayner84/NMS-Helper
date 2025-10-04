import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev -- --host --port=4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})

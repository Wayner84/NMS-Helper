import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4178/',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port=4178 --strictPort',
    url: 'http://127.0.0.1:4178/',
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})

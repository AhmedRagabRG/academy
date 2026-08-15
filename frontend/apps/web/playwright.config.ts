import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./playwright",
  workers: 1,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "laptop", use: { channel: "chrome", viewport: { width: 1024, height: 768 } } },
    { name: "tablet", use: { browserName: "chromium", channel: "chrome", viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
    { name: "firefox-smoke", testMatch: /auth\.spec\.ts/, use: { ...devices["Desktop Firefox"] } },
    { name: "webkit-smoke", testMatch: /auth\.spec\.ts/, use: { ...devices["Desktop Safari"] } },
  ],
})

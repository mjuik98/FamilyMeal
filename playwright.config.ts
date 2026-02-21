import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 3230);
const host = process.env.E2E_HOST || "127.0.0.1";
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium-dark",
      use: {
        ...devices["Pixel 7"],
        colorScheme: "dark",
      },
    },
    {
      name: "mobile-chromium-light",
      use: {
        ...devices["Pixel 7"],
        colorScheme: "light",
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port} --hostname ${host}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});

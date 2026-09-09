import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    // Permite ejecutar QA contra una instancia aislada sin tocar un servidor local existente.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8081",
    viewport: { width: 1440, height: 1080 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: "list",
});

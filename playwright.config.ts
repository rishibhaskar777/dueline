import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SIGNED_IN = "tests/e2e/.auth/state.json";

// The suite runs against the production build in offline mode, so it needs no accounts and no
// network. The demo date is fixed so that "last month" always holds the same PayPal payments.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  // One server keeps every invoice in memory, so tests share it one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [
    { name: "sign-in", testMatch: "**/sign-in.setup.ts" },
    {
      name: "chromium",
      dependencies: ["sign-in"],
      use: { ...devices["Desktop Chrome"], storageState: SIGNED_IN },
      testIgnore: "**/*.setup.ts",
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 5 * 60_000,
    // A password set in .env.local would otherwise replace the offline one the tests sign in with.
    env: {
      DUELINE_OFFLINE: "true",
      CI: "true",
      DEMO_TODAY: "2026-11-04",
      DEMO_PASSWORD: "offline",
    },
  },
});

import { expect, test as setup } from "@playwright/test";
import { DEMO_PASSWORD } from "./support";

// Sign-in attempts are limited to ten in fifteen minutes, so the suite signs in once and every
// other test starts from the saved cookie.
setup("sign in to the demo", async ({ request }) => {
  const response = await request.post("/api/demo/session", { data: { password: DEMO_PASSWORD } });
  expect(response.status()).toBe(204);
  await request.storageState({ path: "tests/e2e/.auth/state.json" });
});

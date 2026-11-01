import { expect, test } from "@playwright/test";

const SCREENS = [
  "/",
  "/receivables",
  "/clients",
  "/invoices/new",
  "/nudges",
  "/export",
  "/profile",
  "/settings",
];

test.describe("Content Security Policy", () => {
  test("every screen sends the policy and works under it", async ({ page }) => {
    const refused: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) refused.push(message.text());
    });

    for (const path of SCREENS) {
      const response = await page.goto(path);
      const policy = response?.headers()["content-security-policy"] ?? "";
      expect(policy, path).toContain("default-src 'self'");
      expect(policy, path).toContain("frame-ancestors 'none'");
      expect(policy, path).toContain("object-src 'none'");
      await page.waitForLoadState("networkidle");
    }

    expect(refused).toEqual([]);
  });

  test("API routes send the policy too, signed in or not", async ({
    request,
    playwright,
    baseURL,
  }) => {
    const signedIn = await request.get("/api/health");
    expect(signedIn.headers()["content-security-policy"]).toContain("default-src 'self'");

    const stranger = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const refused = await stranger.get("/api/invoices");
    expect(refused.status()).toBe(401);
    expect(refused.headers()["content-security-policy"]).toContain("default-src 'self'");
    await stranger.dispose();
  });

  test("the pages still run: a screen that loads its data over the API shows it", async ({
    page,
  }) => {
    await page.goto("/receivables");
    await expect(page.getByLabel("Totals")).toContainText("₹");
  });
});

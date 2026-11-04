import { expect, test } from "@playwright/test";

const APP_PAGES = [
  "/receivables",
  "/clients",
  "/nudges",
  "/export",
  "/profile",
  "/settings",
  "/demo-tools",
  "/invoices/new",
];

// The public pages are checked at the same widths in site.spec.ts.
for (const width of [768, 1024]) {
  test.describe(`pages at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of [...APP_PAGES]) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  });
}

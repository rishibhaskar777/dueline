import { expect, test } from "@playwright/test";

test.describe("app pages on a phone", () => {
  for (const path of ["/export", "/profile", "/settings", "/demo-tools"]) {
    test(`${path} does not scroll sideways at 390 px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("/settings does not scroll sideways at 360 px and the rates table is not cut off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("USD market rate")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const card = await page.locator("form[aria-labelledby='fees-title']").boundingBox();
    const field = await page.getByLabel("AUD market rate").boundingBox();
    const amount = await page.locator("#calculator-amount").boundingBox();
    const cardRight = (card?.x ?? 0) + (card?.width ?? 0);
    expect((field?.x ?? 0) + (field?.width ?? 0)).toBeLessThanOrEqual(cardRight);
    expect((amount?.x ?? 0) + (amount?.width ?? 0)).toBeLessThanOrEqual(360);
    const clipped = await page
      .locator("#calculator-amount")
      .evaluate((input: HTMLInputElement) => input.scrollWidth > input.clientWidth);
    expect(clipped).toBe(false);
  });
});

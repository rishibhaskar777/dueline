import { expect, test } from "@playwright/test";

const MAX_TABS = 20;

test.describe("Keyboard use", () => {
  test("Tab reaches the main navigation, Ctrl+K opens the palette and Escape closes it", async ({
    page,
  }) => {
    await page.goto("/receivables");
    await expect(page.getByRole("heading", { name: "Money owed to you" })).toBeVisible();

    let inNavigation = false;
    for (let presses = 0; presses < MAX_TABS && !inNavigation; presses++) {
      await page.keyboard.press("Tab");
      inNavigation = await page.evaluate(
        () => document.activeElement?.closest('nav[aria-label="Main"]') != null,
      );
    }
    expect(inNavigation).toBe(true);

    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });
});

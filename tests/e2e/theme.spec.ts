import { expect, test } from "@playwright/test";

test.describe("Theme", () => {
  test("the toggle switches the page theme and the choice survives a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/receivables");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(html).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("the theme changes at once, with no colour transition left running", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/profile");
    await expect(page.getByLabel("GSTIN")).not.toHaveValue("");

    const running = await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Switch to dark theme"]',
      );
      button?.click();
      return {
        dark: document.documentElement.classList.contains("dark"),
        transitions: document.getAnimations().filter((a) => a instanceof CSSTransition).length,
      };
    });

    expect(running).toEqual({ dark: true, transitions: 0 });
    await expect(page.locator("html")).not.toHaveClass(/theme-changing/);
  });
});

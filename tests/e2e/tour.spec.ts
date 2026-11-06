import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations, expectNoSidewaysScroll, openInTheme } from "./support";

const tour = (page: Page) => page.getByRole("region", { name: "Tour the demo" });

test.describe("Tour the demo", () => {
  test("is the first card on Home, with a link for each step of the README's path", async ({
    page,
  }) => {
    await page.goto("/receivables");
    await expect(tour(page)).toBeVisible();
    await expect(tour(page).getByRole("link")).toHaveCount(8);

    const top = await tour(page).boundingBox();
    const morning = await page.getByRole("region", { name: "This morning" }).boundingBox();
    expect(top?.y ?? 0).toBeLessThan(morning?.y ?? 0);
  });

  test("the steps open the sample chat, last month's register and a late client", async ({
    page,
  }) => {
    await page.goto("/receivables");
    await tour(page)
      .getByRole("link", { name: /^New invoice → Use a sample chat/ })
      .click();
    await expect(page.getByLabel("Client chat")).toHaveValue(/\S/);
    await expect(page.getByRole("button", { name: "Draft invoice" })).toBeEnabled();

    await page.goto("/receivables");
    await tour(page).getByRole("link", { name: "Export register." }).click();
    await expect(page.getByText("October 2026").first()).toBeVisible();

    await page.goto("/receivables");
    await tour(page).getByRole("link", { name: "Clients behind." }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Okafor & Reyes" })).toBeVisible();

    await page.goto("/receivables");
    await tour(page).getByRole("link", { name: "Home." }).click();
    await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
  });

  test("the Home step scrolls to the due line, and the deposit step goes to Ready to send", async ({
    page,
  }) => {
    await page.goto("/receivables");
    await tour(page).getByRole("link", { name: "Home." }).click();
    await expect(page.getByRole("heading", { name: "The due line" })).toBeInViewport();

    // The demo story already holds a balance saved as a draft, so this step goes to Ready to send.
    await page.goto("/receivables");
    await tour(page).getByRole("link", { name: "Deposit and balance." }).click();
    await expect(page.getByRole("heading", { name: "Ready to send" })).toBeInViewport();
  });

  test("the late client and last month come from the data, not from fixed ids", async ({
    page,
  }) => {
    await page.goto("/receivables");
    const links = tour(page).getByRole("link");
    const lateClient = await links.filter({ hasText: "Clients behind." }).getAttribute("href");
    const mostLate = await page
      .getByRole("region", { name: "Clients behind" })
      .getByRole("link")
      .first()
      .getAttribute("href");
    expect(lateClient).toBe(mostLate);
    await expect(links.filter({ hasText: "Export register." })).toHaveAttribute(
      "href",
      "/export?month=2026-10",
    );
  });

  test("Dismiss works when the browser lets the page store nothing", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("storage is blocked");
        },
      });
    });
    await page.goto("/receivables");
    await tour(page).getByRole("button", { name: "Dismiss" }).click();
    await expect(tour(page)).toHaveCount(0);
  });

  test("Dismiss hides it in this browser, and Customise brings it back", async ({ page }) => {
    await page.goto("/receivables");
    await tour(page).getByRole("button", { name: "Dismiss" }).click();
    await expect(tour(page)).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("region", { name: "This morning" })).toBeVisible();
    await expect(tour(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Customise" }).click();
    await page.getByRole("switch", { name: "Show Tour the demo" }).click();
    await page.keyboard.press("Escape");
    await expect(tour(page)).toBeVisible();
  });

  test("works by keyboard", async ({ page }) => {
    await page.goto("/receivables");
    const first = tour(page).getByRole("link").first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(tour(page).getByRole("link").nth(1)).toBeFocused();
    await tour(page).getByRole("button", { name: "Dismiss" }).focus();
    await page.keyboard.press("Enter");
    await expect(tour(page)).toHaveCount(0);
  });

  test("has no serious accessibility problems in either theme", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await openInTheme(page, theme, "/receivables");
      await expect(tour(page)).toBeVisible();
      // AG Grid builds its header's ARIA after the text shows; axe must wait for it.
      await expect(page.getByRole("columnheader", { name: "Invoice" })).toBeVisible();
      await expectNoSeriousViolations(page, `Home with the tour card, ${theme}`);
    }
  });

  test("does not scroll sideways at 360 px, also with a wider font", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/receivables");
    await expect(tour(page)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectNoSidewaysScroll(page, "Home with the tour card");
  });
});

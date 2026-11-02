import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

const PAGES = [
  { path: "/how-it-works", link: "How it works", h1: "From a chat to rupees in four steps." },
  { path: "/features", link: "Features", h1: "Everything after you hit send." },
  { path: "/for-your-ca", link: "For your CA", h1: "A register your CA can work with." },
  {
    path: "/built-on-paypal",
    link: "Built on PayPal",
    h1: "PayPal moves the money. Dueline does the rest.",
  },
];

test.describe("public website", () => {
  for (const { path, link, h1 } of PAGES) {
    test(`${path} has its heading and marks its link current`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Site" });
      await expect(nav.getByRole("link", { name: link })).toHaveAttribute("aria-current", "page");
      await expect(nav.locator("[aria-current]")).toHaveCount(1);
      await expect(page.getByRole("link", { name: "Source on GitHub" })).toBeVisible();
    });

    test(`"Open the demo" on ${path} leads to the password page`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole("banner").getByRole("link", { name: "Open the demo" }).click();
      await expect(page).toHaveURL(/\/demo\?next=%2Freceivables/);
      await expect(page.getByLabel("Demo password")).toBeVisible();
    });
  }

  test("the landing page marks no link current", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "Site" }).locator("[aria-current]"),
    ).toHaveCount(0);
  });

  test("the landing choices switch the card beside them", async ({ page }) => {
    await page.goto("/");
    const group = page.getByRole("group", { name: "What Dueline does" });
    await expect(group.getByRole("button", { name: "Know your rupees" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Reaches your bank", { exact: true })).toBeVisible();

    await group.getByRole("button", { name: "Spot late payers" }).click();
    await expect(group.getByRole("button", { name: "Spot late payers" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Late on 3 of 3 invoices", { exact: false })).toBeVisible();
    await expect(page.getByText("Offer 2% if paid within 7 days")).toBeVisible();

    await group.getByRole("button", { name: "Stay export-ready" }).click();
    await expect(page.getByText("PayPal FIRA", { exact: true })).toBeVisible();
    await expect(page.getByText("Bank, number missing")).toBeVisible();
  });

  test("an unknown page shows both ways out", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(
      page.getByRole("heading", { level: 1, name: "This page is not on the line" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Home" })).toHaveAttribute(
      "href",
      "/receivables",
    );
    await expect(page.getByRole("link", { name: "Back to the website" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  for (const path of ["/", "/demo", ...PAGES.map(({ path }) => path)]) {
    test(`${path} does not scroll sideways on a phone`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

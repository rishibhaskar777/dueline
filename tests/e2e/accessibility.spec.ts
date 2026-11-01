import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations, openInTheme } from "./support";

interface Screen {
  name: string;
  path: string;
  // Waits until the screen has its data, so the check sees what a person sees.
  ready: (page: Page) => Promise<void>;
  // Moves to a later state of the same screen, which is checked as well.
  later?: { name: string; go: (page: Page) => Promise<void> };
}

const SCREENS: Screen[] = [
  {
    name: "Landing",
    path: "/",
    ready: (page) => expect(page.getByRole("heading", { level: 1 })).toBeVisible(),
  },
  {
    name: "Receivables",
    path: "/receivables",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
      await expect(page.getByLabel("Totals")).toContainText("₹");
    },
  },
  {
    name: "New invoice",
    path: "/invoices/new",
    ready: (page) =>
      expect(page.getByRole("heading", { name: "Paste the client chat" })).toBeVisible(),
    later: {
      name: "New invoice, review",
      go: async (page) => {
        await page.getByRole("button", { name: "Use a sample chat" }).click();
        await page.getByRole("button", { name: "Draft invoice" }).click();
        await expect(page.getByRole("heading", { name: "Items", exact: true })).toBeVisible();
        await expect(page.getByText(/reaches your bank$/)).toBeVisible();
      },
    },
  },
  {
    name: "Nudges",
    path: "/nudges",
    ready: (page) => expect(page.getByLabel("Message").first()).not.toHaveValue(""),
  },
  {
    name: "Export register",
    path: "/export",
    ready: async (page) => {
      await page.getByRole("button", { name: "Previous month" }).click();
      await expect(page.getByText("INV-0041").first()).toBeVisible();
    },
  },
  {
    name: "Profile",
    path: "/profile",
    ready: (page) => expect(page.getByLabel("GSTIN")).not.toHaveValue(""),
  },
];

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    for (const screen of SCREENS) {
      test(`${screen.name} has no serious accessibility violations`, async ({ page }) => {
        await openInTheme(page, theme, screen.path);
        await screen.ready(page);
        await expectNoSeriousViolations(page, `${screen.name} (${theme})`);

        if (screen.later) {
          await screen.later.go(page);
          await expectNoSeriousViolations(page, `${screen.later.name} (${theme})`);
        }
      });
    }
  });
}

import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations, openInTheme, turnUpfrontOff } from "./support";

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
  ...[
    ["How it works", "/how-it-works"],
    ["Features", "/features"],
    ["For your CA", "/for-your-ca"],
    ["Built on PayPal", "/built-on-paypal"],
  ].map(([name, path]) => ({
    name,
    path,
    ready: (page: Page) => expect(page.getByRole("heading", { level: 1 })).toBeVisible(),
  })),
  {
    name: "Demo password",
    path: "/demo",
    ready: (page) => expect(page.getByLabel("Demo password")).toBeVisible(),
  },
  {
    name: "Not found",
    path: "/no-such-page",
    ready: (page) => expect(page.getByRole("heading", { level: 1 })).toBeVisible(),
  },
  {
    name: "Receivables",
    path: "/receivables",
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
      await expect(page.getByLabel("Totals")).toContainText("₹");
      await expect(page.getByRole("columnheader", { name: "Invoice" })).toBeVisible();
    },
    later: {
      name: "Receivables, Customise and the invoice panel",
      go: async (page) => {
        await page.getByRole("button", { name: "Customise" }).click();
        const customise = page.getByRole("dialog", { name: "Customise Receivables" });
        await expect(customise).toBeVisible();
        await expectNoSeriousViolations(page, "Receivables, Customise");
        await page.keyboard.press("Escape");
        await expect(customise).toBeHidden();
        await page.locator(".ag-row").first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
      },
    },
  },
  {
    name: "New invoice",
    path: "/invoices/new",
    ready: (page) =>
      expect(
        page.getByRole("heading", { level: 1, name: "Paste what your client wrote." }),
      ).toBeVisible(),
    later: {
      name: "New invoice, review",
      go: async (page) => {
        await page.getByRole("button", { name: "Use a sample chat" }).click();
        await page.getByRole("button", { name: "Draft invoice" }).click();
        await expect(page.getByRole("heading", { name: "Items", exact: true })).toBeVisible();
        await turnUpfrontOff(page);
        await expect(page.getByText("About this reaches your bank")).toBeVisible();
      },
    },
  },
  {
    name: "Clients",
    path: "/clients",
    ready: (page) => expect(page.getByRole("link", { name: /Halden Coffee Co\./ })).toBeVisible(),
    later: {
      name: "Client page",
      go: async (page) => {
        await page
          .getByRole("link", { name: /Halden Coffee Co\./ })
          .first()
          .click();
        await expect(page.getByRole("button", { name: "Merge into another client" })).toBeVisible();
      },
    },
  },
  {
    name: "Invoice page",
    path: "/receivables",
    ready: (page) => expect(page.getByRole("heading", { name: "The due line" })).toBeVisible(),
    later: {
      name: "Invoice page, opened",
      go: async (page) => {
        await page
          .getByRole("link", { name: /^Open invoice / })
          .first()
          .click();
        await expect(page.getByLabel("Invoice facts")).toBeVisible();
      },
    },
  },
  {
    name: "Nudges",
    path: "/nudges",
    ready: (page) =>
      expect(page.getByLabel("Message", { exact: true }).first()).not.toHaveValue(""),
  },
  {
    name: "Export register",
    path: "/export",
    ready: async (page) => {
      await page.getByRole("button", { name: "Previous month" }).click();
      await expect(page.getByText("INV-0041").first()).toBeVisible();
      // AG Grid builds its header and row ARIA after the text shows; axe must wait for the grid.
      await expect(page.getByRole("columnheader").first()).toBeVisible();
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".ag-row").length > 0 &&
          !document.querySelector(".ag-overlay-loading-center"),
      );
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
    },
  },
  {
    name: "Fees and rates",
    path: "/settings",
    ready: async (page) => {
      await expect(page.getByLabel("PayPal fee (%)")).toBeVisible();
      await expect(page.getByText("You receive")).toBeVisible();
    },
  },
  {
    name: "Demo tools",
    path: "/demo-tools",
    ready: (page) => expect(page.getByRole("button", { name: "Reset the demo" })).toBeVisible(),
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

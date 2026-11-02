import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD } from "./support";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("landing page and demo access", () => {
  test("the landing page opens on the promise and leads to the password page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Get paid from abroad. Without chasing." }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Site" })
      .getByRole("link", { name: "How it works" })
      .waitFor();
    await page.getByRole("banner").getByRole("link", { name: "Open the demo" }).click();
    await expect(page).toHaveURL(/\/demo\?next=%2Freceivables/);
    await expect(page.getByRole("heading", { level: 1, name: "Open the demo" })).toBeVisible();
  });

  test("a wrong password shows an error and a right one opens Receivables", async ({ page }) => {
    await page.goto("/demo?next=/receivables");

    await page.getByLabel("Demo password").fill("not the password");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#demo-password-error")).toContainText("That password is not right");

    await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening|day)/ }),
    ).toBeVisible();
    const totals = page.getByLabel("Totals");
    await expect(totals).toContainText("Outstanding");
    await expect(totals).toContainText("Overdue");
    await expect(totals).toContainText("Paid in the last 30 days");
    await expect(totals).toContainText("₹");
    await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await expect(page.getByText("Offline demo", { exact: true })).toBeVisible();
  });

  test("the password can be shown and hidden", async ({ page }) => {
    await page.goto("/demo");
    const field = page.getByLabel("Demo password", { exact: true });
    await expect(field).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show password", exact: true }).click();
    await expect(field).toHaveAttribute("type", "text");
    const hide = page.getByRole("button", { name: "Hide password", exact: true });
    await expect(hide).toHaveText("Hide");
    await expect(hide).not.toHaveAttribute("aria-pressed");

    await hide.click();
    await expect(field).toHaveAttribute("type", "password");
    await expect(page.getByRole("button", { name: "Show password", exact: true })).toHaveText(
      "Show",
    );
  });

  test("an empty password shows a message, sends nothing and focuses the field", async ({
    page,
  }) => {
    let sent = 0;
    await page.route("**/api/demo/session", (route) => {
      sent += 1;
      return route.continue();
    });
    await page.goto("/demo");
    const field = page.getByLabel("Demo password", { exact: true });
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeEnabled();

    await continueButton.click();
    const message = page.locator("#demo-password-error");
    await expect(message).toHaveText("Enter the demo password.");
    await expect(message).toHaveAttribute("role", "alert");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toBeFocused();
    expect(sent).toBe(0);
  });

  test("a wrong password puts the cursor back in the field", async ({ page }) => {
    await page.goto("/demo");
    const field = page.getByLabel("Demo password", { exact: true });
    await field.fill("not the password");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("#demo-password-error")).toBeVisible();
    await expect(field).toBeFocused();
  });

  test("the app screens and the API need the password", async ({ page, request }) => {
    expect((await request.get("/api/invoices")).status()).toBe(401);
    await page.goto("/nudges");
    await expect(page).toHaveURL(/\/demo\?next=%2Fnudges/);
  });
});

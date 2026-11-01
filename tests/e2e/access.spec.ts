import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD } from "./support";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("landing page and demo access", () => {
  test("the landing page opens on the promise and leads to the password page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Get paid by clients abroad/ }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Open the demo" }).click();
    await expect(page).toHaveURL(/\/demo\?next=%2Freceivables/);
    await expect(page.getByRole("heading", { name: "Enter the demo password" })).toBeVisible();
  });

  test("a wrong password shows an error and a right one opens Receivables", async ({ page }) => {
    await page.goto("/demo?next=/receivables");

    await page.getByLabel("Demo password").fill("not the password");
    await page.getByRole("button", { name: "Open the demo" }).click();
    await expect(page.locator("#demo-password-error")).toContainText("That password is not right");

    await page.getByLabel("Demo password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Open the demo" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Money owed to you" })).toBeVisible();
    const totals = page.getByLabel("Totals");
    await expect(totals).toContainText("Outstanding");
    await expect(totals).toContainText("Overdue");
    await expect(totals).toContainText("Paid in the last 30 days");
    await expect(totals).toContainText("₹");
    await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
    await expect(page.getByText("Offline demo", { exact: true })).toBeVisible();
  });

  test("the app screens and the API need the password", async ({ page, request }) => {
    expect((await request.get("/api/invoices")).status()).toBe(401);
    await page.goto("/nudges");
    await expect(page).toHaveURL(/\/demo\?next=%2Fnudges/);
  });
});

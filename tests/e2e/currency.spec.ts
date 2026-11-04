import { expect, test } from "@playwright/test";
import { KRAFTWERK_CHAT } from "../support/kraftwerk-chat";

test.describe("Wrong-currency guard", () => {
  test("changing the currency to USD raises a notice, and the button puts EUR back on a click", async ({
    page,
  }) => {
    await page.goto("/invoices/new");
    await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
    await page.getByRole("button", { name: "Draft invoice" }).click();
    await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");

    const notice = page.getByText("The chat mentions € but this invoice is in USD");
    await expect(notice).toHaveCount(0);

    await page.getByRole("combobox", { name: "Currency" }).click();
    await page.getByRole("option", { name: "USD" }).click();
    await expect(notice).toBeVisible();

    // The currency stays USD until the button is clicked.
    await expect(page.getByRole("combobox", { name: "Currency" })).toContainText("USD");
    await page.getByRole("button", { name: "Use EUR" }).click();
    await expect(notice).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Currency" })).toContainText("EUR");
  });
});

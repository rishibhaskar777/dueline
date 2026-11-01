import { expect, test, type Page } from "@playwright/test";

interface InvoiceList {
  invoices: { id: string; number: string }[];
}

async function invoiceCount(page: Page): Promise<number> {
  const response = await page.request.get("/api/invoices");
  expect(response.ok()).toBe(true);
  return ((await response.json()) as InvoiceList).invoices.length;
}

async function draftFromSampleChat(page: Page): Promise<void> {
  await page.goto("/invoices/new");
  await page.getByRole("button", { name: "Use a sample chat" }).click();
  await page.getByRole("button", { name: "Draft invoice" }).click();
  await expect(page.getByRole("heading", { name: "Client", exact: true })).toBeVisible();
  await expect(page.getByLabel("Client name")).toHaveValue("Halden Coffee Co.");
  await page.getByRole("button", { name: "Send to the demo buyer" }).click();
  await expect(page.getByLabel("Client email")).toHaveValue(/@personal\.example\.com$/);
}

test.describe("New invoice", () => {
  test("a sample chat becomes a draft that is sent and appears on Receivables", async ({
    page,
  }) => {
    await draftFromSampleChat(page);
    await expect(page.getByText("We hid 1 email and 0 phone numbers")).toBeVisible();
    await expect(page.getByText("$450.00").first()).toBeVisible();

    await page.getByRole("button", { name: "Create and send invoice" }).click();
    const sent = page.getByRole("heading", { name: /^Invoice INV-\d+ sent$/ });
    await expect(sent).toBeVisible();
    const number = /INV-\d+/.exec((await sent.textContent()) ?? "")?.[0] ?? "";

    await page.getByRole("link", { name: "View receivables" }).click();
    await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
    await expect(page.getByText(number).first()).toBeVisible();
  });

  test("a double click on the send button creates one invoice", async ({ page }) => {
    await draftFromSampleChat(page);
    const before = await invoiceCount(page);

    await page.getByRole("button", { name: "Create and send invoice" }).dblclick();
    await expect(page.getByRole("heading", { name: /^Invoice INV-\d+ sent$/ })).toBeVisible();

    expect(await invoiceCount(page)).toBe(before + 1);
  });

  test("an address that is not a sandbox buyer is refused", async ({ page }) => {
    await draftFromSampleChat(page);
    await page.getByLabel("Client email").fill("someone@example.com");
    await page.getByRole("button", { name: "Create and send invoice" }).click();
    await expect(page.getByText(/In the demo, invoices and reminders can only go/)).toBeVisible();
  });
});

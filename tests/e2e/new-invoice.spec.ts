import { expect, test, type Page } from "@playwright/test";

interface InvoiceList {
  invoices: { id: string; number: string }[];
}

async function invoiceCount(page: Page): Promise<number> {
  const response = await page.request.get("/api/invoices");
  expect(response.ok()).toBe(true);
  return ((await response.json()) as InvoiceList).invoices.length;
}

const KRAFTWERK_CHAT = [
  "[28/10/26, 9:14 PM] Lena Fischer (Kraftwerk Studio): Hi! Loved the moodboard. Can you do the full brand kit?",
  "[28/10/26, 9:16 PM] Lena Fischer (Kraftwerk Studio): So: logo final files, 2 business card designs, and a 10 page brand guideline PDF",
  "[28/10/26, 9:20 PM] Riya: Sure. Logo files €400, business cards €90 each, guideline €650. Total €1,230",
  "[28/10/26, 9:22 PM] Lena Fischer (Kraftwerk Studio): Perfect. Can we do 50% now and rest on delivery? Payment in 15 days is fine for us",
].join("\n");

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
    await expect(page.getByText("We hid 1 email before the AI read the chat")).toBeVisible();
    await expect(page.getByText(/0 phone numbers/)).toHaveCount(0);
    await expect(page.getByText("$450.00").first()).toBeVisible();

    await page.getByRole("button", { name: "Create and send invoice" }).click();
    const sent = page.getByRole("heading", { name: /^Invoice INV-\d+ sent$/ });
    await expect(sent).toBeVisible();
    const number = /INV-\d+/.exec((await sent.textContent()) ?? "")?.[0] ?? "";

    await page.getByRole("link", { name: "View receivables" }).click();
    await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
    await expect(page.getByText(number).first()).toBeVisible();
  });

  test("a WhatsApp export is drafted with the upfront notice, the contact and the LUT line", async ({
    page,
  }) => {
    await page.goto("/invoices/new");
    await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
    await page.getByRole("button", { name: "Draft invoice" }).click();

    await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");
    await expect(page.getByLabel("Contact name (optional)")).toHaveValue("Lena Fischer");
    await expect(
      page.getByText("Client asked for 50% upfront: “Can we do 50% now and rest on delivery?”"),
    ).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Export under LUT/ })).toBeChecked();
    await expect(page.getByText(/We hid/)).toHaveCount(0);
  });

  test("a double click on the send button creates one invoice", async ({ page }) => {
    await draftFromSampleChat(page);
    const before = await invoiceCount(page);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname.startsWith("/api/invoices")
      ) {
        writes.push(new URL(request.url()).pathname);
      }
    });

    await page.getByRole("button", { name: "Create and send invoice" }).dblclick();
    await expect(page.getByRole("heading", { name: /^Invoice INV-\d+ sent$/ })).toBeVisible();

    expect(await invoiceCount(page)).toBe(before + 1);
    expect(writes).toEqual(["/api/invoices"]);
  });

  test("an address that is not a sandbox buyer is refused", async ({ page }) => {
    await draftFromSampleChat(page);
    await page.getByLabel("Client email").fill("someone@example.com");
    await page.getByRole("button", { name: "Create and send invoice" }).click();
    await expect(page.getByText(/In the demo, invoices and reminders can only go/)).toBeVisible();
  });
});

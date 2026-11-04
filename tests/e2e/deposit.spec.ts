import { expect, test, type Page } from "@playwright/test";
import { KRAFTWERK_CHAT } from "../support/kraftwerk-chat";
import { expectNoSeriousViolations, openInTheme } from "./support";

interface ListedInvoice {
  id: string;
  number: string;
  paypalStatus: string;
  client: { name: string };
}

interface InvoiceList {
  invoices: ListedInvoice[];
  readyToSend: ListedInvoice[];
}

async function invoiceList(page: Page): Promise<InvoiceList> {
  const response = await page.request.get("/api/invoices");
  expect(response.ok()).toBe(true);
  return (await response.json()) as InvoiceList;
}

async function draftKraftwerk(page: Page): Promise<void> {
  await page.goto("/invoices/new");
  await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
  await page.getByRole("button", { name: "Draft invoice" }).click();
  await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");
  await page.getByRole("button", { name: "Send to the demo buyer" }).click();
  await expect(page.getByLabel("Client email")).toHaveValue(/@personal\.example\.com$/);
}

test.describe("Deposit and balance", () => {
  test("50% asked for in the chat is preselected, the deposit is sent and the balance waits on Home", async ({
    page,
  }) => {
    await draftKraftwerk(page);

    await expect(page.getByRole("button", { name: "50%", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByText("Client wrote: “Can we do 50% now and rest on delivery?”"),
    ).toBeVisible();
    const summary = page.getByRole("region", { name: "Summary" });
    await expect(summary.getByText("Deposit, sent now")).toBeVisible();
    await expect(summary.getByText("Balance, sent on delivery")).toBeVisible();
    await expect(summary.getByText("€615.00")).toHaveCount(2);

    await page.getByRole("button", { name: "Create deposit and save balance" }).click();
    const sent = page.getByRole("heading", { name: /^Deposit INV-\d+ sent$/ });
    await expect(sent).toBeVisible();
    await expect(page.getByText(/The balance, invoice INV-\d+ for €615\.00/)).toBeVisible();

    const list = await invoiceList(page);
    const waiting = list.readyToSend.filter(({ client }) => client.name === "Kraftwerk Studio");
    expect(waiting).toHaveLength(1);
    const balance = waiting[0];
    expect(list.invoices.map(({ id }) => id)).not.toContain(balance.id);

    await page.getByRole("link", { name: "View receivables" }).click();
    const ready = page.getByRole("region", { name: "Ready to send" });
    await expect(ready).toBeVisible();
    await expect(ready.getByText("Kraftwerk Studio")).toBeVisible();
    await expectNoSeriousViolations(page, "Home with Ready to send");
    const send = ready.getByRole("button", { name: `Send balance for invoice ${balance.number}` });
    await send.click();
    await expect(send).toHaveCount(0);

    await expect
      .poll(
        async () =>
          (await invoiceList(page)).invoices.find(({ id }) => id === balance.id)?.paypalStatus,
      )
      .toBe("SENT");
  });

  test("the sample chat preselects 50% with Mike's quote and a $225.00 deposit and balance", async ({
    page,
  }) => {
    await page.goto("/invoices/new");
    await page.getByRole("button", { name: "Use a sample chat" }).click();
    await page.getByRole("button", { name: "Draft invoice" }).click();
    await expect(page.getByLabel("Client name")).toHaveValue("Halden Coffee Co.");

    await expect(page.getByText("We hid 1 email before the AI read the chat")).toBeVisible();
    await expect(page.getByRole("button", { name: "50%", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByText("Client wrote: “Can we pay half now and the rest when you deliver?”"),
    ).toBeVisible();
    const summary = page.getByRole("region", { name: "Summary" });
    await expect(summary.getByText("Deposit, sent now")).toBeVisible();
    await expect(summary.getByText("Balance, sent on delivery")).toBeVisible();
    await expect(summary.getByText("$225.00")).toHaveCount(2);
  });

  test("each invoice of the pair links to the other, and the balance draft can be sent from its page", async ({
    page,
  }) => {
    await draftKraftwerk(page);
    await page.getByRole("button", { name: "Create deposit and save balance" }).click();
    await expect(page.getByRole("heading", { name: /^Deposit INV-\d+ sent$/ })).toBeVisible();
    const balance = (await invoiceList(page)).readyToSend
      .filter(({ client }) => client.name === "Kraftwerk Studio")
      .at(-1);
    if (!balance) throw new Error("No balance draft");

    await page.goto(`/invoices/${encodeURIComponent(balance.id)}`);
    await expect(page.getByText("Draft, not sent")).toBeVisible();
    await expect(page.getByText(/Balance of/)).toBeVisible();
    await expectNoSeriousViolations(page, "Balance invoice page");
    await page.getByRole("link", { name: /^invoice INV-\d+$/ }).click();
    await expect(page.getByText(/Deposit for/)).toBeVisible();
    await page.getByRole("link", { name: /^invoice INV-\d+$/ }).click();
    await page.getByRole("button", { name: "Send now" }).click();
    await expect(page.getByText("Draft, not sent")).toHaveCount(0);
  });

  test("the deposit fields have no serious accessibility problems in either theme", async ({
    page,
  }) => {
    for (const theme of ["light", "dark"] as const) {
      await openInTheme(page, theme, "/invoices/new");
      await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
      await page.getByRole("button", { name: "Draft invoice" }).click();
      await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");
      await expectNoSeriousViolations(page, `New invoice with a deposit, ${theme}`);
    }
  });
});

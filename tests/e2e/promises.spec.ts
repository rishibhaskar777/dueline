import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations, openInTheme } from "./support";

interface Listed {
  id: string;
  number: string;
  paypalStatus: string;
  dueState: string;
  client: { name: string };
}

const lateCard = (page: Page) =>
  page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Okafor & Reyes" }) });

async function okaforInvoice(page: Page): Promise<Listed> {
  const { invoices } = (await (await page.request.get("/api/invoices")).json()) as {
    invoices: Listed[];
  };
  const found = invoices.find(
    ({ client, dueState }) => client.name === "Okafor & Reyes" && dueState === "overdue",
  );
  if (!found) throw new Error("The offline story has no late Okafor & Reyes invoice");
  return found;
}

async function inDays(page: Page, days: number): Promise<string> {
  const { today } = (await (await page.request.get("/api/health")).json()) as { today: string };
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function clearPromise(page: Page, id: string): Promise<void> {
  await page.request.delete(`/api/invoices/${encodeURIComponent(id)}/promise`);
}

test.describe("A client promised a date", () => {
  test("is set, edited and removed on the Nudges card, which shrinks to one line meanwhile", async ({
    page,
  }) => {
    const invoice = await okaforInvoice(page);
    try {
      await page.goto("/nudges");
      const card = lateCard(page);
      await card.getByRole("button", { name: "Client promised a date" }).click();

      const form = card.getByRole("form", { name: "Client promised a date" });
      await expect(form.getByLabel("Date the client promised")).toBeVisible();
      await form.getByLabel("Note (optional)").fill("Said finance pays on the 10th");
      // A date outside the range is refused before anything is saved.
      await form.getByLabel("Date the client promised").fill(await inDays(page, -1));
      await form.getByRole("button", { name: "Save" }).click();
      await expect(form.getByRole("alert")).toHaveText("Pick a date from today to 60 days ahead.");
      await form.getByLabel("Date the client promised").fill(await inDays(page, 61));
      await form.getByRole("button", { name: "Save" }).click();
      await expect(form.getByRole("alert")).toHaveText("Pick a date from today to 60 days ahead.");

      await form.getByLabel("Date the client promised").fill(await inDays(page, 6));
      await form.getByRole("button", { name: "Save" }).click();

      // The card is one line now, with no draft on it.
      await expect(card).toContainText(/Promised for \d+ \w+/);
      await expect(card.getByRole("button", { name: "Remind anyway" })).toBeVisible();
      await expect(card.getByLabel("Message", { exact: true })).toHaveCount(0);

      await card.getByRole("button", { name: "Remind anyway" }).click();
      await expect(card.getByLabel("Message", { exact: true })).toBeVisible();
      await expect(card).toContainText("Said finance pays on the 10th");

      await card.getByRole("button", { name: "Edit" }).click();
      await card.getByLabel("Date the client promised").fill(await inDays(page, 8));
      await card.getByLabel("Note (optional)").fill("Moved to the following week");
      await card.getByRole("button", { name: "Save" }).click();
      await expect(card).toContainText("Moved to the following week");
      await expect(card).not.toContainText("Said finance pays on the 10th");

      await card.getByRole("button", { name: "Remove" }).click();
      await expect(card.getByRole("button", { name: "Client promised a date" })).toBeVisible();
      await page.reload();
      await expect(lateCard(page).getByLabel("Message", { exact: true })).toBeVisible();
    } finally {
      await clearPromise(page, invoice.id);
    }
  });

  test("shows on Home, in the invoice facts and timeline and in the activity, and is removed from the invoice page", async ({
    page,
  }) => {
    const invoice = await okaforInvoice(page);
    try {
      const promisedOn = await inDays(page, 6);
      const saved = await page.request.put(
        `/api/invoices/${encodeURIComponent(invoice.id)}/promise`,
        {
          data: { promisedOn, note: "Said finance pays on the 10th" },
        },
      );
      expect(saved.ok()).toBe(true);

      await page.goto("/receivables");
      await expect(page.getByText(/^Promised \d+ \w+$/).first()).toBeVisible();
      await expect(page.locator("[data-promised]")).toHaveCount(1);
      await expect(
        page.getByText(/Okafor & Reyes promised to pay invoice \S+ by \d+ \w+/).first(),
      ).toBeVisible();

      await page.goto(`/invoices/${encodeURIComponent(invoice.id)}`);
      await expect(page.getByRole("term").filter({ hasText: "Client promised" })).toBeVisible();
      await expect(page.getByText("Said finance pays on the 10th").first()).toBeVisible();
      await expect(page.getByText(/^Client promised to pay by \d+ \w+$/)).toBeVisible();

      await page
        .getByRole("region", { name: "Promised date" })
        .getByRole("button", { name: "Remove" })
        .click();
      await expect(page.getByText(/^Client promised to pay by/)).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Client promised a date" })).toBeVisible();
    } finally {
      await clearPromise(page, invoice.id);
    }
  });

  test("a promise dated today still keeps the card to one line, and the draft carries it", async ({
    page,
  }) => {
    // The server only takes dates from today on, so a date that has passed (the card is normal
    // again, firm, with the reason) is covered by the unit tests.
    const invoice = await okaforInvoice(page);
    try {
      await page.request.put(`/api/invoices/${encodeURIComponent(invoice.id)}/promise`, {
        data: { promisedOn: await inDays(page, 0) },
      });
      await page.goto("/nudges");
      await expect(lateCard(page)).toContainText(/Promised for \d+ \w+/);
      const { drafts } = (await (await page.request.get("/api/reminders")).json()) as {
        drafts: { invoiceId: string; promise?: { promisedOn: string } }[];
      };
      expect(drafts.find((draft) => draft.invoiceId === invoice.id)?.promise?.promisedOn).toBe(
        await inDays(page, 0),
      );
    } finally {
      await clearPromise(page, invoice.id);
    }
  });

  test("has no serious accessibility problems on Nudges with Due soon and a promise, or on the invoice page", async ({
    page,
  }) => {
    const invoice = await okaforInvoice(page);
    try {
      await page.request.put(`/api/invoices/${encodeURIComponent(invoice.id)}/promise`, {
        data: { promisedOn: await inDays(page, 6), note: "Said finance pays on the 10th" },
      });
      for (const theme of ["light", "dark"] as const) {
        await openInTheme(page, theme, "/nudges");
        await expect(page.getByRole("heading", { name: /^Due soon/ })).toBeVisible();
        await expect(lateCard(page)).toContainText(/Promised for/);
        await expectNoSeriousViolations(page, `Nudges with Due soon and a promise, ${theme}`);

        await openInTheme(page, theme, `/invoices/${encodeURIComponent(invoice.id)}`);
        await expect(page.getByText(/^Client promised to pay by/)).toBeVisible();
        await expectNoSeriousViolations(page, `Invoice page with a promise, ${theme}`);

        await page.getByRole("button", { name: "Edit" }).click();
        await expect(page.getByLabel("Date the client promised")).toBeVisible();
        await expectNoSeriousViolations(page, `Invoice page, promise form, ${theme}`);
      }
    } finally {
      await clearPromise(page, invoice.id);
    }
  });
});

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { KRAFTWERK_CHAT } from "../support/kraftwerk-chat";
import { expectNoSeriousViolations, openInTheme } from "./support";

interface Created {
  deposit: { invoice: { id: string } };
  balance: { id: string } | null;
}

const BUYER = "buyer@personal.example.com";
const DRAFT = {
  client: { name: "Layout Check GmbH", email: BUYER, country: "DE", contactName: "Mia Keller" },
  currency: "EUR",
  dueOn: "2026-12-15",
  items: [
    { name: "Brand refresh", quantity: 1, unitAmount: "1000.01", sac: "998314" },
    {
      name: "Brand guideline PDF with ten pages and all source files",
      quantity: 12,
      unitAmount: "1250.50",
      sac: "998314",
    },
  ],
  purposeCode: "P1099",
};

async function createPair(request: APIRequestContext): Promise<Created> {
  const response = await request.post("/api/invoices/split", {
    data: {
      draft: { ...DRAFT, includeLutNote: true },
      requestId: crypto.randomUUID(),
      balanceRequestId: crypto.randomUUID(),
      split: { percent: 33, depositDueOn: "2026-11-11", balanceDueOn: "2026-12-15" },
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as Created;
}

async function createOutsideLut(request: APIRequestContext): Promise<string> {
  const response = await request.post("/api/invoices", {
    data: { draft: { ...DRAFT, includeLutNote: false }, requestId: crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as Created["deposit"]).invoice.id;
}

async function expectNoSidewaysScroll(page: Page, name: string): Promise<void> {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll, `${name} at 360 px`).toBeLessThanOrEqual(widths.client);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("Deposit, balance, currency check and print page", () => {
  test("New invoice with a split and the currency notice", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await openInTheme(page, theme, "/invoices/new");
      await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
      await page.getByRole("button", { name: "Draft invoice" }).click();
      await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");
      await page.getByRole("combobox", { name: "Currency" }).click();
      await page.getByRole("option", { name: "USD" }).click();
      await expect(page.getByText("The chat mentions € but this invoice is in USD")).toBeVisible();
      await expect(page.getByText("Deposit, sent now")).toBeVisible();
      await expectNoSeriousViolations(page, `New invoice, split and notice (${theme})`);
    }
  });

  test("New invoice with a split and the currency notice does not scroll sideways at 360 px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/invoices/new");
    await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
    await page.getByRole("button", { name: "Draft invoice" }).click();
    await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");
    await page.getByRole("combobox", { name: "Currency" }).click();
    await page.getByRole("option", { name: "USD" }).click();
    await expect(page.getByText("The chat mentions € but this invoice is in USD")).toBeVisible();
    await expect(page.getByText("Deposit, sent now")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  });

  test("the deposit and balance pages, Home, Profile and the print pages", async ({ page }) => {
    test.setTimeout(120_000);
    const pair = await createPair(page.request);
    const balanceId = pair.balance?.id;
    if (!balanceId) throw new Error("No balance draft");
    const outsideLut = await createOutsideLut(page.request);
    const pages = [
      {
        name: "Deposit invoice page",
        path: `/invoices/${encodeURIComponent(pair.deposit.invoice.id)}`,
      },
      { name: "Balance draft page", path: `/invoices/${encodeURIComponent(balanceId)}` },
      { name: "Home with Ready to send", path: "/receivables" },
      { name: "Profile", path: "/profile" },
      {
        name: "Print page under LUT",
        path: `/invoices/${encodeURIComponent(pair.deposit.invoice.id)}/print`,
      },
      {
        name: "Print page not under LUT",
        path: `/invoices/${encodeURIComponent(outsideLut)}/print`,
      },
    ];
    for (const { name, path } of pages) {
      for (const theme of ["light", "dark"] as const) {
        await openInTheme(page, theme, path);
        await page.waitForLoadState("networkidle");
        await expectNoSeriousViolations(page, `${name} (${theme})`);
      }
      await expectNoSidewaysScroll(page, name);
    }
  });

  test("the print page warns when the invoice is not under LUT and endorses it when it is", async ({
    page,
    request,
  }) => {
    const pair = await createPair(request);
    await page.goto(`/invoices/${encodeURIComponent(pair.deposit.invoice.id)}/print`);
    await expect(
      page.getByText(/Supply meant for export under bond or Letter of Undertaking/),
    ).toBeVisible();
    await expect(page.getByText(/Not under LUT/)).toHaveCount(0);

    const outsideLut = await createOutsideLut(request);
    await page.goto(`/invoices/${encodeURIComponent(outsideLut)}/print`);
    const warning =
      "Not under LUT: integrated tax (IGST) must be shown on this invoice. Add it with your CA before sending.";
    await expect(page.getByText(warning)).toHaveCount(2);
    await expect(page.getByText(/Supply meant for export/)).toHaveCount(0);
    await expect(page.getByText("Tax payable on reverse charge")).toBeVisible();
  });
});

test("a ten-item invoice still prints on one A4 page", async ({ page }) => {
  const items = Array.from({ length: 10 }, (_, index) => ({
    name: `Deliverable number ${index + 1} with a reasonably descriptive line name`,
    quantity: (index % 3) + 1,
    unitAmount: (100 + index * 37.5).toFixed(2),
    sac: "998314",
  }));
  const response = await page.request.post("/api/invoices", {
    data: { draft: { ...DRAFT, items, includeLutNote: true }, requestId: crypto.randomUUID() },
  });
  const { invoice } = (await response.json()) as Created["deposit"];

  await page.goto(`/invoices/${encodeURIComponent(invoice.id)}/print`);
  await expect(page.getByRole("heading", { name: "Tax invoice" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).toHaveLength(1);
});

import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations } from "./support";

async function overdueCountFromFilter(page: Page): Promise<number> {
  const button = page.getByRole("group", { name: "Filter by status" }).getByRole("button", {
    name: /^Overdue \d+$/,
  });
  const text = (await button.textContent()) ?? "";
  return Number(/(\d+)$/.exec(text)?.[1]);
}

test.describe("Receivables table", () => {
  for (const width of [1366, 1536]) {
    test(`shows every column without sideways scroll at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/receivables");
      const grid = page.locator(".ag-root-wrapper").last();
      await expect(grid).toBeVisible();

      for (const name of [
        "Invoice",
        "Client",
        "Amount",
        "To your bank",
        "Due",
        "Status",
        "PayPal",
      ]) {
        const header = grid.locator(".ag-header-cell-text", { hasText: new RegExp(`^${name}$`) });
        await expect(header).toBeVisible();
        const box = await header.boundingBox();
        expect(box && box.x + box.width).toBeLessThanOrEqual(width);
      }
      await expect(grid.locator(".ag-header-cell-text", { hasText: /^Details$/ })).toHaveCount(0);

      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(scrolls).toBe(false);
      const gridScrolls = await grid.evaluate((element) => {
        const viewport = element.querySelector(".ag-body-horizontal-scroll-viewport");
        return viewport ? viewport.scrollWidth > viewport.clientWidth + 1 : false;
      });
      expect(gridScrolls).toBe(false);
    });
  }

  test("the invoice number opens the invoice page", async ({ page }) => {
    await page.goto("/receivables");
    const link = page.getByRole("link", { name: /^Open invoice / }).first();
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/invoices\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: /^Invoice / })).toBeVisible();
    await expect(page.getByLabel("Invoice facts")).toContainText("Average days to get paid");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  });

  test("the filter is one group of buttons that changes the rows", async ({ page }) => {
    await page.goto("/receivables");
    const filter = page.getByRole("group", { name: "Filter by status" });
    const all = filter.getByRole("button", { name: /^All \d+$/ });
    await expect(all).toHaveAttribute("aria-pressed", "true");
    const grid = page.locator(".ag-root-wrapper").last();
    const before = await grid.locator(".ag-row").count();

    const paid = filter.getByRole("button", { name: /^Paid \d+$/ });
    await paid.click();
    await expect(paid).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
    const expected = Number(/(\d+)$/.exec((await paid.textContent()) ?? "")?.[1]);
    await expect(grid.locator(".ag-row")).toHaveCount(expected);
    expect(expected).toBeLessThan(before);
  });

  test("Customise can show the hidden Rupee rates widget", async ({ page }) => {
    await page.goto("/receivables");
    await expect(page.getByRole("heading", { name: "Rupee rates" })).toHaveCount(0);
    await page.getByRole("button", { name: "Customise" }).click();
    await page.getByRole("switch", { name: "Show Rates" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Rupee rates" })).toBeVisible();
  });

  test("has no sideways scroll at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/receivables");
    await expect(page.getByRole("heading", { name: "The due line" })).toBeVisible();
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(scrolls).toBe(false);
  });

  test("the PayPal column is a text link that names its invoice", async ({ page }) => {
    await page.goto("/receivables");
    const link = page.getByRole("link", {
      name: /^View invoice .* on PayPal \(opens in a new tab\)$/,
    });
    await expect(link.first()).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("the Nudges item counts the overdue invoices", async ({ page }) => {
    await page.goto("/receivables");
    const overdue = await overdueCountFromFilter(page);
    expect(overdue).toBeGreaterThan(0);

    await expect(page.getByRole("link", { name: `Nudges, ${overdue} overdue` })).toBeVisible();
  });
});

test.describe("Invoice page", () => {
  test("cancelling asks in the page and Keep it closes the question", async ({ page }) => {
    await page.goto("/receivables");
    await page
      .getByRole("link", { name: /^Open invoice / })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1, name: /^Invoice / })).toBeVisible();

    const cancel = page.getByRole("button", { name: "Cancel invoice" });
    if ((await cancel.count()) === 0) test.skip(true, "The first invoice cannot be cancelled.");
    await cancel.click();

    await expect(page.getByRole("heading", { name: /^Cancel invoice .+\?$/ })).toBeVisible();
    await expect(
      page.getByText("PayPal will mark it cancelled. This cannot be undone."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByRole("heading", { name: /^Cancel invoice .+\?$/ })).toHaveCount(0);
  });
});

test.describe("Export register", () => {
  // The offline demo has payments in the current month, so the empty month is played back for that one
  // request; October's register comes from the real server.
  async function withEmptyNovember(page: Page): Promise<void> {
    await page.route("**/api/export-register?month=2026-11", async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace("2026-11", "2026-10"),
      });
      const october = await response.json();
      await route.fulfill({
        json: {
          ...october,
          month: "2026-11",
          rows: [],
          outsideRows: [],
          totalInr: 0,
          paypalFiraInr: 0,
          bankInr: 0,
          paypalInr: 0,
          estimatedInr: 0,
          totalsByCurrency: [],
          missingPurposeCodes: 0,
          latestMonthWithPayments: "2026-10",
        },
      });
    });
  }

  test("opens on the latest month with payments when the current month has none, and says why", async ({
    page,
  }) => {
    await withEmptyNovember(page);
    await page.goto("/export");

    await expect(
      page.getByText(
        "No payments in November yet. Showing October, the latest month with payments.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download CSV for your CA" })).toBeVisible();
  });

  test("turns the CSV off, with a reason, for a month with no payments", async ({ page }) => {
    await withEmptyNovember(page);
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
    await page.getByRole("button", { name: "Next month" }).click();

    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
    await expect(page.getByText("Nothing to register")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download CSV for your CA" })).toBeDisabled();
    await expect(
      page.getByText(/The CSV for your CA is off because no invoices were paid in/),
    ).toBeVisible();
  });

  test("shows one rupee figure with one note", async ({ page }) => {
    await page.goto("/export");
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

    const tile = page.locator("dt", { hasText: "Rupees received" }).locator("..");
    await expect(tile).toContainText(/₹[\d,]+/);
    await expect(tile).toContainText(
      /All estimated|All from PayPal's figures|All by bank|\d+ (from PayPal's figures|estimated|by bank)/,
    );
  });

  test("a bank number saves on Enter, Escape undoes an edit and a bad number is refused inline", async ({
    page,
  }) => {
    await page.goto("/export");
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByRole("heading", { name: "Bank transfers" })).toBeVisible();
    await expect(page.getByText("On PayPal's FIRA", { exact: true })).toBeVisible();
    await expect(page.getByText("By bank transfer", { exact: true })).toBeVisible();

    // The story gives the earliest transfer its number, so the last one is still to fill.
    const input = page.getByLabel(/^FIRC or e-BRC number for invoice /).last();
    await input.fill("FIRC/26-77");
    await input.press("Escape");
    await expect(input).toHaveValue("");

    await input.fill("bad number!");
    await input.press("Enter");
    const complaint = page.getByText("Use letters, digits, / and - only, up to 40 characters.");
    await expect(complaint).toBeVisible();
    await input.press("Escape");
    await expect(input).toHaveValue("");
    await expect(complaint).toHaveCount(0);

    await input.fill("FIRC/26-77");
    await input.press("Enter");
    await expect(input).toHaveValue("FIRC/26-77");
    await page.reload();
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByLabel(/^FIRC or e-BRC number for invoice /).last()).toHaveValue(
      "FIRC/26-77",
    );
  });
});

test.describe("Nudges preview", () => {
  test("shows the email as Send my message fills it, and says PayPal's reminder is different", async ({
    page,
  }) => {
    await page.goto("/nudges");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Brightwell Labs" }) });
    await expect(card.getByLabel("Message", { exact: true })).not.toHaveValue("");

    await card.getByRole("button", { name: "Preview" }).click();
    const preview = card.getByRole("region", { name: "Email preview" });
    await expect(preview).toContainText("To");
    await expect(preview).toContainText("Subject");
    await expect(preview).toContainText("Pay here: ");
    await expect(preview).toContainText("PayPal's own reminder uses PayPal's standard wording");
    await expect(card.getByText(/ takes \d+ days to pay on average/)).toBeVisible();

    // It spans the card, not the 300 px action column.
    const previewBox = await preview.boundingBox();
    const cardBox = await card.boundingBox();
    expect(previewBox?.width ?? 0).toBeGreaterThan((cardBox?.width ?? 0) * 0.8);
  });
});

test.describe("First-run checklist", () => {
  test("is on Receivables and ticks from the data", async ({ page }) => {
    await page.goto("/receivables");
    const checklist = page.getByRole("region", { name: /^(Getting started|All set)$/ });
    await expect(checklist).toBeVisible();
    await checklist.getByRole("button", { name: "See all steps" }).click();
    await expect(
      checklist.getByRole("link", { name: /Fill in your business profile/ }),
    ).toBeVisible();
    // Receivables already lists sent invoices, so this one is ticked whoever made them.
    await expect(
      checklist.getByRole("link", { name: "Send your first invoice, done" }),
    ).toBeVisible();
    await expect(checklist.getByRole("link", { name: /Send your first invoice/ })).toHaveAttribute(
      "href",
      "/invoices/new",
    );
  });
});

test.describe("Clients", () => {
  test("the merge asks in the page and can be cancelled", async ({ page }) => {
    await page.goto("/clients");
    await page
      .getByRole("link", { name: /Halden Coffee Co\./ })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Merge into another client" }).click();
    await page.getByRole("combobox", { name: "Merge into which client?" }).fill("Brightwell");
    await page.getByRole("option", { name: /Brightwell Labs/ }).click();

    await expect(
      page.getByText(
        /will count as Brightwell Labs for risk, totals and reminders\. PayPal invoices are not changed\./,
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep them separate" }).click();
    await expect(page.getByRole("button", { name: "Merge into another client" })).toBeVisible();
  });
});

test.describe("Clients list and client page", () => {
  test("a client card opens the client page", async ({ page }) => {
    await page.goto("/clients");
    const card = page.getByRole("link", { name: /Halden Coffee Co\./ }).first();
    await expect(card).toContainText("Billed");
    await expect(card).toContainText("Owed");
    await expect(card).toContainText("Pays in");
    await card.click();
    await expect(page).toHaveURL(/\/clients\/by-key\//);
    await expect(page.getByRole("heading", { level: 1, name: "Halden Coffee Co." })).toBeVisible();
    await expect(page.getByLabel("Client totals")).toContainText("Billed");
    await page.getByRole("link", { name: "All clients" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  });

  test("searching by email finds the client, and a miss says so", async ({ page }) => {
    const response = await page.request.get("/api/clients");
    const { clients } = (await response.json()) as { clients: { name: string; email: string }[] };
    const target = clients[0];

    await page.goto("/clients");
    const search = page.getByRole("searchbox", { name: "Search clients" });
    await search.fill(target.email);
    await expect(page.getByRole("link", { name: new RegExp(target.name) }).first()).toBeVisible();

    await search.fill("no such client anywhere");
    await expect(page.getByText("No clients match.")).toBeVisible();
  });
});

test.describe("Invoice page header", () => {
  test("an overdue invoice has the payer link, copy and reminder actions", async ({ page }) => {
    const response = await page.request.get("/api/invoices");
    const { invoices } = (await response.json()) as {
      invoices: { id: string; dueState: string }[];
    };
    const overdue = invoices.find(({ dueState }) => dueState === "overdue");
    expect(overdue).toBeDefined();
    await page.goto(`/invoices/${encodeURIComponent(overdue?.id ?? "")}`);
    await expect(page.getByRole("heading", { level: 1, name: /^Invoice / })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Home$/ }).last()).toHaveAttribute(
      "href",
      "/receivables",
    );
    await expect(page.getByRole("link", { name: /^Open payer link/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy payer link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Send a reminder" })).toBeVisible();
  });

  test("a paid invoice has no reminder action", async ({ page }) => {
    const response = await page.request.get("/api/invoices");
    const { invoices } = (await response.json()) as {
      invoices: { id: string; dueState: string }[];
    };
    const paid = invoices.find(({ dueState }) => dueState === "paid");
    expect(paid).toBeDefined();
    await page.goto(`/invoices/${encodeURIComponent(paid?.id ?? "")}`);
    await expect(page.getByRole("heading", { level: 1, name: /^Invoice / })).toBeVisible();
    await expect(page.getByRole("link", { name: "Send a reminder" })).toHaveCount(0);
  });
});

test.describe("New invoice", () => {
  test("the sample chat reaches the review step with its own heading and summary", async ({
    page,
  }) => {
    await page.goto("/invoices/new");
    await expect(
      page.getByRole("heading", { level: 1, name: "Paste what your client wrote." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Use a sample chat" }).click();
    await page.getByRole("button", { name: "Draft invoice" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Check the draft" })).toBeVisible();
    await expect(page.getByText("About this reaches your bank")).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: "2 · Review and send" }),
    ).toHaveAttribute("aria-current", "step");
  });

  test("the radar sits under the Client card and its offer fills the one discount control", async ({
    page,
  }) => {
    await page.goto("/invoices/new");
    await page.getByRole("button", { name: "Use a sample chat" }).click();
    await page.getByRole("button", { name: "Draft invoice" }).click();
    await expect(page.getByRole("heading", { name: "Items", exact: true })).toBeVisible();

    const clientTop = await page
      .getByRole("heading", { name: "Client", exact: true })
      .boundingBox();
    const itemsTop = await page.getByRole("heading", { name: "Items", exact: true }).boundingBox();
    const radar = page.getByRole("heading", { name: "Late-payer radar" });
    if ((await radar.count()) > 0) {
      const radarTop = await radar.boundingBox();
      expect(radarTop?.y).toBeGreaterThan(clientTop?.y ?? 0);
      expect(radarTop?.y).toBeLessThan(itemsTop?.y ?? 0);
      await page.getByRole("button", { name: /^Offer \d+% if paid within \d+ days$/ }).click();
      await expect(page.getByLabel("Offer an early-payment discount")).toBeChecked();
      await expect(page.getByRole("button", { name: /^Offer \d+% if paid within/ })).toHaveCount(0);
    }
    await expect(page.getByText("PayPal fee", { exact: true })).toBeVisible();
    await expect(page.getByText("Conversion loss", { exact: true })).toHaveCount(0);

    const rupees = async (label: string): Promise<number> => {
      const value = await page
        .getByText(label, { exact: true })
        .locator("xpath=following-sibling::dd")
        .innerText();
      const matches = value.match(/₹([\d,]+)/g) ?? [];
      return Number((matches[matches.length - 1] ?? "").replace(/[^\d]/g, ""));
    };
    const fee = await rupees("PayPal fee");
    const conversion = await rupees("Currency conversion");
    const total = await rupees("Total lost");
    expect(fee + conversion).toBe(total);
  });

  test("the paste box shows an example and says what is hidden from the AI", async ({ page }) => {
    await page.goto("/invoices/new");
    const box = page.getByRole("textbox", { name: "Client chat" });
    expect(await box.getAttribute("placeholder")).toContain("\n");
    await expect(
      page.getByText("Emails and phone numbers are hidden before the AI reads it"),
    ).toBeVisible();
  });
});

test.describe("Phone layout", () => {
  const PAGES: [string, string][] = [
    ["Receivables", "/receivables"],
    ["Nudges", "/nudges"],
    ["Export register", "/export"],
    ["Clients", "/clients"],
    ["New invoice", "/invoices/new"],
  ];

  for (const [name, path] of PAGES) {
    test(`${name} has no sideways page scroll at 390 px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("Phone layout, new invoice review step", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("has no sideways page scroll", async ({ page }) => {
    await page.goto("/invoices/new");
    await page.getByRole("button", { name: "Use a sample chat" }).click();
    await page.getByRole("button", { name: "Draft invoice" }).click();
    await expect(page.getByRole("button", { name: "Create and send invoice" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("Phone layout, invoice and client pages", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function expectNoSideways(page: Page): Promise<void> {
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }

  test("the invoice page has no sideways page scroll", async ({ page }) => {
    await page.goto("/receivables");
    await page.getByRole("link", { name: "Open invoice page" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: /^Invoice / })).toBeVisible();
    await expect(page.getByLabel("Invoice facts")).toBeVisible();
    await expectNoSideways(page);
  });

  test("a client page, with its merge card, has no sideways page scroll", async ({ page }) => {
    await page.goto("/clients");
    await page
      .getByRole("link", { name: /Halden Coffee Co\./ })
      .first()
      .click();
    await expect(page.getByRole("button", { name: "Merge into another client" })).toBeVisible();
    await expectNoSideways(page);
  });

  test("the Nudges preview and the export bank rows fit", async ({ page }) => {
    await page.goto("/nudges");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Brightwell Labs" }) });
    await expect(card.getByLabel("Message", { exact: true })).not.toHaveValue("");
    await card.getByRole("button", { name: "Preview" }).click();
    await expect(card.getByRole("region", { name: "Email preview" })).toBeVisible();
    await expectNoSideways(page);

    await page.goto("/export");
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByRole("heading", { name: "Bank transfers" })).toBeVisible();
    await expect(page.getByLabel(/^FIRC or e-BRC number for invoice /).first()).toBeVisible();
    await expectNoSideways(page);
  });
});

test.describe("Top bar", () => {
  async function expectNoSideways(page: Page): Promise<void> {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }

  for (const [width, height] of [
    [1366, 768],
    [1536, 711],
  ]) {
    test(`is one line with no sideways scroll at ${width} x ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/receivables");
      const header = page.getByRole("banner");
      await expect(header.getByRole("link", { name: "Export register" })).toBeVisible();
      const box = await header.boundingBox();
      expect(box?.height ?? Infinity).toBeLessThan(80);
      await expectNoSideways(page);
    });
  }

  test("keeps the tabs on one line from 768 px up", async ({ page }) => {
    for (const width of [768, 900, 1024, 1180]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/receivables");
      const header = page.getByRole("banner");
      await expect(header.getByRole("link", { name: "Export register" })).toBeVisible();
      const box = await header.boundingBox();
      expect(box?.height ?? Infinity, `${width} px`).toBeLessThan(80);
      await expectNoSideways(page);
    }
  });

  test("scrolls the tabs inside their track at 390 x 844", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/receivables");
    const track = page.getByRole("navigation", { name: "Main" }).locator("div").first();
    await expect(track).toBeVisible();
    const scrolls = await track.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(scrolls).toBe(true);
    await expectNoSideways(page);
  });

  test("has Home, Clients and the rest as links, with the current page marked", async ({
    page,
  }) => {
    await page.goto("/clients");
    const main = page.getByRole("navigation", { name: "Main" });
    await expect(main.getByRole("link", { name: "Clients" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(main.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(main.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/receivables");
  });

  test("keeps the pill on the current tab when an invoice is opened from Home", async ({
    page,
  }) => {
    await page.goto("/receivables");
    const main = page.getByRole("navigation", { name: "Main" });
    await main.getByRole("link", { name: /^Nudges/ }).dispatchEvent("pointerover", {
      pointerType: "mouse",
    });
    await page.locator('a[href^="/invoices/INV"]').first().click();
    await expect(page).toHaveURL(/\/invoices\/INV/);
    await expect(main.getByRole("link", { name: "Home" })).toHaveClass(/text-white/);
    await expect(main.getByRole("link", { name: /^Nudges/ })).not.toHaveClass(/text-white/);
  });

  test("names the browser tab after the page the menu calls Home", async ({ page }) => {
    await page.goto("/receivables");
    await expect(page).toHaveTitle("Home · Dueline");
  });

  test("keeps the pill on Export while the account menu is open", async ({ page }) => {
    await page.goto("/export");
    const main = page.getByRole("navigation", { name: "Main" });
    await main.getByRole("link", { name: /^Nudges/ }).dispatchEvent("pointerover", {
      pointerType: "mouse",
    });
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(main.getByRole("link", { name: "Export" })).toHaveClass(/text-white/);
    await expect(main.getByRole("link", { name: /^Nudges/ })).not.toHaveClass(/text-white/);
  });
});

test.describe("Account menu", () => {
  test("opens with the button, lists its items and closes with Escape", async ({ page }) => {
    await page.goto("/receivables");
    const button = page.getByRole("button", { name: /^Account menu/ });
    await button.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Profile" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: /^Fees and rates/ })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Lock demo" })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Simulated PayPal sandbox" }),
    ).toBeVisible();
    await expectNoSeriousViolations(page, "Account menu, open");

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("follows Profile to the profile page", async ({ page }) => {
    await page.goto("/receivables");
    await page.getByRole("button", { name: /^Account menu/ }).click();
    await page.getByRole("menuitem", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

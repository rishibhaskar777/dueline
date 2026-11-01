import { expect, test, type Page } from "@playwright/test";

async function overdueCountFromFilter(page: Page): Promise<number> {
  const button = page.getByRole("group", { name: "Filter by status" }).getByRole("button", {
    name: /^Overdue \(/,
  });
  const text = (await button.textContent()) ?? "";
  return Number(/\((\d+)\)/.exec(text)?.[1]);
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
        "Days late",
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

  test("the PayPal column is an icon link that names its invoice", async ({ page }) => {
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
      /All estimated|All from PayPal|from PayPal, ₹[\d,]+ estimated/,
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

    const input = page.getByLabel(/^FIRC or e-BRC number for invoice /).first();
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
    await expect(page.getByLabel(/^FIRC or e-BRC number for invoice /).first()).toHaveValue(
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
    await expect(card.getByLabel("Message")).not.toHaveValue("");

    await card.getByRole("button", { name: "Preview" }).click();
    const preview = card.getByRole("region", { name: "Email preview" });
    await expect(preview).toContainText("To");
    await expect(preview).toContainText("Subject");
    await expect(preview).toContainText("Pay here: ");
    await expect(preview).toContainText("PayPal's own reminder uses PayPal's standard wording");
    await expect(card.getByText(/^Average days to get paid:/)).toBeVisible();
  });
});

test.describe("First-run checklist", () => {
  test("is on Receivables and ticks from the data", async ({ page }) => {
    await page.goto("/receivables");
    const checklist = page.getByRole("region", { name: /^(Getting started|All set)$/ });
    await expect(checklist).toBeVisible();
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

test.describe("New invoice", () => {
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
    await expect(page.getByText("Conversion loss", { exact: true })).toBeVisible();
  });

  test("the paste box shows an example and says what is hidden from the AI", async ({ page }) => {
    await page.goto("/invoices/new");
    const box = page.getByRole("textbox", { name: "Client chat" });
    expect(await box.getAttribute("placeholder")).toContain("\n");
    await expect(
      page.getByText("Emails and phone numbers are hidden before the AI reads the chat."),
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
    await expect(card.getByLabel("Message")).not.toHaveValue("");
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

test.describe("Sidebar", () => {
  test("has no scrollbar on a 1536 x 711 viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 711 });
    await page.goto("/receivables");
    const aside = page.locator("aside").first();
    await expect(aside).toBeVisible();
    const overflows = await aside.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(overflows).toBe(false);
  });
});

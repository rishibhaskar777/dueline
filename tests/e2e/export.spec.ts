import { expect, test, type Download, type Locator } from "@playwright/test";
import { expectNoSeriousViolations, expectNoSidewaysScroll } from "./support";

const REGISTER_HEADER =
  "Invoice number,Client,Client country,Paid on (IST),Currency,Invoice amount,PayPal fee," +
  "Net received (foreign),Rupees received,Rupee source,Rate used,Rate date,Purpose code," +
  "Purpose description,SAC,Under LUT,PayPal transaction ID,Proof";

test.describe("Export register", () => {
  test("last month lists PayPal's payments and bank transfers, and the CSV says what proves each", async ({
    page,
  }) => {
    await page.goto("/export");
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();

    await expect(page.getByText("INV-0041").first()).toBeVisible();
    await expect(page.getByText("Halden Coffee Co.").first()).toBeVisible();
    await expect(page.getByText("INV-0043").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bank transfers" })).toBeVisible();
    await expect(page.getByLabel("FIRC or e-BRC number").first()).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download CSV for your CA" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("dueline-export-2026-10.csv");

    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const lines = text.replace(/^﻿/, "").split(/\r?\n/);

    expect(lines).toContain(REGISTER_HEADER);
    const rows = lines.filter((line) => line.startsWith("INV-"));
    expect(rows.filter((line) => line.endsWith(",PayPal FIRA"))).toHaveLength(3);
    expect(rows.filter((line) => line.endsWith(',"Bank, reference missing"'))).toHaveLength(4);
    expect(rows.filter((line) => line.endsWith(",Bank FIRC/e-BRC FIRC/2026/001"))).toHaveLength(1);
    expect(rows).toHaveLength(8);
  });

  test("the PayPal table shows full invoice numbers, dates and clients at 1024 px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/export");
    await page.getByRole("button", { name: "Previous month" }).click();
    const table = page.getByRole("region", { name: "Paid through PayPal" });
    await expect(table.getByRole("link", { name: "Open invoice INV-0041" })).toBeVisible();
    await expect(table.getByText("Halden Coffee Co.")).toBeVisible();

    const clipped = await table
      .locator(".ag-cell")
      .evaluateAll((cells) => cells.filter((cell) => cell.scrollWidth > cell.clientWidth).length);
    expect(clipped).toBe(0);
    await expectNoSidewaysScroll(page);
  });
});

async function readDownload(download: Download): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks).toString("utf8").replace(/^﻿/, "");
}

const rupeesIn = (text: string | null): number =>
  Number((/₹([\d,]+)/.exec(text ?? "") ?? [])[1]?.replaceAll(",", ""));

// "$640.00" and "CA$410.00" added up by their symbol, in cents.
function sumBySymbol(texts: string[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const text of texts) {
    const match = /^(\D+?)([\d,]+)\.(\d\d)$/.exec(text.trim());
    if (!match) continue;
    totals[match[1]] =
      (totals[match[1]] ?? 0) + Number(match[2].replaceAll(",", "")) * 100 + Number(match[3]);
  }
  return totals;
}

test.describe("Export register grids", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/export");
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
  });

  test("each grid ends with a totals row that equals the sum of its rows", async ({ page }) => {
    for (const [name, payments] of [
      ["Paid through PayPal", "3 payments"],
      ["Bank transfers", "5 payments"],
    ] as const) {
      const grid = page.getByRole("region", { name });
      const pinned = grid.locator(".ag-row-pinned");
      await expect(pinned).toContainText("Total for October 2026");
      await expect(pinned).toContainText(payments);

      const rows = grid.locator(".ag-row:not(.ag-row-pinned)");
      await expect(rows).toHaveCount(Number(payments.split(" ")[0]));
      const cells = await rows.locator('.ag-cell[col-id="inrReceived"]').allTextContents();
      const sum = cells.reduce((total, text) => total + rupeesIn(text), 0);
      expect(sum).toBeGreaterThan(0);
      expect(rupeesIn(await pinned.locator('.ag-cell[col-id="inrReceived"]').textContent())).toBe(
        sum,
      );
    }
  });

  test("the PayPal totals add the amounts, fees and net of the rows, one line for each currency", async ({
    page,
  }) => {
    const grid = page.getByRole("region", { name: "Paid through PayPal" });
    const rows = grid.locator(".ag-row:not(.ag-row-pinned)");
    const pinned = grid.locator(".ag-row-pinned");
    await expect(rows).toHaveCount(3);
    // Amount, Fee and Net are the fourth, ninth and tenth columns at this width.
    for (const column of [4, 9, 10]) {
      const cell = `[aria-colindex="${column}"]`;
      const shown = sumBySymbol(await rows.locator(cell).allTextContents());
      const total = sumBySymbol((await pinned.locator(cell).innerText()).split("\n"));
      expect(Object.keys(shown).length).toBeGreaterThan(1);
      expect(total).toEqual(shown);
    }
  });

  test("Export grid as CSV saves what the grid shows, without the totals row", async ({ page }) => {
    const grid = page.getByRole("region", { name: "Paid through PayPal" });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      grid.getByRole("button", { name: "Export grid as CSV" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("dueline-paypal-2026-10.csv");
    const lines = (await readDownload(download)).trim().split(/\r?\n/);
    expect(lines[0].replaceAll('"', "")).toBe(
      "Paid on,Invoice,Client,Amount,Rupees,Code,LUT,Transaction ID,Fee,Net",
    );
    expect(lines).toHaveLength(4);
    expect(lines.join("\n")).not.toContain("Total for");
  });

  test("the bank grid exports its own file by keyboard, with the FIRC numbers", async ({
    page,
  }) => {
    const grid = page.getByRole("region", { name: "Bank transfers" });
    const button = grid.getByRole("button", { name: "Export grid as CSV" });
    await button.focus();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.keyboard.press("Enter"),
    ]);
    expect(download.suggestedFilename()).toBe("dueline-bank-2026-10.csv");
    const text = await readDownload(download);
    expect(text.split(/\r?\n/)[0]).toContain("FIRC / e-BRC no.");
    expect(text).toContain("FIRC/2026/001");
    expect(text).not.toContain("Total for");
  });

  test("says what each export is for, and keeps the CA's download", async ({ page }) => {
    await expect(
      page.getByText(/Exports this table as shown\. For your CA, use/).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Download CSV for your CA" })).toBeVisible();
  });

  test("has no serious accessibility problems in either theme", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/export?month=2026-10");
      await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
      await expect(page.locator(".ag-row-pinned").first()).toContainText("Total for");
      await expect(page.getByRole("columnheader", { name: "Rupees" })).toHaveCount(2);
      await expectNoSeriousViolations(page, `Export register with totals, ${theme}`);
    }
  });
});

// The cells, or something inside them, whose text is wider than the room it has been given.
async function truncatedValues(grid: Locator): Promise<string[]> {
  return grid
    .locator(".ag-cell")
    .evaluateAll((cells) =>
      cells.flatMap((cell) =>
        [cell, ...cell.querySelectorAll("*")]
          .filter((node) => node.tagName !== "INPUT" && node.scrollWidth > node.clientWidth + 1)
          .map(() => `${cell.getAttribute("col-id")}: ${cell.textContent?.trim()}`),
      ),
    );
}

// Rows that start before the one above them has ended, the totals row included.
async function overlappingRows(grid: Locator): Promise<string[]> {
  return grid.locator(".ag-row").evaluateAll((rows) => {
    // A row is drawn once for each section of the grid, so each row ID is counted once.
    const once = new Map(rows.map((row) => [row.getAttribute("row-id"), row]));
    const boxes = [...once.values()]
      .map((row) => ({
        text: row.textContent?.trim().slice(0, 30) ?? "",
        box: row.getBoundingClientRect(),
      }))
      .sort((x, y) => x.box.top - y.box.top);
    return boxes.flatMap((row, index) =>
      index > 0 && row.box.top < boxes[index - 1].box.bottom - 1 ? [row.text] : [],
    );
  });
}

test.describe("Export register grids at desktop widths", () => {
  for (const width of [1280, 1440, 1920]) {
    test(`no column of either grid truncates its values at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/export?month=2026-10");
      await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
      for (const name of ["Paid through PayPal", "Bank transfers"]) {
        const grid = page.getByRole("region", { name });
        await expect(grid.locator(".ag-row-pinned")).toContainText("Total for October 2026");
        for (const header of await grid.getByRole("columnheader").all()) {
          await expect(header).toBeVisible();
        }
        // The grid settles its layout a moment after it shows, so a lasting fault is what fails.
        await expect
          .poll(() => truncatedValues(grid), { message: `${name} at ${width} px` })
          .toEqual([]);
        await expect
          .poll(() => overlappingRows(grid), { message: `${name} rows overlap at ${width} px` })
          .toEqual([]);
      }
    });
  }

  test("sorting leaves the totals row at the bottom and unchanged", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/export?month=2026-10");
    const grid = page.getByRole("region", { name: "Paid through PayPal" });
    const pinned = grid.locator(".ag-row-pinned");
    const before = await pinned.innerText();

    await grid.getByRole("columnheader", { name: "Rupees" }).click();
    await grid.getByRole("columnheader", { name: "Rupees" }).click();
    await expect(grid.getByRole("columnheader", { name: "Rupees" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(await pinned.innerText()).toBe(before);
    const bottom = (await pinned.boundingBox())?.y ?? 0;
    for (const row of await grid.locator(".ag-row:not(.ag-row-pinned)").all()) {
      expect((await row.boundingBox())?.y ?? Infinity).toBeLessThan(bottom);
    }
  });

  test("a month with no payments shows no totals and no NaN", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/export?month=2026-01");
    await expect(page.getByRole("heading", { name: "January 2026" })).toBeVisible();
    await expect(page.locator(".ag-row-pinned")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("NaN");
  });

  test("the grid CSV has the headers the grid shows", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/export?month=2026-10");
    for (const [name, file] of [
      ["Paid through PayPal", "dueline-paypal-2026-10.csv"],
      ["Bank transfers", "dueline-bank-2026-10.csv"],
    ] as const) {
      const grid = page.getByRole("region", { name });
      await expect(grid.getByRole("columnheader").first()).toBeVisible();
      const shown = await grid.getByRole("columnheader").allInnerTexts();
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        grid.getByRole("button", { name: "Export grid as CSV" }).click(),
      ]);
      expect(download.suggestedFilename()).toBe(file);
      const [header] = (await readDownload(download)).split(/\r?\n/);
      expect(header.replaceAll('"', "").split(",")).toEqual(shown.map((text) => text.trim()));
    }
  });
});

import { expect, test } from "@playwright/test";

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
    expect(rows).toHaveLength(7);
  });
});

import { expect, test } from "@playwright/test";
import { expectNoSeriousViolations, openInTheme } from "./support";

interface InvoiceList {
  invoices: { id: string; number: string; paypalStatus: string }[];
}

async function openInvoiceId(request: import("@playwright/test").APIRequestContext) {
  const list = (await (await request.get("/api/invoices")).json()) as InvoiceList;
  const open = list.invoices.find(
    ({ paypalStatus }) => paypalStatus === "SENT" || paypalStatus === "UNPAID",
  );
  if (!open) throw new Error("No open invoice in the offline story");
  return open;
}

test.describe("Printable tax invoice", () => {
  test("Download PDF opens the print page in a new tab and asks the browser to print once", async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => {
      const counter = window as unknown as { printCalls: number };
      counter.printCalls = 0;
      window.print = () => {
        counter.printCalls += 1;
      };
    });
    const invoice = await openInvoiceId(page.request);
    await page.goto(`/invoices/${encodeURIComponent(invoice.id)}`);

    const popupPromise = context.waitForEvent("page");
    await page.getByRole("link", { name: /Download PDF/ }).click();
    const popup = await popupPromise;

    await expect(popup.getByRole("heading", { name: "Tax invoice" })).toBeVisible();
    await expect(popup.getByText(invoice.number).first()).toBeVisible();
    await expect(popup.getByText("Place of supply")).toBeVisible();
    await expect(popup.getByText("Outside India")).toBeVisible();
    await expect(popup.getByRole("button", { name: "Print or save as PDF" })).toBeEnabled();
    await expect
      .poll(() => popup.evaluate(() => (window as unknown as { printCalls: number }).printCalls))
      .toBe(1);
    await popup.getByRole("button", { name: "Print or save as PDF" }).click();
    expect(
      await popup.evaluate(() => (window as unknown as { printCalls: number }).printCalls),
    ).toBe(2);
  });

  test("fits one A4 page and has no serious accessibility problems in either theme", async ({
    page,
  }) => {
    const invoice = await openInvoiceId(page.request);
    const path = `/invoices/${encodeURIComponent(invoice.id)}/print`;
    for (const theme of ["light", "dark"] as const) {
      await openInTheme(page, theme, path);
      await expect(page.getByRole("heading", { name: "Tax invoice" })).toBeVisible();
      await expectNoSeriousViolations(page, `Print page, ${theme}`);
    }
    // Set the width before loading: a page resized while open keeps sizes measured at the old width.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Tax invoice" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const wide = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter(
          (element) =>
            !element.closest(".dl-backdrop") && element.getBoundingClientRect().right > 360,
        )
        .map(
          (element) =>
            `${element.tagName}.${String(element.className).slice(0, 40)} ${Math.round(element.getBoundingClientRect().right)} ${(element.textContent ?? "").slice(0, 30)}`,
        ),
    );
    expect(wide, "elements wider than a 360 px screen").toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );

    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages).toHaveLength(1);
  });
});

import { expect, test } from "@playwright/test";

test.describe("Reset the demo", () => {
  test("seeds the story on its own dates: Activity shows old dates, no test invoice, and the print page has the address", async ({
    page,
  }) => {
    await page.goto("/demo-tools");
    await page.getByRole("button", { name: "Reset the demo" }).click();
    await page.getByRole("button", { name: "Yes, reset the demo" }).click();
    await expect(page.getByText(/^Demo reset:/)).toBeVisible();

    await page.goto("/receivables");
    const activity = page.getByRole("region", { name: "Activity" });
    await expect(activity).toContainText("sent to Okafor & Reyes");

    // Activity shows the newest six until asked for all; the story's first invoices were sent more
    // than 7 days ago, so they read as dates.
    await activity.getByRole("button", { name: /^Show all/ }).click();
    const times = await activity.locator("time").allTextContents();
    expect(times.filter((text) => /^\d{1,2} [A-Z][a-z]{2}$/.test(text)).length).toBeGreaterThan(6);
    expect(times.some((text) => /hour|minute|just now/.test(text))).toBe(false);

    await expect(page.getByText("Sandbox check")).toHaveCount(0);

    // A demo profile saved before the address existed is upgraded by the reset.
    const list = (await (await page.request.get("/api/invoices")).json()) as {
      invoices: { id: string }[];
    };
    await page.goto(`/invoices/${encodeURIComponent(list.invoices[0].id)}/print`);
    await expect(page.getByText("12 Brigade Road, Bengaluru 560001, Karnataka")).toBeVisible();
  });
});

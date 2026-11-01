import { expect, test } from "@playwright/test";

test.describe("Reset the demo", () => {
  test("seeds the story on its own dates: Activity shows old dates and no test invoice", async ({
    page,
  }) => {
    await page.goto("/demo-tools");
    await page.getByRole("button", { name: "Reset the demo" }).click();
    await page.getByRole("button", { name: "Yes, reset the demo" }).click();
    await expect(page.getByText(/^Demo reset:/)).toBeVisible();

    await page.goto("/receivables");
    const activity = page.getByRole("region", { name: "Activity" });
    await expect(activity).toContainText("sent to Okafor & Reyes");

    // The story's first invoices were sent more than 7 days ago, so they read as dates.
    const times = await activity.locator("time").allTextContents();
    expect(times.filter((text) => /^\d{1,2} [A-Z][a-z]{2}$/.test(text)).length).toBeGreaterThan(6);
    expect(times.some((text) => /hour|minute|just now/.test(text))).toBe(false);

    await expect(page.getByText("Sandbox check")).toHaveCount(0);
  });
});

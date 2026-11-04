import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations, openInTheme } from "./support";

// The offline story keeps Northpine Studio due in 3 days, so the Due soon section always has its card.
const dueSoonCard = (page: Page) =>
  page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Northpine Studio" }) });

async function setHeadsUp(page: Page, on: boolean, days: string): Promise<void> {
  await page.goto("/profile");
  const toggle = page.getByRole("switch", { name: "Send a heads-up before the due date" });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) await toggle.click();
  if (on) await page.getByLabel("Days before").fill(days);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
}

test.describe("Heads-up before the due date", () => {
  test("Due soon sits above the late invoices with its own count, and the tab count stays the late ones", async ({
    page,
  }) => {
    await page.goto("/nudges");
    const heading = page.getByRole("heading", { name: /^Due soon/ });
    await expect(heading).toContainText("1");
    const card = dueSoonCard(page);
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Due in 3 days");
    await expect(card).toContainText(
      "Suggested heads-up: due in 3 days, and no heads-up sent yet.",
    );
    await expect(card.getByRole("group", { name: "Tone" })).toHaveCount(0);

    const lateCards = page.getByRole("group", { name: "Tone" });
    await expect(lateCards.first()).toBeVisible();
    const headingBox = await heading.boundingBox();
    const lateBox = await lateCards.first().boundingBox();
    expect(headingBox?.y ?? 0).toBeLessThan(lateBox?.y ?? 0);

    const late = await lateCards.count();
    await expect(page.getByRole("link", { name: /^Nudges/ })).toContainText(String(late));
  });

  test("the draft is friendly, greets the contact and says thank you once", async ({ page }) => {
    await page.goto("/nudges");
    const message = dueSoonCard(page).getByLabel("Message", { exact: true });
    await expect(message).toHaveValue(/^Hi Dan,\n\n/);
    await expect(message).toHaveValue(
      /A quick note that invoice INV-\d+ for CAD [\d.]+ \(.+\) is due on /,
    );
    await expect(message).not.toHaveValue(/overdue|late|deadline/i);
    expect(((await message.inputValue()).match(/thank you/gi) ?? []).length).toBe(1);
    await expect(dueSoonCard(page).getByLabel("Subject")).toHaveValue(
      /^A quick note about invoice/,
    );
  });

  test("Copy message and Preview work, and nothing is sent", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    let sends = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/reminders/send")) sends += 1;
    });
    await page.goto("/nudges");
    const card = dueSoonCard(page);

    await card.getByRole("button", { name: "Copy message" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Hi Dan,");
    expect(copied).toMatch(/Pay here: \S+/);

    await card.getByRole("button", { name: "Preview" }).click();
    const preview = card.getByRole("region", { name: "Email preview" });
    await expect(preview).toContainText("Subject");
    await expect(preview).toContainText("A quick note about invoice");
    await expect(card.getByRole("button", { name: "I sent it" })).toBeVisible();
    expect(sends).toBe(0);
  });

  test("when PayPal refuses the reminder, the card says so and offers only its own message", async ({
    page,
  }) => {
    const refusal = "PayPal only sends its reminder once an invoice is due. Use Send my message.";
    await page.route("**/api/reminders/send", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "invalid_state", message: refusal } }),
      }),
    );
    await page.goto("/nudges");
    const card = dueSoonCard(page);

    await card.getByRole("button", { name: "Send PayPal reminder" }).click();

    await expect(card.getByRole("status").filter({ hasText: refusal })).toBeVisible();
    await expect(card.getByRole("button", { name: "Send PayPal reminder" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Copy message" })).toBeEnabled();
    await expect(card.getByRole("alert")).toHaveCount(0);
  });

  test("has no serious accessibility problems in either theme", async ({ page }) => {
    for (const theme of ["light", "dark"] as const) {
      await openInTheme(page, theme, "/nudges");
      await expect(page.getByRole("heading", { name: /^Due soon/ })).toBeVisible();
      await expectNoSeriousViolations(page, `Nudges with Due soon, ${theme}`);
    }
  });

  test("turning the profile switch off hides the section, and fewer days before leave it out", async ({
    page,
  }) => {
    try {
      await setHeadsUp(page, false, "3");
      await page.goto("/nudges");
      await expect(page.getByRole("group", { name: "Tone" }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /^Due soon/ })).toHaveCount(0);

      await setHeadsUp(page, true, "2");
      await page.goto("/nudges");
      await expect(page.getByRole("group", { name: "Tone" }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /^Due soon/ })).toHaveCount(0);

      await setHeadsUp(page, true, "3");
      await page.goto("/nudges");
      await expect(page.getByRole("heading", { name: /^Due soon/ })).toBeVisible();
    } finally {
      await setHeadsUp(page, true, "3");
    }
  });

  test("Days before refuses a number outside 1 to 7", async ({ page }) => {
    await page.goto("/profile");
    await page.getByLabel("Days before").fill("9");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Use a whole number from 1 to 7")).toBeVisible();
  });
});

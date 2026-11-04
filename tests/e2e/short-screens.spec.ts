import { expect, test, type Locator, type Page } from "@playwright/test";
import { KRAFTWERK_CHAT } from "../support/kraftwerk-chat";

async function reviewKraftwerk(page: Page): Promise<void> {
  await page.goto("/invoices/new");
  await page.getByRole("textbox", { name: "Client chat" }).fill(KRAFTWERK_CHAT);
  await page.getByRole("button", { name: "Draft invoice" }).click();
  await expect(page.getByLabel("Client name")).toHaveValue("Kraftwerk Studio");
}

async function expectInViewAndClickable(page: Page, button: Locator, label: string): Promise<void> {
  const height = page.viewportSize()?.height ?? 0;
  await expect
    .poll(async () => {
      const found = await button.boundingBox();
      return found && found.y >= 0 ? found.y + found.height : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(height);
  const box = await button.boundingBox();
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent ?? null,
    { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 },
  );
  expect(hit).toBe(label);
  await expect(button).toBeEnabled();
}

// On a short laptop screen the summary is taller than the window. The create button has to stay in
// reach while the form is read and at its end, whether the summary shows one invoice or a deposit
// and a balance.
test.describe("the create button on a short screen", () => {
  for (const [width, height] of [
    [1366, 650],
    [1280, 720],
  ]) {
    for (const split of [true, false]) {
      test(`is in view and clickable at ${width} x ${height} ${split ? "with" : "without"} the split`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await reviewKraftwerk(page);
        if (!split) {
          await page
            .getByRole("group", { name: "Ask for part upfront" })
            .getByRole("button", { name: "Off" })
            .click();
        }
        const label = split ? "Create deposit and save balance" : "Create and send invoice";
        const button = page.getByRole("button", { name: label });

        await page.mouse.wheel(0, 450);
        await expectInViewAndClickable(page, button, label);

        await page.keyboard.press("End");
        await page.mouse.wheel(0, 10_000);
        await expectInViewAndClickable(page, button, label);
      });
    }
  }
});

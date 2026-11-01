import { expect, test } from "@playwright/test";

test.describe("Nudges", () => {
  test("a reminder card loads with a subject, a message and a send button", async ({ page }) => {
    await page.goto("/nudges");

    await expect(page.getByLabel("Subject").first()).not.toHaveValue("");
    await expect(page.getByLabel("Message").first()).not.toHaveValue("");
    await expect(
      page.getByRole("button", { name: "Send reminder through PayPal" }).first(),
    ).toBeEnabled();
    await expect(page.getByText("Template draft (AI unavailable).").first()).toBeVisible();
  });

  test("switching tone after an edit asks before replacing the text", async ({ page }) => {
    await page.goto("/nudges");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Subject") })
      .first();
    const message = card.getByLabel("Message");
    const final = card.getByRole("group", { name: "Tone" }).getByRole("button", { name: /^Final/ });
    await expect(message).not.toHaveValue("");

    const edited = "My own words, kept unless I say otherwise.";
    await message.fill(edited);
    await final.click();

    const prompt = card.getByRole("group", { name: "Replace your edits" });
    await expect(prompt).toContainText("Replace your edits with a Final draft?");
    await prompt.getByRole("button", { name: "Keep editing" }).click();
    await expect(prompt).toHaveCount(0);
    await expect(message).toHaveValue(edited);

    await final.click();
    await prompt.getByRole("button", { name: "Replace" }).click();
    await expect(message).not.toHaveValue(edited);
    await expect(final).toHaveAttribute("aria-pressed", "true");
  });
});

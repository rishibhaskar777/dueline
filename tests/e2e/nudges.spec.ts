import { expect, test } from "@playwright/test";

test.describe("Nudges", () => {
  test("a reminder card loads with a subject, a message and a send button", async ({ page }) => {
    await page.goto("/nudges");

    await expect(page.getByLabel("Subject").first()).not.toHaveValue("");
    await expect(page.getByLabel("Message").first()).not.toHaveValue("");
    await expect(page.getByRole("button", { name: "Send PayPal reminder" }).first()).toBeEnabled();
    await expect(page.getByText("Template draft (AI unavailable).").first()).toBeVisible();
  });

  test("a late payer's first nudge is firm, and the card says which facts led to it", async ({
    page,
  }) => {
    await page.goto("/nudges");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Subject") })
      .first();

    await expect(card).toContainText("Suggested firm: 7 days late, and late on 3 of 3 invoices.");
    await expect(
      card.getByRole("group", { name: "Tone" }).getByRole("button", { name: /^Firm/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(card.getByLabel("Message")).not.toHaveValue(/\n{3}/);
    await expect(card.getByLabel("Message")).not.toHaveValue(/last reminder|gently/i);
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

  test("each card offers PayPal's reminder and the freelancer's own message, honestly described", async ({
    page,
  }) => {
    await page.goto("/nudges");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Subject") })
      .first();

    await expect(card.getByRole("button", { name: "Send PayPal reminder" })).toBeEnabled();
    await expect(card).toContainText(
      "PayPal emails its standard reminder with a Pay now button. PayPal writes the wording.",
    );
    await expect(card).toContainText("Send my message");
    await expect(card).toContainText("sandbox buyer");

    const mailto = await card.getByRole("link", { name: "Open in email app" }).getAttribute("href");
    expect(mailto).toMatch(/^mailto:[^?]+%40personal\.example\.com\?subject=/);
    expect(mailto).toContain("%0D%0A");
    const body = decodeURIComponent(mailto ?? "");
    expect(body).toContain("Pay here: ");
    // The sign-off closes the message: something follows the pay link after a blank line.
    expect(body.split("Pay here: ")[1]).toMatch(/^\S+\r\n\r\n\S/);

    const gmail = await card.getByRole("link", { name: "Open in Gmail" }).getAttribute("href");
    expect(gmail).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=[^&]+%40personal/);

    // Opening or copying records nothing; the button that does only appears afterwards.
    await expect(card.getByRole("button", { name: "I sent it" })).toHaveCount(0);
  });

  test("copying the message and pressing I sent it records an email in the reminder history", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/nudges");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Subject") })
      .nth(1);

    await card.getByRole("button", { name: "Copy message" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/Pay here: \S+\r?\n\r?\n\S/);

    await card.getByRole("button", { name: "I sent it" }).click();
    await expect(card.getByText(/Recorded at/)).toContainText(
      "you sent your message from your own email",
    );
    await expect(card).toContainText("message sent from your email");

    // One of each a day: the email is used, so PayPal's reminder is still open.
    await expect(
      card.getByText("A message from your email was already recorded today."),
    ).toBeVisible();
    await expect(card.getByRole("button", { name: "Copy message" })).toBeDisabled();
    const paypal = card.getByRole("button", { name: "Send PayPal reminder" });
    await expect(paypal).toBeEnabled();

    await paypal.click();
    await expect(card.getByText(/Sent at .*standard reminder/)).toBeVisible();
    await expect(card).toContainText("have both gone out for this invoice today");
    await expect(paypal).toBeDisabled();
  });

  test("a PayPal reminder leaves the message to the client's email open, and a reload keeps the card closed once both went out", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/nudges");
    const cards = page.getByRole("listitem").filter({ has: page.getByLabel("Subject") });
    const card = cards.first();

    await card.getByRole("button", { name: "Send PayPal reminder" }).click();
    await expect(card.getByText(/Sent at .*standard reminder/)).toBeVisible();
    await expect(card.getByText("A PayPal reminder was already sent today.")).toBeVisible();
    await expect(card.getByRole("button", { name: "Send PayPal reminder" })).toBeDisabled();
    await expect(card.getByRole("button", { name: "Copy message" })).toBeEnabled();

    await card.getByRole("button", { name: "Copy message" }).click();
    await card.getByRole("button", { name: "I sent it" }).click();
    await expect(card).toContainText("have both gone out for this invoice today");

    await page.reload();
    await expect(cards.first()).toContainText("have both gone out for this invoice today");
    await expect(cards.first().getByRole("button", { name: "Copy message" })).toBeDisabled();
  });
});

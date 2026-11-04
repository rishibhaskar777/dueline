import { expect, test } from "@playwright/test";

interface Listed {
  id: string;
  number: string;
  paypalStatus: string;
  issuedOn: string;
  dueOn: string;
  client: { name: string };
}

// The offline demo starts with a balance invoice saved ten days before the demo date (4 November
// 2026) with a due date two weeks after that. The file is named to run before the demo reset, which
// deletes old drafts, and the invoice is cancelled at the end so no other screen counts it.
test.describe("a balance saved days ago", () => {
  test("is dated with the sending day, with the same days to pay", async ({ page }) => {
    const listed = await page.request.get("/api/invoices");
    const { readyToSend } = (await listed.json()) as { readyToSend: Listed[] };
    const balance = readyToSend.find(({ client }) => client.name === "Larkspur Interiors");
    if (!balance) throw new Error("The offline demo has no saved balance");
    expect(balance).toMatchObject({ issuedOn: "2026-10-25", dueOn: "2026-11-08" });

    await page.goto("/receivables");
    await page
      .getByRole("region", { name: "Ready to send" })
      .getByRole("button", { name: `Send balance for invoice ${balance.number}` })
      .click();
    await expect(
      page.getByRole("button", { name: `Send balance for invoice ${balance.number}` }),
    ).toHaveCount(0);

    const sent = await page.request.get(`/api/invoices/${encodeURIComponent(balance.id)}`);
    const { invoice } = (await sent.json()) as { invoice: Listed };
    expect(invoice).toMatchObject({
      paypalStatus: "SENT",
      issuedOn: "2026-11-04",
      dueOn: "2026-11-18",
    });

    const cancelled = await page.request.post(
      `/api/invoices/${encodeURIComponent(balance.id)}/cancel`,
      { data: { requestId: crypto.randomUUID() } },
    );
    expect(cancelled.ok()).toBe(true);
  });
});

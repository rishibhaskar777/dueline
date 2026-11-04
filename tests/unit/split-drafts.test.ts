import { describe, expect, it } from "vitest";
import { balanceDraft, depositDraft, planSplit } from "@/lib/invoices/split-drafts";
import type { CreateSplitRequest } from "@/types";

const draft: CreateSplitRequest["draft"] = {
  client: { name: "Kraftwerk Studio", email: "buyer@personal.example.com" },
  currency: "EUR",
  dueOn: "2026-11-30",
  items: [
    { name: "Logo final files", quantity: 1, unitAmount: "400.00", sac: "998314" },
    { name: "Business card designs", quantity: 2, unitAmount: "90.00", sac: "998314" },
    { name: "Brand guideline PDF", quantity: 1, unitAmount: "650.00", sac: "998314" },
  ],
  note: "Thanks for the work.",
  purposeCode: "P1007",
  includeLutNote: true,
};

describe("deposit and balance invoices", () => {
  const plan = planSplit(draft, 50);

  it("splits the item total so the parts add up", () => {
    expect(plan?.deposit).toEqual({ currency: "EUR", value: "615.00" });
    expect(plan?.balance).toEqual({ currency: "EUR", value: "615.00" });
    expect(
      planSplit(
        { ...draft, items: [{ ...draft.items[0], unitAmount: "1000.01", quantity: 1 }] },
        33,
      ),
    ).toMatchObject({
      deposit: { value: "330.00" },
      balance: { value: "670.01" },
    });
    expect(planSplit(draft, 100)).toBeNull();
  });

  it("makes the deposit one line for the whole job, keeping the SAC, purpose code and LUT", () => {
    if (!plan) throw new Error("no plan");
    const deposit = depositDraft(draft, plan, "2026-11-11");
    expect(deposit.items).toEqual([
      {
        name: "Deposit (50%) for: Logo final files, Business card designs, Brand guideline PDF",
        quantity: 1,
        unitAmount: "615.00",
        sac: "998314",
      },
    ]);
    expect(deposit).toMatchObject({
      dueOn: "2026-11-11",
      purposeCode: "P1007",
      includeLutNote: true,
      note: "Thanks for the work.",
    });
  });

  it("makes the balance mirror it, and says what was invoiced and for what work", () => {
    if (!plan) throw new Error("no plan");
    const balance = balanceDraft(draft, plan, "2026-11-30", "INV-0050");
    expect(balance.items[0]).toMatchObject({
      name: "Balance (50%) for: Logo final files, Business card designs, Brand guideline PDF",
      unitAmount: "615.00",
    });
    expect(balance.dueOn).toBe("2026-11-30");
    expect(balance.note).toContain("Thanks for the work.");
    expect(balance.note).toContain("Deposit of €615.00 invoiced on INV-0050.");
    expect(balance.note).toContain(
      "Full work: Logo final files (1 × €400.00), Business card designs (2 × €90.00), Brand guideline PDF (1 × €650.00).",
    );
    // No negative lines or discounts: it is a complete invoice for its own value.
    expect(balance.items).toHaveLength(1);
  });

  it("shortens the line name to PayPal's 200 characters, naming how many items were left out", () => {
    if (!plan) throw new Error("no plan");
    const many = {
      ...draft,
      items: Array.from({ length: 20 }, (_, index) => ({
        name: `Illustration number ${index + 1} for the book`,
        quantity: 1,
        unitAmount: "10.00",
        sac: null,
      })),
    };
    const long = planSplit(many, 30);
    if (!long) throw new Error("no plan");
    const name = depositDraft(many, long, "2026-11-11").items[0].name;
    expect(name.length).toBeLessThanOrEqual(200);
    expect(name).toMatch(
      /^Deposit \(30%\) for: Illustration number 1 for the book.* and \d+ more$/,
    );
  });
});

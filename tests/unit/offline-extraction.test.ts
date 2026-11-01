import { describe, expect, it } from "vitest";
import { checkModelDraft } from "@/lib/ai/check-draft";
import { offlineModelDraft } from "@/lib/ai/offline-extraction";
import { maskContacts } from "@/lib/privacy/mask";
import { SAMPLE_CHAT } from "@/components/invoices/sample-chat";

const TODAY = "2026-11-04";

function draftFrom(chat: string) {
  return offlineModelDraft(maskContacts(chat).masked, TODAY);
}

describe("offlineModelDraft", () => {
  it("reads the sample chat: client, email placeholder, currency, items and quantities", () => {
    expect(draftFrom(SAMPLE_CHAT)).toMatchObject({
      clientName: "Halden Coffee Co.",
      clientEmail: "[EMAIL_1]",
      currency: "USD",
      // The chat gives a delivery date, which is not a payment date.
      dueOn: null,
      items: [
        { name: "Logos", quantity: 3, unitAmount: "120", sourceQuote: "Logos for $120 each" },
        { name: "Revisions", quantity: 2, unitAmount: "45", sourceQuote: "revisions $45 a round" },
      ],
      purposeCode: "P1099",
    });
  });

  it("gives items that pass every check in code", () => {
    const chat = SAMPLE_CHAT;
    const contacts = maskContacts(chat);
    const { draft, warnings } = checkModelDraft(offlineModelDraft(contacts.masked, TODAY), {
      chat,
      contacts,
      today: TODAY,
    });
    expect(draft.client).toEqual({ name: "Halden Coffee Co.", email: "mike@haldencoffee.example" });
    expect(draft.items.map((item) => [item.quantity, item.unitAmount])).toEqual([
      [3, "120.00"],
      [2, "45.00"],
    ]);
    expect(warnings).toEqual([
      "No payment terms in the chat; due date set to 14 days from today. Change it if needed.",
    ]);
  });

  it("reads a quantity written before the item and the price after it", () => {
    const chat = "Acme Ltd here. We need 5 hours of consulting at €40 an hour, net 15.";
    const draft = draftFrom(chat);
    expect(draft.currency).toBe("EUR");
    expect(draft.dueOn).toBe("2026-11-19");
    expect(draft.items).toEqual([
      {
        name: "Hours of consulting",
        quantity: 5,
        unitAmount: "40",
        sourceQuote: "We need 5 hours of consulting at €40 an hour",
      },
    ]);
  });

  it("takes a name after the price and one of each when no count is given", () => {
    const draft = draftFrom("Mia (Northwind Co.): I can pay £450 for the landing page.");
    expect(draft.clientName).toBe("Northwind Co.");
    expect(draft.currency).toBe("GBP");
    expect(draft.items).toMatchObject([{ name: "Landing page", quantity: 1, unitAmount: "450" }]);
  });

  it("recognises Canadian and Australian dollars before plain dollars", () => {
    expect(draftFrom("Logo design CA$300").currency).toBe("CAD");
    expect(draftFrom("Logo design A$300").currency).toBe("AUD");
    expect(draftFrom("Logo design 300 USD").currency).toBe("USD");
  });

  it("reads thousands separators and an explicit payment date", () => {
    const draft = draftFrom("Brand book, $1,200.50. Payment due on 2026-12-01.");
    expect(draft.items[0].unitAmount).toBe("1200.50");
    expect(draft.dueOn).toBe("2026-12-01");
  });

  it("matches software and marketing work to their purpose codes", () => {
    expect(draftFrom("Build the mobile app for $5000").purposeCode).toBe("P0802");
    expect(draftFrom("Social media campaign for $800").purposeCode).toBe("P1007");
    expect(draftFrom("Odd jobs for $20").purposeCode).toBeNull();
  });

  it("finds no items, and no currency, in a chat without prices", () => {
    const draft = draftFrom("Hi! Can we talk about a logo next week?");
    expect(draft.items).toEqual([]);
    expect(draft.currency).toBeNull();
    expect(draft.dueOn).toBeNull();
  });
});

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
    expect(draft.client).toEqual({
      name: "Halden Coffee Co.",
      email: "mike@haldencoffee.example",
      contactName: "Mike",
    });
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

const KRAFTWERK = [
  "[28/10/26, 9:14 PM] Lena Fischer (Kraftwerk Studio): Hi! Loved the moodboard. Can you do the full brand kit?",
  "[28/10/26, 9:16 PM] Lena Fischer (Kraftwerk Studio): So: logo final files, 2 business card designs, and a 10 page brand guideline PDF",
  "[28/10/26, 9:20 PM] Riya: Sure. Logo files €400, business cards €90 each, guideline €650. Total €1,230",
  "[28/10/26, 9:22 PM] Lena Fischer (Kraftwerk Studio): Perfect. Can we do 50% now and rest on delivery? Payment in 15 days is fine for us",
].join("\n");

const KRAFTWERK_ANDROID = KRAFTWERK.replace(/\[28\/10\/26, (\d+):(\d+) PM\] /g, (_m, h, min) => {
  return `28/10/2026, ${Number(h) + 12}:${min} - `;
});

describe("offlineModelDraft with a WhatsApp export", () => {
  it.each([
    ["iOS", KRAFTWERK],
    ["Android", KRAFTWERK_ANDROID],
  ])(
    "reads the client, the person, the items and the payment terms from the %s format",
    (_n, chat) => {
      expect(KRAFTWERK_ANDROID).toContain("21:14 - Lena Fischer");
      const draft = offlineModelDraft(maskContacts(chat).masked, TODAY, "Riya Sharma");
      expect(draft).toMatchObject({
        clientName: "Kraftwerk Studio",
        clientContactName: "Lena Fischer",
        currency: "EUR",
        dueOn: "2026-11-19",
        paymentTerms: {
          upfrontPercent: 50,
          note: null,
          quote: "Can we do 50% now and rest on delivery?",
        },
      });
      expect(draft.items.map((item) => [item.name, item.quantity, item.unitAmount])).toEqual([
        ["Logo files", 1, "400"],
        ["Business cards", 2, "90"],
        ["Guideline", 1, "650"],
      ]);
    },
  );

  it("gives items and payment terms that pass every check against the original chat", () => {
    const contacts = maskContacts(KRAFTWERK);
    const { draft, warnings, paymentTerms } = checkModelDraft(
      offlineModelDraft(contacts.masked, TODAY, "Riya Sharma"),
      { chat: KRAFTWERK, contacts, today: TODAY },
    );
    expect(draft.client).toEqual({
      name: "Kraftwerk Studio",
      email: "",
      contactName: "Lena Fischer",
    });
    expect(draft.items).toHaveLength(3);
    expect(warnings).toEqual(["No client email found"]);
    expect(paymentTerms).toEqual({
      upfrontPercent: 50,
      note: null,
      quote: "Can we do 50% now and rest on delivery?",
    });
  });

  it.each(["Riya Sharma (Riya Sharma Design)", "Riya (Riya Design)"])(
    "never takes the freelancer for the client, by full name or first word: %s",
    (own) => {
      const chat = [
        `${own}: Hello, I will invoice you.`,
        "Lena Fischer (Kraftwerk Studio): Great, logo is €400.",
      ].join("\n");
      expect(offlineModelDraft(chat, TODAY, "Riya Sharma")).toMatchObject({
        clientName: "Kraftwerk Studio",
        clientContactName: "Lena Fischer",
      });
    },
  );

  it("does not make an item of a line that adds the others up", () => {
    const draft = offlineModelDraft("Logo €400, cards €90 each. Total €490", TODAY);
    expect(draft.items.map((item) => item.unitAmount)).toEqual(["400", "90"]);
  });

  it("reads a quantity from a count of things but not from a count of pages", () => {
    const draft = offlineModelDraft(
      "We need 2 business cards and a 10 page guideline. Cards €90 each, guideline €650.",
      TODAY,
    );
    expect(draft.items.map((item) => [item.name, item.quantity])).toEqual([
      ["Cards", 2],
      ["Guideline", 1],
    ]);
  });
});

describe("offlineModelDraft payment terms", () => {
  it.each([
    ["50% now", 50],
    ["30% upfront", 30],
    ["20 % in advance", 20],
    ["25% advance", 25],
    ["half now", 50],
    ["Half upfront", 50],
  ])("finds %s", (words, percent) => {
    const draft = offlineModelDraft(`Client: Logo €400. Is ${words} okay? Thanks`, TODAY);
    expect(draft.paymentTerms).toMatchObject({ upfrontPercent: percent });
    expect(draft.paymentTerms?.quote).toContain(words);
  });

  it.each(["Payment in 15 days is fine", "50% of the work is done", "Logo €400, net 30"])(
    "finds nothing in %j",
    (chat) => {
      expect(offlineModelDraft(chat, TODAY).paymentTerms).toBeNull();
    },
  );
});

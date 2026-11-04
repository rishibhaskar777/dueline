import { describe, expect, it } from "vitest";
import { currencyNotices, isCurrencyNoticeText } from "@/lib/invoices/chat-currency";
import { checkModelDraft, type ModelDraft } from "@/lib/ai/check-draft";
import { KRAFTWERK_CHAT } from "../support/kraftwerk-chat";

const RUPEES_TEXT =
  "This chat mentions rupees. Export invoices through PayPal are billed in the client's currency.";

describe("currencyNotices", () => {
  it("says nothing when the chat and the form agree, or the chat names no money", () => {
    expect(currencyNotices("Logo for €400", "EUR")).toEqual([]);
    expect(currencyNotices("Logo for 400 euros", "EUR")).toEqual([]);
    expect(currencyNotices("Can you start on Monday?", "USD")).toEqual([]);
  });

  it("offers the currency the chat names when the form uses another", () => {
    expect(currencyNotices("Logo for €400", "USD")).toEqual([
      { text: "The chat mentions € but this invoice is in USD", suggest: "EUR" },
    ]);
    expect(currencyNotices("Logo for 400 pounds", "USD")).toEqual([
      { text: "The chat mentions £ but this invoice is in USD", suggest: "GBP" },
    ]);
    expect(currencyNotices("Fee: 500 GBP", "EUR")[0]).toMatchObject({ suggest: "GBP" });
    expect(currencyNotices("Fee: 500 EUR", "USD")[0]).toMatchObject({ suggest: "EUR" });
  });

  it("reads the Kraftwerk chat as euros, so changing the select to USD raises the notice", () => {
    expect(currencyNotices(KRAFTWERK_CHAT, "EUR")).toEqual([]);
    expect(currencyNotices(KRAFTWERK_CHAT, "USD")).toEqual([
      { text: "The chat mentions € but this invoice is in USD", suggest: "EUR" },
    ]);
  });

  it("says nothing when the chat names more than one currency", () => {
    expect(currencyNotices("€400 now, or $450 if you prefer", "GBP")).toEqual([]);
  });

  it("tells the symbols of the dollar currencies apart", () => {
    expect(currencyNotices("Logo for C$400", "USD")[0]).toMatchObject({
      text: "The chat mentions C$ but this invoice is in USD",
      suggest: "CAD",
    });
    expect(currencyNotices("Logo for CA$400", "USD")[0]).toMatchObject({ suggest: "CAD" });
    expect(currencyNotices("Logo for A$400", "USD")[0]).toMatchObject({ suggest: "AUD" });
    expect(currencyNotices("Logo for 400 Canadian dollars", "USD")[0]).toMatchObject({
      suggest: "CAD",
    });
    expect(currencyNotices("Logo for 400 AUD", "CAD")[0]).toMatchObject({ suggest: "AUD" });
  });

  it("does not guess from a bare $ when the form is already a dollar currency", () => {
    expect(currencyNotices("Logo for $400", "USD")).toEqual([]);
    expect(currencyNotices("Logo for $400", "CAD")).toEqual([]);
    expect(currencyNotices("Logo for $400", "AUD", "US")).toEqual([]);
  });

  it("suggests CAD or AUD for a bare $ when the client is in Canada or Australia", () => {
    expect(currencyNotices("Logo for $400", "USD", "CA")).toEqual([
      { text: "The chat mentions $ but this invoice is in USD", suggest: "CAD" },
    ]);
    expect(currencyNotices("Logo for $400", "USD", "AU")[0]).toMatchObject({ suggest: "AUD" });
    expect(currencyNotices("Logo for $400", "CAD", "CA")).toEqual([]);
  });

  it("offers USD for a bare $ when the form is not in dollars", () => {
    expect(currencyNotices("Logo for $400", "EUR")[0]).toMatchObject({ suggest: "USD" });
  });

  it("explains rupees instead of offering a currency", () => {
    expect(currencyNotices("Budget is ₹50,000", "USD")).toEqual([{ text: RUPEES_TEXT }]);
    expect(currencyNotices("Budget is 50000 INR", "USD")).toEqual([{ text: RUPEES_TEXT }]);
    expect(currencyNotices("Budget is 50000 rupees", "USD")).toEqual([{ text: RUPEES_TEXT }]);
  });

  it("says nothing about rupees when the prices are in another currency", () => {
    expect(currencyNotices("Logo for €400, that's about ₹80k for you", "EUR")).toEqual([]);
    expect(currencyNotices("Fee is $500, roughly 41,000 rupees", "USD")).toEqual([]);
    expect(currencyNotices("£300 now. In INR that is about 31000", "GBP")).toEqual([]);
    expect(currencyNotices("Logo for €400, about ₹80k", "USD")).toEqual([
      { text: "The chat mentions € but this invoice is in USD", suggest: "EUR" },
    ]);
  });

  it("says nothing for the word alone, without a price in rupees", () => {
    expect(currencyNotices("Do you want it in rupees or dollars?", "USD")).toEqual([]);
    expect(currencyNotices("Rupees are fine by me", "USD")).toEqual([]);
  });

  it("warns for prices written as Rs, INR or after the number", () => {
    expect(currencyNotices("Logo is Rs. 4,000", "USD")).toEqual([{ text: RUPEES_TEXT }]);
    expect(currencyNotices("Logo is 4000 rupees", "USD")).toEqual([{ text: RUPEES_TEXT }]);
    expect(currencyNotices("Total INR 12,500", "EUR")).toEqual([{ text: RUPEES_TEXT }]);
  });

  it("recognises its own notice text", () => {
    expect(isCurrencyNoticeText(RUPEES_TEXT)).toBe(true);
    expect(isCurrencyNoticeText("The chat mentions € but this invoice is in USD")).toBe(true);
    expect(isCurrencyNoticeText("No client email found")).toBe(false);
  });
});

describe("the draft check", () => {
  const raw: ModelDraft = {
    clientName: "Kraftwerk Studio",
    clientEmail: null,
    clientContactName: null,
    clientCountry: null,
    countryQuote: null,
    currency: "USD",
    dueOn: null,
    items: [
      {
        name: "Logo final files",
        quantity: 1,
        unitAmount: "400.00",
        sourceQuote: "logo files €400",
      },
    ],
    note: null,
    purposeCode: null,
    purposeReason: null,
    paymentTerms: null,
  };

  it("flags a currency the model got wrong, whatever the model said", () => {
    const { warnings } = checkModelDraft(raw, {
      chat: KRAFTWERK_CHAT,
      contacts: { emails: [], phones: [] },
      today: "2026-11-04",
    });
    expect(warnings).toContain("The chat mentions € but this invoice is in USD");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkModelDraft, type ModelDraft } from "@/lib/ai/check-draft";
import { extractionRequest } from "@/lib/ai/extract-invoice";
import { offlineModelDraft } from "@/lib/ai/offline-extraction";
import { PURPOSE_CODES } from "@/lib/export/purpose-codes";
import { maskContacts } from "@/lib/privacy/mask";

const TODAY = "2026-11-04";
const BRAND_KIT = readFileSync("tests/fixtures/chats/26-brand-kit-p1099/chat.txt", "utf8");

function item(name: string, unitAmount = "100.00"): ModelDraft["items"][number] {
  return { name, quantity: 1, unitAmount, sourceQuote: name };
}

function checked(items: ModelDraft["items"], purposeCode: string | null) {
  const chat = items.map(({ sourceQuote }) => sourceQuote).join(". ");
  const raw: ModelDraft = {
    clientName: "Kraftwerk Studio",
    clientEmail: null,
    clientContactName: null,
    clientCountry: null,
    countryQuote: null,
    currency: "EUR",
    dueOn: null,
    items,
    note: null,
    purposeCode,
    purposeReason: "Brand identity work is advertising.",
    paymentTerms: null,
  };
  return checkModelDraft(raw, { chat, contacts: maskContacts(chat), today: TODAY }).draft;
}

describe("the purpose code for design work", () => {
  it("moves a brand kit the model called advertising to P1099 and says why", () => {
    const draft = checked(
      [item("Logo final files"), item("Business card design"), item("Brand guideline PDF")],
      "P1007",
    );
    expect(draft.purposeCode).toBe("P1099");
    expect(draft.purposeReason).toBe("Design work with no closer RBI code; confirm with your CA.");
  });

  it("keeps P1007 when any item is advertising or marketing work", () => {
    const draft = checked([item("Logo final files"), item("Social media campaign")], "P1007");
    expect(draft.purposeCode).toBe("P1007");
    expect(draft.purposeReason).toBe("Brand identity work is advertising.");
  });

  it("keeps P1007 when an item is not design work at all", () => {
    expect(checked([item("Logo final files"), item("SEO audit")], "P1007").purposeCode).toBe(
      "P1007",
    );
    expect(checked([item("Ad creative")], "P1007").purposeCode).toBe("P1007");
  });

  it("leaves every other code alone", () => {
    expect(checked([item("Logo final files")], "P1099").purposeCode).toBe("P1099");
    expect(checked([item("Logo final files")], "P1017").purposeCode).toBe("P1017");
    expect(checked([item("Logo final files")], null).purposeCode).toBeNull();
  });

  it("gives the same code offline for the brand kit chat", () => {
    const contacts = maskContacts(BRAND_KIT);
    const { draft } = checkModelDraft(offlineModelDraft(contacts.masked, TODAY), {
      chat: BRAND_KIT,
      contacts,
      today: TODAY,
    });
    expect(draft).toMatchObject({ currency: "EUR", purposeCode: "P1099" });
  });

  it("gives the model each code's examples so it can match the work", () => {
    const { system } = extractionRequest("Hi", TODAY);
    for (const { code, examples } of PURPOSE_CODES) {
      expect(system).toContain(`${code} `);
      expect(system).toContain(examples);
    }
    expect(system).toContain("Use P1099 for design work");
  });
});

import { describe, expect, it } from "vitest";
import { maskedNotice, noticePills } from "@/components/invoices/notice-pills";
import { checkModelDraft, modelDraftSchema, type ModelDraft } from "@/lib/ai/check-draft";
import { maskContacts } from "@/lib/privacy/mask";
import { haldenGuessWithTerms } from "../support/ai";

const CHAT = [
  "Lena Fischer (Kraftwerk Studio): Perfect. Can we do 50% now and rest on delivery?",
  "Payment in 15 days is fine for us",
  "Logos for $120 each, revisions $45 a round?",
].join("\n");

function check(changes: Partial<ModelDraft>, chat = CHAT) {
  return checkModelDraft(
    { ...haldenGuessWithTerms, ...changes },
    { chat, contacts: maskContacts(chat), today: "2026-11-04" },
  );
}

const upfront = {
  upfrontPercent: 50,
  note: null,
  quote: "Can we do 50% now and rest on delivery?",
};

describe("the payment terms of a draft", () => {
  it("keeps the share the client asked for and the words it came from", () => {
    expect(check({ paymentTerms: upfront }).paymentTerms).toEqual(upfront);
  });

  it("is null when the model found no terms", () => {
    expect(check({ paymentTerms: null }).paymentTerms).toBeNull();
  });

  it("drops terms whose quote is not in the chat", () => {
    const invented = { ...upfront, quote: "We will pay 50% before you start" };
    expect(check({ paymentTerms: invented }).paymentTerms).toBeNull();
  });

  it("drops terms with an empty quote", () => {
    expect(check({ paymentTerms: { ...upfront, quote: "  " } }).paymentTerms).toBeNull();
  });

  it("accepts a quote that joins two lines with an ellipsis", () => {
    const joined = { ...upfront, quote: "Can we do 50% now ... Payment in 15 days is fine for us" };
    expect(check({ paymentTerms: joined }).paymentTerms?.upfrontPercent).toBe(50);
  });

  it.each([0, 0.5, 100, 150, -20])("does not take %s as a share before delivery", (percent) => {
    expect(
      check({ paymentTerms: { ...upfront, upfrontPercent: percent } }).paymentTerms,
    ).toBeNull();
  });

  it.each([1, 25, 99])("takes %s as a share before delivery", (percent) => {
    expect(
      check({ paymentTerms: { ...upfront, upfrontPercent: percent } }).paymentTerms?.upfrontPercent,
    ).toBe(percent);
  });

  it("keeps another term the client wrote when the share is out of range", () => {
    const terms = { upfrontPercent: 100, note: "net 15", quote: "Payment in 15 days is fine" };
    expect(check({ paymentTerms: terms }).paymentTerms).toEqual({
      upfrontPercent: null,
      note: "net 15",
      quote: "Payment in 15 days is fine",
    });
  });

  it("does not change the draft's own due date or items", () => {
    const withTerms = check({ paymentTerms: upfront });
    const without = check({ paymentTerms: null });
    expect(withTerms.draft).toEqual(without.draft);
    expect(withTerms.warnings).toEqual(without.warnings);
  });
});

describe("the contact name of a draft", () => {
  it("keeps the person when their name is in the chat", () => {
    expect(check({ clientContactName: "Lena Fischer" }).draft.client.contactName).toBe(
      "Lena Fischer",
    );
  });

  it("drops a name that is not in the chat", () => {
    expect(check({ clientContactName: "Anna Weber" }).draft.client).not.toHaveProperty(
      "contactName",
    );
  });

  it("never uses an email address as a name", () => {
    const chat = `${CHAT}\nWrite to lena@kraftwerk.example.com`;
    const result = check({ clientContactName: "[EMAIL_1]" }, chat);
    expect(result.draft.client).not.toHaveProperty("contactName");
    const direct = check({ clientContactName: "lena@kraftwerk.example.com" }, chat);
    expect(direct.draft.client).not.toHaveProperty("contactName");
  });

  it("needs the new fields, so a stored answer from before them is not reused", () => {
    expect(modelDraftSchema.safeParse(haldenGuessWithTerms).success).toBe(true);
    const without: Partial<ModelDraft> = { ...haldenGuessWithTerms };
    delete without.clientContactName;
    expect(modelDraftSchema.safeParse(without).success).toBe(false);
  });
});

describe("the notices about payment", () => {
  it("shows the share as an amber pill, leaving the client's words to the upfront control", () => {
    expect(noticePills(null, [], upfront)).toEqual([
      {
        text: "Client asked for 50% upfront, set below",
        tone: "amber",
      },
    ]);
  });

  it("shows another term the same way, with the words when there is no share", () => {
    expect(
      noticePills(null, [], { upfrontPercent: null, note: "net 30", quote: "we pay net 30" }),
    ).toEqual([{ text: "Client's payment terms: net 30 (“we pay net 30”)", tone: "amber" }]);
  });

  it("shows both a share and a note that adds a term, quoting once", () => {
    const pills = noticePills(null, [], { ...upfront, note: "the rest 30 days after approval" });
    expect(pills.map(({ text }) => text)).toEqual([
      "Client asked for 50% upfront, set below",
      "Client's payment terms: the rest 30 days after approval",
    ]);
  });

  it.each(["rest on delivery", "the rest when you deliver", "balance on completion"])(
    "leaves out a note that only restates the share: %s",
    (note) => {
      const pills = noticePills(null, [], { ...upfront, note });
      expect(pills.map(({ text }) => text)).toEqual(["Client asked for 50% upfront, set below"]);
    },
  );

  it("shows a delivery note when there is no share to restate", () => {
    const pills = noticePills(null, [], {
      upfrontPercent: null,
      note: "the rest when you deliver",
      quote: "pay the rest when you deliver",
    });
    expect(pills).toHaveLength(1);
  });

  it("comes after the privacy pill and before the warnings", () => {
    const pills = noticePills("We hid 1 email before the AI read the chat", ["Check it"], upfront);
    expect(pills.map(({ tone }) => tone)).toEqual(["green", "amber", "amber"]);
    expect(pills[2].text).toBe("Check it");
  });

  it("shows nothing for a chat without terms", () => {
    expect(noticePills(null, [], null)).toEqual([]);
  });
});

describe("the privacy pill", () => {
  it("says what was hidden, in the right numbers", () => {
    expect(maskedNotice({ emails: 1, phones: 0 })).toBe(
      "We hid 1 email before the AI read the chat",
    );
    expect(maskedNotice({ emails: 0, phones: 2 })).toBe(
      "We hid 2 phone numbers before the AI read the chat",
    );
    expect(maskedNotice({ emails: 2, phones: 1 })).toBe(
      "We hid 2 emails and 1 phone number before the AI read the chat",
    );
  });

  it("is not shown when nothing was hidden", () => {
    expect(maskedNotice({ emails: 0, phones: 0 })).toBeNull();
    expect(noticePills(maskedNotice({ emails: 0, phones: 0 }), [])).toEqual([]);
  });
});

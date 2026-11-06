import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkModelDraft, modelDraftSchema, type ModelDraft } from "@/lib/ai/check-draft";
import { addDays } from "@/lib/date-math";
import { maskContacts } from "@/lib/privacy/mask";
import { haldenGuess } from "../support/ai";

const TODAY = "2026-11-04";
const CHATS_DIR = join(process.cwd(), "tests", "fixtures", "chats");
const answers = JSON.parse(readFileSync(join(CHATS_DIR, "model-answers.json"), "utf8")) as Record<
  string,
  unknown
>;

function chatOf(id: string): string {
  return readFileSync(join(CHATS_DIR, id, "chat.txt"), "utf8");
}

function check(raw: ModelDraft, chat: string) {
  return checkModelDraft(raw, { chat, contacts: maskContacts(chat), today: TODAY });
}

// A stored answer when the fixtures hold one, otherwise a draft built from the chat's expected items.
function storedAnswer(id: string): ModelDraft {
  if (answers[id]) return modelDraftSchema.parse(answers[id]);
  const expected = JSON.parse(readFileSync(join(CHATS_DIR, id, "expected.json"), "utf8")) as {
    client: string;
    currency: string;
    items: { nameIncludes: string; quantity: number; unitAmount: string }[];
  };
  return {
    ...haldenGuess,
    clientName: expected.client,
    currency: expected.currency,
    items: expected.items.map((item) => ({
      name: item.nameIncludes,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      sourceQuote: item.nameIncludes,
    })),
  };
}

// The answer the model gave on 5 Nov: the net terms filed under payment terms, no due date.
const FILED_AS_TERMS = [
  { id: "07-explicit-net-15", days: 15, note: "Net 15", quote: "Terms: net 15" },
  { id: "14-hinglish-net7", days: 7, note: "net 7", quote: "Payment net 7 rakhte hain" },
  { id: "19-thousands-separator", days: 30, note: "Net 30", quote: "Payment net 30" },
  {
    id: "26-brand-kit-p1099",
    days: 15,
    note: "Payment in 15 days",
    quote: "Payment in 15 days is fine for us",
  },
];

describe.each(FILED_AS_TERMS)("$id, terms filed as a payment term", ({ id, days, note, quote }) => {
  const stored = storedAnswer(id);
  const askedOnly = { ...stored, dueOn: null, paymentTerms: { upfrontPercent: null, note, quote } };

  it("gets the due date from the terms and no 'No due date' warning", () => {
    const { draft, warnings } = check(askedOnly, chatOf(id));
    expect(draft.dueOn).toBe(addDays(TODAY, days));
    expect(warnings.some((warning) => warning.startsWith("No due date"))).toBe(false);
  });

  it("drops a note that only restates the terms", () => {
    expect(check(askedOnly, chatOf(id)).paymentTerms).toBeNull();
  });

  it("gets the same due date when the model left paymentTerms empty too", () => {
    const { draft, warnings } = check({ ...askedOnly, paymentTerms: null }, chatOf(id));
    expect(draft.dueOn).toBe(addDays(TODAY, days));
    expect(warnings.some((warning) => warning.startsWith("No due date"))).toBe(false);
  });
});

describe("the due date when the model gave none", () => {
  const base = storedAnswer("07-explicit-net-15");

  it("keeps an upfront share and drops the net terms from the same note", () => {
    const chat = chatOf("26-brand-kit-p1099");
    const model = storedAnswer("26-brand-kit-p1099");
    const { draft, paymentTerms } = check(
      {
        ...model,
        dueOn: null,
        paymentTerms: {
          upfrontPercent: 50,
          note: "Payment in 15 days",
          quote: "Can we do 50% now and rest on delivery?",
        },
      },
      chat,
    );
    expect(draft.dueOn).toBe(addDays(TODAY, 15));
    expect(paymentTerms?.upfrontPercent).toBe(50);
    expect(paymentTerms?.note).toBeNull();
  });

  it("keeps a condition that is not a due date", () => {
    const chat = "Mock-ups at $220 each. Pay after approval.";
    const { paymentTerms, warnings } = check(
      {
        ...base,
        paymentTerms: { upfrontPercent: null, note: "after approval", quote: "Pay after approval" },
      },
      chat,
    );
    expect(paymentTerms?.note).toBe("after approval");
    expect(warnings).toContain(
      "No due date in the chat; set to 14 days from today. Change it if needed.",
    );
  });

  it("reads days from a note whose quote is in the chat when the chat words do not match", () => {
    const chat = "Mock-ups at $220 each. Terms: 20 days from invoice date";
    const { draft } = check(
      {
        ...base,
        paymentTerms: {
          upfrontPercent: null,
          note: "20 days",
          quote: "Terms: 20 days from invoice date",
        },
      },
      chat,
    );
    expect(draft.dueOn).toBe(addDays(TODAY, 20));
  });

  it("ignores a note whose quote is not in the chat", () => {
    const chat = "Mock-ups at $220 each. Thanks!";
    const { draft, warnings } = check(
      { ...base, paymentTerms: { upfrontPercent: null, note: "Net 15", quote: "Terms: net 15" } },
      chat,
    );
    expect(draft.dueOn).toBe(addDays(TODAY, 14));
    expect(warnings.some((warning) => warning.startsWith("No due date"))).toBe(true);
  });

  it.each([
    "I can finish within 3 days",
    "Delivery in 5 days",
    "I'll send the files in 2 days",
    "Revisions within 7 days",
  ])("does not set the due date from %j", (line) => {
    const { draft, warnings } = check(base, `Mock-ups at $220 each. ${line}.`);
    expect(draft.dueOn).toBe(addDays(TODAY, 14));
    expect(warnings.some((warning) => warning.startsWith("No due date"))).toBe(true);
  });

  it("gives the delivery-date-only chat the 14-day default and its warning", () => {
    const { draft, warnings } = check(
      storedAnswer("24-delivery-date-only"),
      chatOf("24-delivery-date-only"),
    );
    expect(draft.dueOn).toBe(addDays(TODAY, 14));
    expect(warnings.some((warning) => warning.startsWith("No due date"))).toBe(true);
  });

  it("falls back to 14 days only when nothing states terms", () => {
    const { draft, warnings } = check(base, "Mock-ups at $220 each, delivered by Friday.");
    expect(draft.dueOn).toBe(addDays(TODAY, 14));
    expect(warnings.some((warning) => warning.startsWith("No due date"))).toBe(true);
  });

  it("keeps the date the model gave over the terms in the chat", () => {
    const { draft } = check({ ...base, dueOn: "2026-12-01" }, chatOf("07-explicit-net-15"));
    expect(draft.dueOn).toBe("2026-12-01");
  });
});

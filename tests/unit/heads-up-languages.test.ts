import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkReminderText } from "@/lib/reminders/check-reminder";
import { contradictingPhrase } from "@/lib/reminders/check-tone";
import { draftReminderText } from "@/lib/reminders/draft-reminder";
import type { ReminderFacts } from "@/lib/reminders/facts";
import { LANGUAGES } from "@/lib/reminders/languages";
import { templateReminder } from "@/lib/reminders/templates";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { ReminderLanguage } from "@/types";
import { stubEnv } from "../support/env";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));
vi.mock("@/lib/ai/model", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/model")>()),
  runWithFallback: async (call: (options: object) => unknown) => call({}),
}));
vi.mock("@/lib/store", () => ({ getStore: () => createMemoryStore() }));

const facts: ReminderFacts = {
  invoiceId: "INV2-TEST",
  invoiceNumber: "INV-0069",
  clientName: "Northpine Studio",
  contactName: "Dan",
  work: "Campaign banners",
  amount: { currency: "CAD", value: "380.00" },
  issuedOn: "2026-10-24",
  dueOn: "2026-11-07",
  daysLate: 0,
  remindersSent: 0,
};

const LANGUAGE_CODES = LANGUAGES.map(({ code }) => code);

// One phrase of lateness in each language, in a sentence that is otherwise a fine heads-up.
const LATE_SENTENCES: Record<ReminderLanguage, string> = {
  en: "Invoice INV-0069 is overdue.",
  de: "Rechnung INV-0069 ist überfällig.",
  fr: "La facture INV-0069 a du retard.",
  es: "La factura INV-0069 lleva retraso.",
  nl: "Factuur INV-0069 is te laat.",
  pt: "A fatura INV-0069 está com atraso.",
  hi: "इनवॉइस INV-0069 अब बकाया है।",
};

beforeEach(() => {
  stubEnv({ DEMO_TODAY: "2026-11-04", GEMINI_API_KEY: "test" });
  vi.mocked(generateText).mockReset();
});

describe("the heads-up check", () => {
  it.each(LANGUAGE_CODES)("passes the %s template, which has no word of lateness", (language) => {
    const template = templateReminder(facts, "heads_up", language);
    expect(contradictingPhrase("heads_up", template, language)).toBeNull();
    expect(checkReminderText(facts, template, language)).not.toBeNull();
  });

  it.each(LANGUAGE_CODES)("rejects a %s message that speaks of lateness", (language) => {
    const text = {
      subject: "INV-0069",
      message: `Hi,\n\n${LATE_SENTENCES[language]}\n\nThe PayPal email has a Pay now button.`,
    };
    expect(contradictingPhrase("heads_up", text, language)).not.toBeNull();
  });

  it.each([
    "This is a final notice.",
    "The deadline has passed.",
    "You missed the date.",
    "It is past due.",
    "It was due on 1 Nov.",
  ])("rejects the English words in any language: %s", (sentence) => {
    for (const language of LANGUAGE_CODES) {
      const text = { subject: "INV-0069", message: `Hi,\n\n${sentence}` };
      expect(
        contradictingPhrase("heads_up", text, language),
        `${language}: ${sentence}`,
      ).not.toBeNull();
    }
  });

  it("does not take the words of a late reminder for a heads-up of its own", () => {
    const late = { subject: "INV-0069", message: "Hi,\n\nInvoice INV-0069 is overdue." };
    expect(contradictingPhrase("firm", late, "en")).toBeNull();
  });

  it("lets a friendly note through, and 'translate' or 'latest' are not lateness", () => {
    const text = {
      subject: "A quick note about INV-0069",
      message:
        "Hi Dan,\n\nThe latest invoice INV-0069 is due on 7 Nov. Please translate if needed.",
    };
    expect(contradictingPhrase("heads_up", text, "en")).toBeNull();
  });
});

describe("a model draft that mentions lateness", () => {
  it.each(LANGUAGE_CODES)("is replaced by the %s template", async (language) => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        subject: "A note about invoice INV-0069",
        message: `Hi Dan,\n\n${LATE_SENTENCES[language]} CAD 380.00 is due on 7 Nov.\n\nPlease pay.`,
      },
    } as never);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const drafted = await draftReminderText(facts, "heads_up", { language });

    expect(drafted.source).toBe("template");
    expect(drafted.message).toBe(templateReminder(facts, "heads_up", language).message);
  });
});

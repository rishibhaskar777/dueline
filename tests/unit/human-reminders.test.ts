import { generateText } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkReminderText } from "@/lib/reminders/check-reminder";
import { contradictingPhrase } from "@/lib/reminders/check-tone";
import { cachedReminderText, draftReminderText } from "@/lib/reminders/draft-reminder";
import type { ReminderFacts } from "@/lib/reminders/facts";
import { LANGUAGES } from "@/lib/reminders/languages";
import { normaliseMessage } from "@/lib/reminders/normalise-message";
import { templateReminder } from "@/lib/reminders/templates";
import { toneReason } from "@/lib/reminders/tone";
import { createMemoryStore } from "@/lib/store/memory-store";
import type { Store } from "@/lib/store/store";
import type { Tone } from "@/types";
import { stubEnv } from "../support/env";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

let store: Store;
vi.mock("@/lib/store", () => ({ getStore: () => store }));

const facts: ReminderFacts = {
  invoiceId: "INV2-BRIGHT",
  invoiceNumber: "INV-0014",
  clientName: "Brightwell Labs",
  work: "Landing page UI",
  amount: { currency: "GBP", value: "600.00" },
  issuedOn: "2026-10-15",
  dueOn: "2026-10-28",
  daysLate: 4,
  remindersSent: 0,
};

const friendly = {
  subject: "Friendly reminder about INV-0014",
  message:
    "Hi Brightwell Labs team,\n\nI just wanted to gently remind you that invoice INV-0014 for GBP 600.00 is overdue.",
};

const firmAnswer = {
  subject: "Invoice INV-0014 is now 4 days overdue",
  message:
    "Hi Brightwell Labs team,\n\nInvoice INV-0014 for GBP 600.00 is now 4 days overdue and I have not seen a payment. Could you pay it this week using the Pay now button in the PayPal email? If something is holding it up, let me know.",
};

function modelAnswers(output: { subject: string; message: string }): void {
  vi.mocked(generateText).mockResolvedValue({ output } as unknown as Awaited<
    ReturnType<typeof generateText>
  >);
}

beforeEach(() => {
  store = createMemoryStore();
  stubEnv({
    GEMINI_API_KEY: "test-key",
    GEMINI_MODEL: "primary-model",
    GEMINI_FALLBACK_MODEL: "fallback-model",
    DEMO_TODAY: "2026-11-01",
  });
  vi.mocked(generateText).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("toneReason", () => {
  const record = { level: "late_payer" as const, lateCount: 3, invoicesConsidered: 3 };

  it("names the days and the client's record", () => {
    expect(toneReason("firm", 8, 0, record)).toBe(
      "Suggested firm: 8 days late, and late on 3 of 3 invoices.",
    );
  });

  it("names the reminders already sent for a final", () => {
    expect(toneReason("final", 12, 2, record)).toBe("Suggested final: two reminders already sent.");
    expect(toneReason("final", 12, 3, null)).toBe("Suggested final: 3 reminders already sent.");
  });

  it("names the days for a final that is more than a month late", () => {
    expect(toneReason("final", 34, 0, null)).toBe("Suggested final: 34 days late.");
  });

  it("joins three facts and leaves out the record of a client who is not a late payer", () => {
    expect(toneReason("firm", 1, 1, record)).toBe(
      "Suggested firm: 1 day late, one reminder already sent, and late on 3 of 3 invoices.",
    );
    expect(toneReason("gentle", 3, 0, { ...record, level: "watch" })).toBe(
      "Suggested gentle: 3 days late.",
    );
  });
});

describe("contradictingPhrase", () => {
  const text = (subject: string, message: string) => ({ subject, message });

  it.each(["friendly", "gentle", "gently", "just a quick", "no rush", "whenever you can"])(
    "rejects %j in a firm or final message",
    (word) => {
      const draft = text("Invoice INV-1 is overdue", `This is ${word} worded.`);
      expect(contradictingPhrase("firm", draft, "en")).toBe(word);
      expect(contradictingPhrase("final", draft, "en")).toBe(word);
      expect(contradictingPhrase("gentle", draft, "en")).toBeNull();
    },
  );

  it.each(["final reminder", "last reminder"])("rejects %j in a gentle or firm message", (word) => {
    const draft = text("Invoice INV-1", `This is my ${word}.`);
    expect(contradictingPhrase("gentle", draft, "en")).not.toBeNull();
    expect(contradictingPhrase("firm", draft, "en")).not.toBeNull();
    expect(contradictingPhrase("final", draft, "en")).toBeNull();
  });

  it("does not mistake a longer word for a banned one", () => {
    const draft = text("Invoice INV-1", "Finally, please pay. The finalised total is due.");
    expect(contradictingPhrase("firm", draft, "en")).toBeNull();
  });

  it("reads the words of each supported language", () => {
    const german = text("Kurze Erinnerung", "Bitte zahlen Sie.");
    expect(contradictingPhrase("firm", german, "de")).toBe("kurze erinnerung");
    const french = text("Facture", "Ceci est mon dernier rappel.");
    expect(contradictingPhrase("gentle", french, "fr")).toBe("dernier rappel");
    const hindi = text("इनवॉइस", "यह मेरा अंतिम अनुस्मारक है।");
    expect(contradictingPhrase("firm", hindi, "hi")).not.toBeNull();
  });

  it("accepts every template in the tone it is written for, in every language", () => {
    for (const { code } of LANGUAGES) {
      for (const tone of ["gentle", "firm", "final"] as Tone[]) {
        const template = templateReminder(facts, tone, code);
        expect(contradictingPhrase(tone, template, code), `${code} ${tone}`).toBeNull();
      }
    }
  });
});

describe("normaliseMessage", () => {
  it("puts the greeting on its own line", () => {
    expect(normaliseMessage("Dear Maya, I hope you are well. Invoice INV-1 is due.")).toBe(
      "Dear Maya,\n\nI hope you are well. Invoice INV-1 is due.",
    );
    expect(normaliseMessage("Hallo Anna, zur Erinnerung: Rechnung 1.")).toBe(
      "Hallo Anna,\n\nzur Erinnerung: Rechnung 1.",
    );
  });

  it("splits a block of more than two sentences into paragraphs of one or two", () => {
    const body = "One is here. Two is here. Three is here. Four is here. Five is here.";
    expect(normaliseMessage(`Hi Sam,\n\n${body}`)).toBe(
      "Hi Sam,\n\nOne is here. Two is here.\n\nThree is here. Four is here.\n\nFive is here.",
    );
  });

  it("leaves a block of one or two sentences, and decimals, alone", () => {
    const text = "Hi Sam,\n\nInvoice INV-1 for GBP 600.50 is overdue. Please pay.";
    expect(normaliseMessage(text)).toBe(text);
  });

  it("allows one blank line in a row and strips trailing spaces", () => {
    expect(normaliseMessage("Hi Sam,   \n\n\n\nPlease pay.  \n\n\n\nThanks.   ")).toBe(
      "Hi Sam,\n\nPlease pay.\n\nThanks.",
    );
  });

  it("keeps a message that has no greeting", () => {
    expect(normaliseMessage("Invoice INV-1 is overdue.\r\nPlease pay.")).toBe(
      "Invoice INV-1 is overdue. Please pay.",
    );
  });

  it("runs on every template", () => {
    for (const { code } of LANGUAGES) {
      const { message } = templateReminder(facts, "firm", code);
      expect(normaliseMessage(message), code).toBe(message);
      expect(message, code).not.toMatch(/\n{3}/);
    }
  });
});

describe("a draft that contradicts its tone", () => {
  it("is replaced by the template for that tone, and the log names the phrase", async () => {
    modelAnswers(friendly);

    const draft = await draftReminderText(facts, "firm");

    expect(draft.source).toBe("template");
    expect(draft.subject).toBe(templateReminder(facts, "firm").subject);
    expect(console.warn).toHaveBeenCalledWith("Reminder draft rejected", {
      reason: "tone_mismatch",
      tone: "firm",
      language: "en",
      phrase: "friendly",
    });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("Brightwell");
  });

  it("is accepted for a gentle tone", async () => {
    modelAnswers(friendly);
    expect((await draftReminderText(facts, "gentle")).source).toBe("ai");
  });

  it("is not reused from the cache for a tone it does not fit", async () => {
    modelAnswers(firmAnswer);
    await draftReminderText(facts, "firm");

    await store.putCached(`reminder:${facts.invoiceId}:final:en:4:0:v4`, friendly, 3600);
    expect(await cachedReminderText(facts, "final")).toBeNull();
    expect(await cachedReminderText(facts, "firm")).toMatchObject({ source: "ai" });
  });

  it("is split into paragraphs when the model answers in one block", async () => {
    modelAnswers({
      subject: firmAnswer.subject,
      message:
        "Hi Brightwell Labs team, invoice INV-0014 for GBP 600.00 is overdue. I have not seen a payment. Please pay it this week. Tell me if something is in the way.",
    });

    const draft = await draftReminderText(facts, "firm");

    expect(draft.source).toBe("ai");
    expect(draft.message).toBe(
      "Hi Brightwell Labs team,\n\ninvoice INV-0014 for GBP 600.00 is overdue. I have not seen a payment.\n\nPlease pay it this week. Tell me if something is in the way.",
    );
  });
});

describe("the prompt", () => {
  it("does not call a message the last reminder before two have been sent", async () => {
    modelAnswers({
      subject: "Invoice INV-0014 needs payment",
      message: "Hi team,\n\nInvoice INV-0014 for GBP 600.00 needs payment within 3 days.",
    });

    await draftReminderText({ ...facts, daysLate: 34 }, "final");
    await draftReminderText({ ...facts, daysLate: 34, remindersSent: 2 }, "final");

    const systems = vi.mocked(generateText).mock.calls.map(([call]) => String(call.system));
    expect(systems[0]).not.toContain("last reminder");
    expect(systems[0]).toContain("pay within 3 days or reply with the date they expect to pay");
    expect(systems[1]).toContain("last reminder");
  });

  it("asks for a greeting line and short paragraphs, and never for a friendly voice", async () => {
    modelAnswers(firmAnswer);
    await draftReminderText(facts, "firm");

    const { system } = vi.mocked(generateText).mock.calls[0][0] as { system: string };
    expect(system).toContain("on a line of its own");
    expect(system).toContain("separated by a blank line");
    expect(system).not.toMatch(/friendly Indian English/);
  });
});

describe("the final tone before two reminders have been sent", () => {
  const FINAL_OR_LAST: Record<string, RegExp> = {
    en: /final|last reminder/i,
    de: /letzte/i,
    fr: /dernier|final/i,
    es: /último|ultimo|final/i,
    nl: /laatste/i,
    pt: /último|ultimo|final/i,
    hi: /अंतिम/,
  };

  it.each(LANGUAGES.map(({ code }) => code))(
    "does not call itself the final or last reminder in %s, with none or one sent",
    (code) => {
      for (const remindersSent of [0, 1]) {
        const { subject, message } = templateReminder(
          { ...facts, daysLate: 34, remindersSent },
          "final",
          code,
        );
        expect(`${subject}\n${message}`, `${code} ${remindersSent}`).not.toMatch(
          FINAL_OR_LAST[code],
        );
        expect(message, code).toContain("3");
      }
    },
  );

  it.each(LANGUAGES.map(({ code }) => code))(
    "still says final or last in %s once two reminders have been sent",
    (code) => {
      const { subject, message } = templateReminder({ ...facts, remindersSent: 2 }, "final", code);
      expect(`${subject}\n${message}`).toMatch(FINAL_OR_LAST[code]);
    },
  );

  it.each(LANGUAGES.map(({ code }) => code))(
    "is a clean draft in %s: invoice number, amount, tone and no links",
    (code) => {
      const text = templateReminder({ ...facts, daysLate: 34 }, "final", code);
      expect(checkReminderText(facts, text, code)).not.toBeNull();
      expect(contradictingPhrase("final", text, code, 0)).toBeNull();
    },
  );

  it("rejects a model's draft that calls itself the last reminder too early, and accepts it after two", () => {
    const draft = { subject: "Invoice INV-0014", message: "This is my last reminder." };
    expect(contradictingPhrase("final", draft, "en", 0)).toBe("last reminder");
    expect(contradictingPhrase("final", draft, "en", 1)).toBe("last reminder");
    expect(contradictingPhrase("final", draft, "en", 2)).toBeNull();
  });

  it("replaces such a model draft with the template", async () => {
    modelAnswers({
      subject: "Final reminder: invoice INV-0014",
      message:
        "Hi Brightwell Labs team,\n\nThis is my final reminder about invoice INV-0014 for GBP 600.00.",
    });

    const draft = await draftReminderText({ ...facts, daysLate: 34 }, "final");

    expect(draft.source).toBe("template");
    expect(draft.subject).not.toMatch(/final/i);
  });
});

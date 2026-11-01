import { describe, expect, it } from "vitest";
import { checkReminderText } from "@/lib/reminders/check-reminder";
import type { ReminderFacts } from "@/lib/reminders/facts";
import {
  LANGUAGES,
  amountText,
  formatAmount,
  formatDateIn,
  languageInfo,
  signOffIn,
} from "@/lib/reminders/languages";
import { withSignOff } from "@/lib/reminders/sign-off";
import { templateReminder } from "@/lib/reminders/templates";
import { EMPTY_PROFILE, reminderLanguageSchema, type ReminderLanguage, type Tone } from "@/types";

const facts: ReminderFacts = {
  invoiceId: "INV2-TEST",
  invoiceNumber: "INV-0046",
  clientName: "Halden Coffee Co.",
  work: "Menu redesign",
  amount: { currency: "USD", value: "12500.50" },
  issuedOn: "2026-10-01",
  dueOn: "2026-10-15",
  daysLate: 9,
  remindersSent: 0,
};

const TONES: Tone[] = ["gentle", "firm", "final"];
const NON_ENGLISH = LANGUAGES.map(({ code }) => code).filter((code) => code !== "en");

describe("the supported languages", () => {
  it("are the ones the API accepts", () => {
    expect(LANGUAGES.map(({ code }) => code)).toEqual(reminderLanguageSchema.options);
  });
});

describe("formatAmount", () => {
  it.each([
    ["en", "12,500.50 USD"],
    ["de", "12.500,50 USD"],
    ["fr", "12 500,50 USD"],
    ["es", "12.500,50 USD"],
    ["nl", "12.500,50 USD"],
    ["pt", "12.500,50 USD"],
    ["hi", "12,500.50 USD"],
  ] as const)("writes %s with its own marks", (language, expected) => {
    expect(formatAmount(language, facts.amount)).toBe(expected);
  });

  it("groups lakhs and crores the Indian way in Hindi", () => {
    expect(formatAmount("hi", { currency: "USD", value: "1234567.00" })).toBe("12,34,567.00 USD");
    expect(formatAmount("de", { currency: "USD", value: "1234567.00" })).toBe("1.234.567,00 USD");
  });

  it("pads a missing decimal and leaves small amounts ungrouped", () => {
    expect(formatAmount("de", { currency: "EUR", value: "450" })).toBe("450,00 EUR");
    expect(formatAmount("fr", { currency: "GBP", value: "99.5" })).toBe("99,50 GBP");
  });
});

describe("amountText", () => {
  it("keeps the currency code first in English and follows the language elsewhere", () => {
    expect(amountText("en", facts.amount)).toBe("USD 12500.50");
    expect(amountText("de", facts.amount)).toBe("12.500,50 USD");
  });
});

describe("languageInfo", () => {
  it("refuses a language that is not listed", () => {
    expect(() => languageInfo("xx" as ReminderLanguage)).toThrow(RangeError);
  });
});

describe("formatDateIn", () => {
  it("names the month in the language", () => {
    expect(formatDateIn("de", "2026-10-15")).toContain("Oktober");
    expect(formatDateIn("es", "2026-10-15")).toContain("octubre");
  });
});

describe("the template in every language", () => {
  const cases = LANGUAGES.flatMap(({ code }) => TONES.map((tone) => [code, tone] as const));

  it.each(cases)("%s %s passes every check", (language, tone) => {
    const text = templateReminder(facts, tone, language);
    expect(text.message).toContain("INV-0046");
    expect(text.message).toContain(amountText(language, facts.amount));
    expect(checkReminderText(facts, text, language)).toEqual(text);
  });

  it("is not the English wording", () => {
    const english = templateReminder(facts, "gentle");
    for (const language of NON_ENGLISH) {
      expect(templateReminder(facts, "gentle", language).message).not.toBe(english.message);
    }
  });

  it("still passes for a client with no business name", () => {
    const unnamed = { ...facts, clientName: "tandem@personal.example.com" };
    for (const language of NON_ENGLISH) {
      const text = templateReminder(unnamed, "firm", language);
      expect(text.message).not.toContain("@");
      expect(checkReminderText(unnamed, text, language)).not.toBeNull();
    }
  });
});

describe("checking text in another language", () => {
  const german = (amount: string) => ({
    subject: "Erinnerung zu Rechnung INV-0046",
    message: `Hallo, Rechnung INV-0046 über ${amount} ist überfällig. Bitte zahlen Sie diese Woche.`,
  });

  it("accepts the invoice amount in the language's number format", () => {
    expect(checkReminderText(facts, german("12.500,50 USD"), "de")).not.toBeNull();
    expect(checkReminderText(facts, german("USD 12.500,50"), "de")).not.toBeNull();
  });

  it("refuses another amount", () => {
    expect(checkReminderText(facts, german("12.500,05 USD"), "de")).toBeNull();
    expect(checkReminderText(facts, german("1.250,50 USD"), "de")).toBeNull();
    expect(checkReminderText(facts, german("12.500,50 EUR"), "de")).toBeNull();
  });

  it("reads the same digits as a different number in English", () => {
    expect(checkReminderText(facts, german("12.500,50 USD"), "en")).toBeNull();
  });

  it("still refuses links and email addresses", () => {
    const linked = {
      subject: "Erinnerung zu Rechnung INV-0046",
      message:
        "Rechnung INV-0046 ist offen, siehe https://pay.example.com oder schreiben Sie an a@b.co",
    };
    expect(checkReminderText(facts, linked, "de")).toBeNull();
  });

  it("accepts a French amount written with a normal no-break space", () => {
    const french = {
      subject: "Rappel facture INV-0046",
      message: "La facture INV-0046 de 12 500,50 USD est en retard. Merci de la régler.",
    };
    expect(checkReminderText(facts, french, "fr")).not.toBeNull();
  });
});

describe("the sign-off", () => {
  const profile = { ...EMPTY_PROFILE, yourName: "Riya Sharma" };

  it("follows the language when the sign-off is the default", () => {
    expect(signOffIn("de", "Thank you")).toBe("Vielen Dank");
    expect(withSignOff("Hallo", profile, "de")).toBe("Hallo\n\nVielen Dank,\nRiya Sharma");
  });

  it("keeps a sign-off the freelancer chose", () => {
    expect(signOffIn("fr" as ReminderLanguage, "Best regards")).toBe("Best regards");
    expect(withSignOff("Hello", { ...profile, signOff: "Best regards" }, "fr")).toBe(
      "Hello\n\nBest regards,\nRiya Sharma",
    );
  });

  it("does not leave two closings when the body already ends with one", () => {
    expect(withSignOff("Hallo\n\nDanke", profile, "de")).toBe("Hallo\n\nVielen Dank,\nRiya Sharma");
  });
});

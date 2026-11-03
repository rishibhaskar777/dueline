import { describe, expect, it } from "vitest";
import type { ReminderFacts } from "@/lib/reminders/facts";
import { LANGUAGES } from "@/lib/reminders/languages";
import { normaliseMessage, withoutRepeatedThanks } from "@/lib/reminders/normalise-message";
import { withSignOff } from "@/lib/reminders/sign-off";
import { templateReminder } from "@/lib/reminders/templates";
import { EMPTY_PROFILE, type Profile, type Tone } from "@/types";

const riya: Profile = { ...EMPTY_PROFILE, yourName: "Riya Sharma" };

const facts: ReminderFacts = {
  invoiceId: "INV2-TEST",
  invoiceNumber: "INV-0046",
  clientName: "Brightwell Labs",
  contactName: null,
  work: "Dashboard design",
  amount: { currency: "USD", value: "450.00" },
  issuedOn: "2026-10-01",
  dueOn: "2026-10-15",
  daysLate: 9,
  remindersSent: 0,
};

const BRIGHTWELL = [
  "Hi Brightwell Labs team,",
  "A quick reminder that invoice INV-0046 for USD 450.00 was due on 15 Oct 2026. It is likely just slipped your mind.",
  "The PayPal email has a Pay now button.",
  "Thank you, and please ignore this note if you have already made the payment.",
].join("\n\n");

function count(text: string, word: string): number {
  return text.split(word.toLowerCase()).length - 1;
}

describe("a reminder whose sign-off is a thank you", () => {
  it("says thank you once, as the sign-off", () => {
    const message = withSignOff(normaliseMessage(BRIGHTWELL), riya);
    expect(count(message.toLowerCase(), "thank you")).toBe(1);
    expect(message).toContain("Please ignore this note if you have already made the payment.");
    expect(message.endsWith("Thank you,\nRiya Sharma")).toBe(true);
  });

  it("fixes the one filler sentence the model wrote", () => {
    expect(normaliseMessage(BRIGHTWELL)).toContain("It may have slipped your mind.");
    expect(normaliseMessage(BRIGHTWELL)).not.toContain("likely just");
  });

  it("keeps a thank you in the body when the sign-off is not a thanks", () => {
    const message = withSignOff(BRIGHTWELL, { ...riya, signOff: "Best regards" });
    expect(message).toContain("Thank you, and please ignore");
  });
});

describe("withoutRepeatedThanks", () => {
  it("drops a last paragraph that was only a thank you", () => {
    expect(withoutRepeatedThanks("Hi,\n\nPlease pay.\n\nThanks.")).toBe("Hi,\n\nPlease pay.");
  });

  it("re-capitalises what is left", () => {
    expect(withoutRepeatedThanks("Hi,\n\nThanks, please pay this week.")).toBe(
      "Hi,\n\nPlease pay this week.",
    );
  });

  it("leaves a thank you that starts a longer sentence", () => {
    const body = "Hi,\n\nThank you for your patience so far.";
    expect(withoutRepeatedThanks(body)).toBe(body);
  });

  it.each([
    ["Vielen Dank, bitte zahlen Sie diese Woche.", "Bitte zahlen Sie diese Woche."],
    ["Merci, et veuillez la régler.", "Veuillez la régler."],
    ["Gracias, por favor pague esta semana.", "Por favor pague esta semana."],
    ["Alvast bedankt, betaal deze week.", "Betaal deze week."],
    ["Obrigado, por favor pague esta semana.", "Por favor pague esta semana."],
    ["धन्यवाद, कृपया इस सप्ताह भुगतान करें।", "कृपया इस सप्ताह भुगतान करें।"],
  ])("removes the thanks in another language: %s", (last, expected) => {
    expect(withoutRepeatedThanks(`Hallo,\n\nKurz.\n\n${last}`)).toBe(
      `Hallo,\n\nKurz.\n\n${expected}`,
    );
  });
});

describe("template reminders", () => {
  const tones: Tone[] = ["gentle", "firm", "final"];

  it.each(
    LANGUAGES.flatMap(({ code, thanks }) => tones.map((tone) => [code, thanks, tone] as const)),
  )("thank once in %s (%s, %s)", (language, thanks, tone) => {
    const body = templateReminder(facts, tone, language).message;
    const message = withSignOff(body, riya, language);
    expect(count(message.toLowerCase(), thanks.toLowerCase())).toBe(1);
    expect(count(body.toLowerCase(), "merci")).toBe(0);
  });
});

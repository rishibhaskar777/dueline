import { describe, expect, it } from "vitest";
import {
  checkReminderText,
  hasLinkOrAddress,
  type ReminderText,
} from "@/lib/reminders/check-reminder";
import type { ReminderFacts } from "@/lib/reminders/facts";
import { templateReminder } from "@/lib/reminders/templates";
import { suggestTone } from "@/lib/reminders/tone";
import type { Tone } from "@/types";

const facts: ReminderFacts = {
  invoiceId: "INV2-OKRZ",
  invoiceNumber: "INV-0044",
  clientName: "Okafor & Reyes",
  work: "Brand guidelines",
  amount: { currency: "EUR", value: "720.00" },
  issuedOn: "2026-10-01",
  dueOn: "2026-10-10",
  daysLate: 7,
};

const good: ReminderText = {
  subject: "A quick reminder about invoice INV-0044",
  message:
    "Hi Okafor & Reyes team,\n\nInvoice INV-0044 for EUR 720.00 was due on 10 Oct 2026. The PayPal email has a Pay now button.\n\nThank you",
};

const sent = (tone: Tone) => ({ tone, sentAt: "2026-10-25T05:00:00Z" });

describe("suggestTone", () => {
  it("is gentle for 1 to 7 days late with no reminder sent", () => {
    expect(suggestTone(1, [], null)).toBe("gentle");
    expect(suggestTone(7, [], null)).toBe("gentle");
  });

  it("is firm from 8 days late or after one reminder", () => {
    expect(suggestTone(8, [], null)).toBe("firm");
    expect(suggestTone(20, [], null)).toBe("firm");
    expect(suggestTone(3, [sent("gentle")], null)).toBe("firm");
  });

  it("is final beyond 20 days late or after two reminders", () => {
    expect(suggestTone(21, [], null)).toBe("final");
    expect(suggestTone(3, [sent("gentle"), sent("firm")], null)).toBe("final");
    expect(suggestTone(25, [sent("gentle")], null)).toBe("final");
  });

  it("moves a late payer one step firmer and stops at final", () => {
    expect(suggestTone(3, [], "late_payer")).toBe("firm");
    expect(suggestTone(10, [], "late_payer")).toBe("final");
    expect(suggestTone(25, [], "late_payer")).toBe("final");
  });

  it("keeps the tone for a client to watch, a reliable client or no history", () => {
    for (const risk of ["watch", "reliable", null] as const) {
      expect(suggestTone(3, [], risk)).toBe("gentle");
      expect(suggestTone(10, [], risk)).toBe("firm");
    }
  });
});

describe("hasLinkOrAddress", () => {
  it.each([
    "Pay at https://paypal.me/someone",
    "Visit www.example.com",
    "Pay at paypal.com/pay",
    "Write to me@example.com",
  ])("finds one in %s", (text) => {
    expect(hasLinkOrAddress(text, facts)).toBe(true);
  });

  it("leaves ordinary sentences alone", () => {
    expect(hasLinkOrAddress("Halden Coffee Co. owes INV-0044. Please pay now.", facts)).toBe(false);
  });

  it("does not take the client's business name for a domain", () => {
    const acme = { ...facts, clientName: "Acme.io" };
    expect(hasLinkOrAddress("Hi Acme.io team, INV-0044 is overdue.", acme)).toBe(false);
    expect(hasLinkOrAddress("Hi Acme.io team, pay at beta.io today.", acme)).toBe(true);
    expect(hasLinkOrAddress("Hi Acme.io team, see https://pay.example.org", acme)).toBe(true);
  });

  it("does not take the work description for a link", () => {
    const own = { ...facts, work: "Website for shop.example.com" };
    expect(hasLinkOrAddress("Thanks for Website for shop.example.com.", own)).toBe(false);
    expect(hasLinkOrAddress("Thanks for the work on shop.example.com.", own)).toBe(true);
  });

  it("removes the longer phrase first when the work contains the client's name", () => {
    const own = { ...facts, clientName: "Acme.io", work: "Logo for Acme.io" };
    expect(hasLinkOrAddress("Thanks for Logo for Acme.io.", own)).toBe(false);
  });

  it("still finds an email address when the client's name is one", () => {
    const own = { ...facts, clientName: "ana@okafor.example" };
    expect(hasLinkOrAddress("Write to ana@okafor.example", own)).toBe(true);
  });
});

describe("checkReminderText", () => {
  it("accepts a draft that follows the rules and trims it", () => {
    expect(checkReminderText(facts, { ...good, subject: `  ${good.subject} ` })).toEqual(good);
  });

  it("accepts the invoice amount written in other ways", () => {
    for (const written of ["EUR 720", "720.00 EUR", "€720.00", "EUR 720.00"]) {
      const message = good.message.replace("EUR 720.00", written);
      expect(checkReminderText(facts, { ...good, message }), written).not.toBeNull();
    }
  });

  it("rejects a different amount, in the message or the subject", () => {
    const message = good.message.replace("EUR 720.00", "EUR 750.00");
    expect(checkReminderText(facts, { ...good, message })).toBeNull();
    const subject = "Please pay EUR 70.00 for INV-0044";
    expect(checkReminderText(facts, { ...good, subject })).toBeNull();
  });

  it("rejects an amount in another currency", () => {
    const message = good.message.replace("EUR 720.00", "USD 720.00");
    expect(checkReminderText(facts, { ...good, message })).toBeNull();
  });

  it("rejects a link or an email address", () => {
    expect(
      checkReminderText(facts, { ...good, message: `${good.message} https://pay.example.org` }),
    ).toBeNull();
    expect(
      checkReminderText(facts, { ...good, message: `${good.message} Write to ana@okafor.example` }),
    ).toBeNull();
  });

  it("accepts a client name that looks like a domain, but not a link of its own", () => {
    const acme = { ...facts, clientName: "Acme.io" };
    const message = good.message.replace("Okafor & Reyes team", "Acme.io team");
    expect(checkReminderText(acme, { ...good, message })).not.toBeNull();
    expect(checkReminderText(acme, { ...good, message: `${message} Pay at beta.io` })).toBeNull();
  });

  it("rejects a message that does not name the invoice", () => {
    const message = good.message.replace("INV-0044", "your invoice");
    expect(checkReminderText(facts, { ...good, message })).toBeNull();
  });

  it("rejects a subject or message outside the length limits", () => {
    expect(checkReminderText(facts, { ...good, subject: "Hi" })).toBeNull();
    expect(checkReminderText(facts, { ...good, subject: "x".repeat(121) })).toBeNull();
    expect(checkReminderText(facts, { ...good, message: "INV-0044 thanks" })).toBeNull();
    expect(
      checkReminderText(facts, { ...good, message: `INV-0044 ${"pay ".repeat(250)}` }),
    ).toBeNull();
  });
});

describe("templateReminder", () => {
  it.each<Tone>(["gentle", "firm", "final"])("passes the same checks in the %s tone", (tone) => {
    const text = templateReminder(facts, tone);
    expect(checkReminderText(facts, text)).toEqual(text);
    expect(text.message).toContain("Pay now");
    expect(text.message).not.toMatch(/thank you/i);
  });

  it("states the days overdue and does not invent fees", () => {
    const { message } = templateReminder(facts, "firm");
    expect(message).toContain("7 days overdue");
    expect(message).not.toMatch(/fee|interest|legal/i);
  });

  it("greets nobody by an email address", () => {
    const text = templateReminder(
      { ...facts, clientName: "accounts@okaforreyes.example.com" },
      "gentle",
    );
    expect(text.message.startsWith("Hi there,")).toBe(true);
    expect(hasLinkOrAddress(text.message, facts)).toBe(false);
  });
});

describe("checkReminderText with the sign-off added afterwards", () => {
  it("keeps room for the longest sign-off within the 900 characters the send route accepts", () => {
    const longest = (length: number) => `INV-0044 ${"a".repeat(length - 9)}`;
    expect(checkReminderText(facts, { ...good, message: longest(790) })).not.toBeNull();
    expect(checkReminderText(facts, { ...good, message: longest(791) })).toBeNull();
  });
});

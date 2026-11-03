import { describe, expect, it } from "vitest";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import { toInvoiceSummary } from "@/lib/paypal/map";
import type { PayPalInvoice } from "@/lib/paypal/types";
import { factsOf, firstNameOf, type ReminderFacts } from "@/lib/reminders/facts";
import { LANGUAGES } from "@/lib/reminders/languages";
import { withStatedFacts } from "@/lib/reminders/state-facts";
import { statedFactsSentence } from "@/lib/reminders/template-packs";
import { templateReminder } from "@/lib/reminders/templates";
import {
  clientSchema,
  EMPTY_PROFILE,
  type CreateInvoiceRequest,
  type ReminderLanguage,
} from "@/types";
import unpaid from "../fixtures/paypal/invoice-unpaid.json";

const facts: ReminderFacts = {
  invoiceId: "INV2-OKRZ",
  invoiceNumber: "INV-0028",
  clientName: "Okafor & Reyes",
  contactName: null,
  work: "Brand guidelines",
  amount: { currency: "EUR", value: "720.00" },
  issuedOn: "2026-10-13",
  dueOn: "2026-10-27",
  daysLate: 7,
  remindersSent: 0,
};

const withoutFacts = {
  subject: "Invoice INV-0028 is overdue",
  message: "Dear Okafor & Reyes,\n\nInvoice INV-0028 for EUR 720.00 is now overdue. Please pay it.",
};

describe("withStatedFacts", () => {
  it("adds one sentence with the due date and the days overdue after the greeting", () => {
    const stated = withStatedFacts(facts, "firm", "en", withoutFacts);
    expect(stated.message).toBe(
      "Dear Okafor & Reyes,\n\nInvoice INV-0028 for EUR 720.00 was due on 27 Oct 2026 and is now 7 days overdue.\n\nInvoice INV-0028 for EUR 720.00 is now overdue. Please pay it.",
    );
    expect(stated.subject).toBe(withoutFacts.subject);
  });

  it("does the same for a final reminder", () => {
    expect(withStatedFacts(facts, "final", "en", withoutFacts).message).toContain(
      "was due on 27 Oct 2026 and is now 7 days overdue.",
    );
  });

  it("leaves a gentle reminder in its softer wording", () => {
    expect(withStatedFacts(facts, "gentle", "en", withoutFacts)).toBe(withoutFacts);
  });

  it("leaves a draft that already says both", () => {
    const complete = {
      subject: "s",
      message:
        "Hi Ana,\n\nInvoice INV-0028 was due on 27 October and is now 7 days overdue. Please pay it.",
    };
    expect(withStatedFacts(facts, "firm", "en", complete)).toBe(complete);
  });

  it("adds the sentence when only one of the two is missing", () => {
    const noDays = { subject: "s", message: "Hi Ana,\n\nIt was due on 27 Oct. Please pay it." };
    const noDate = { subject: "s", message: "Hi Ana,\n\nIt is now 7 days overdue. Please pay it." };
    expect(withStatedFacts(facts, "firm", "en", noDays).message).toContain("is now 7 days overdue");
    expect(withStatedFacts(facts, "firm", "en", noDate).message).toContain("was due on 27 Oct");
  });

  it("does not take the 7 inside 27 for the days overdue", () => {
    const text = { subject: "s", message: "Hi Ana,\n\nIt was due on 27 Oct. Please pay it." };
    expect(withStatedFacts(facts, "firm", "en", text).message).toContain("7 days overdue");
  });

  it("puts the sentence first when the draft has no greeting line", () => {
    const bare = { subject: "s", message: "Invoice INV-0028 is overdue and needs payment now." };
    const stated = withStatedFacts(facts, "firm", "en", bare);
    expect(stated.message.startsWith("Invoice INV-0028 for EUR 720.00 was due")).toBe(true);
  });
});

const EXPECTED: Record<ReminderLanguage, string> = {
  en: "Invoice INV-0028 for EUR 720.00 was due on 27 Oct 2026 and is now 7 days overdue.",
  de: "Rechnung INV-0028 über 720,00 EUR war am 27. Oktober 2026 fällig und ist seit 7 Tage überfällig.",
  fr: "La facture INV-0028 d'un montant de 720,00 EUR était due le 27 octobre 2026 et a 7 jours de retard.",
  es: "La factura INV-0028 por 720,00 EUR vencía el 27 de octubre de 2026 y lleva 7 días de retraso.",
  nl: "Factuur INV-0028 van 720,00 EUR moest op 27 oktober 2026 betaald zijn en is nu 7 dagen te laat.",
  pt: "A fatura INV-0028 no valor de 720,00 EUR venceu em 27 de outubro de 2026 e está com 7 dias de atraso.",
  hi: "720.00 EUR का इनवॉइस INV-0028 27 अक्टूबर 2026 को देय था और अब 7 दिन से बकाया है।",
};

describe("the stated facts in every language", () => {
  it.each(LANGUAGES.map(({ code, name }) => [code, name] as const))(
    "has its sentence in %s (%s)",
    (code) => {
      const sentence = withStatedFacts(facts, "firm", code, {
        subject: "s",
        message: "Hi,\n\nPlease pay.",
      }).message.split("\n\n")[1];
      expect(sentence).toBe(EXPECTED[code]);
    },
  );

  it("is recognised as stating both facts, so it is added only once", () => {
    for (const { code } of LANGUAGES) {
      const once = withStatedFacts(facts, "firm", code, { subject: "s", message: "Hi,\n\nPay." });
      expect(withStatedFacts(facts, "firm", code, once)).toBe(once);
    }
  });

  it("is one sentence that counts a single day in the singular", () => {
    expect(
      statedFactsSentence("en", {
        number: "INV-0028",
        owed: "EUR 720.00",
        due: "27 Oct",
        daysLate: 1,
      }),
    ).toBe("Invoice INV-0028 for EUR 720.00 was due on 27 Oct and is now 1 day overdue.");
  });
});

describe("the greeting of a reminder", () => {
  it("uses the first name of the contact", () => {
    const text = templateReminder({ ...facts, contactName: "Lena" }, "firm", "en");
    expect(text.message.startsWith("Hi Lena,\n\n")).toBe(true);
  });

  it("falls back to the team when there is no contact", () => {
    const text = templateReminder(facts, "firm", "en");
    expect(text.message.startsWith("Hi Okafor & Reyes team,\n\n")).toBe(true);
  });

  it.each([
    ["de", "Hallo Lena,"],
    ["fr", "Bonjour Lena,"],
    ["es", "Hola Lena,"],
    ["nl", "Beste Lena,"],
    ["pt", "Olá Lena,"],
    ["hi", "नमस्ते Lena,"],
  ] as const)("greets a contact in %s", (code, greeting) => {
    const text = templateReminder({ ...facts, contactName: "Lena" }, "gentle", code);
    expect(text.message.startsWith(`${greeting}\n\n`)).toBe(true);
  });

  it("keeps a greeting with no name at all", () => {
    const text = templateReminder({ ...facts, clientName: "a@b.example.com" }, "gentle", "en");
    expect(text.message.startsWith("Hi there,")).toBe(true);
  });
});

describe("firstNameOf", () => {
  it("takes the first word", () => {
    expect(firstNameOf("Lena Fischer")).toBe("Lena");
    expect(firstNameOf("  Ana  Maria Okafor ")).toBe("Ana");
  });

  it("never turns an email address or a phone number into a name", () => {
    expect(firstNameOf("lena@kraftwerk.example.com")).toBeNull();
    expect(firstNameOf("Lena lena@kraftwerk.example.com")).toBeNull();
    expect(firstNameOf("+49 30 1234 5678")).toBeNull();
  });

  it("is null without a name", () => {
    expect(firstNameOf(undefined)).toBeNull();
    expect(firstNameOf("   ")).toBeNull();
  });
});

describe("the contact name from PayPal to the reminder", () => {
  const invoice = unpaid as unknown as PayPalInvoice;

  it("reads the recipient's name as the contact and greets by its first name", () => {
    const summary = toInvoiceSummary(invoice, "2026-11-04", null);
    if (!summary) throw new Error("the fixture invoice should map");
    expect(summary.client.contactName).toBe("Jordan Lee");
    expect(factsOf(summary, summary.amount, 0).contactName).toBe("Jordan");
  });

  it("has no contact when the invoice has no recipient name", () => {
    const nameless: PayPalInvoice = {
      ...invoice,
      primary_recipients: [
        { billing_info: { email_address: "buyer@personal.example.com", business_name: "Tandem" } },
      ],
    };
    const summary = toInvoiceSummary(nameless, "2026-11-04", null);
    if (!summary) throw new Error("the invoice should map");
    expect(summary.client).not.toHaveProperty("contactName");
    expect(factsOf(summary, summary.amount, 0).contactName).toBeNull();
  });
});

describe("the contact name on the PayPal invoice", () => {
  const draft: CreateInvoiceRequest["draft"] = {
    client: { name: "Kraftwerk Studio", email: "buyer@personal.example.com" },
    currency: "EUR",
    dueOn: "2026-11-30",
    items: [{ name: "Logo", quantity: 1, unitAmount: "400.00", sac: null }],
    purposeCode: null,
    includeLutNote: false,
  };
  const options = {
    invoiceNumber: "0042",
    invoiceDate: "2026-11-04",
    requestId: "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c",
    profile: EMPTY_PROFILE,
  };
  const nameOf = (contactName: string) =>
    toPayPalInvoice({ ...draft, client: { ...draft.client, contactName } }, options)
      .primary_recipients?.[0].billing_info.name;

  it("sends the name as the recipient's given name and surname next to the business name", () => {
    const body = toPayPalInvoice(
      { ...draft, client: { ...draft.client, contactName: "Lena Fischer" } },
      options,
    );
    expect(body.primary_recipients?.[0].billing_info).toEqual({
      email_address: "buyer@personal.example.com",
      business_name: "Kraftwerk Studio",
      name: { given_name: "Lena", surname: "Fischer" },
    });
  });

  it("splits at the last space, and sends a single word as the given name", () => {
    expect(nameOf("Ana Maria Okafor")).toEqual({ given_name: "Ana Maria", surname: "Okafor" });
    expect(nameOf("Lena")).toEqual({ given_name: "Lena" });
  });

  it("sends no name without a contact", () => {
    const body = toPayPalInvoice(draft, options);
    expect(body.primary_recipients?.[0].billing_info).not.toHaveProperty("name");
  });
});

describe("the contact name in a request", () => {
  const base = { name: "Kraftwerk Studio", email: "buyer@personal.example.com" };

  it("is optional and trimmed", () => {
    expect(clientSchema.parse(base)).toEqual(base);
    expect(clientSchema.parse({ ...base, contactName: "  Lena Fischer " }).contactName).toBe(
      "Lena Fischer",
    );
  });

  it("refuses an email address, an empty name and a very long one", () => {
    for (const contactName of ["lena@kraftwerk.example.com", "", "   ", "x".repeat(101)]) {
      expect(clientSchema.safeParse({ ...base, contactName }).success, contactName).toBe(false);
    }
  });
});

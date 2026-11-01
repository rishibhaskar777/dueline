import { describe, expect, it } from "vitest";
import { checkModelDraft, modelDraftSchema } from "@/lib/ai/check-draft";
import { COMMON_COUNTRY_CODES, COUNTRIES, countryName, isCountryCode } from "@/lib/countries";
import { computePaySpeed } from "@/lib/insights/pay-speed";
import { maskContacts } from "@/lib/privacy/mask";
import { toInvoiceSummary } from "@/lib/paypal/map";
import { toPayPalInvoice } from "@/lib/paypal/invoice-body";
import { buildDemoProfile } from "@/lib/demo/story";
import { clientSchema, EMPTY_PROFILE, type InvoiceSummary } from "@/types";
import { paidInvoice, openInvoice } from "../support/summaries";
import { haldenGuess } from "../support/ai";
import type { PayPalInvoice } from "@/lib/paypal/types";

const TODAY = "2026-11-01";

function paid(issuedOn: string, dueOn: string, paidOn: string): InvoiceSummary {
  return { ...paidInvoice(dueOn, paidOn), issuedOn };
}

describe("computePaySpeed", () => {
  it("is null when nothing was paid", () => {
    expect(computePaySpeed([], TODAY)).toBeNull();
    expect(computePaySpeed([openInvoice("2026-11-10")], TODAY)).toBeNull();
  });

  it("reads a single invoice paid on its due date as on time", () => {
    expect(computePaySpeed([paid("2026-10-01", "2026-10-15", "2026-10-15")], TODAY)).toEqual({
      averageDays: 14,
      onTimePercent: 100,
      invoices: 1,
    });
  });

  it("counts an invoice paid early as on time, and averages days from issue to payment", () => {
    const speed = computePaySpeed(
      [
        paid("2026-10-01", "2026-10-15", "2026-10-11"),
        paid("2026-09-01", "2026-09-15", "2026-09-30"),
        paid("2026-08-01", "2026-08-15", "2026-08-14"),
      ],
      TODAY,
    );
    expect(speed).toEqual({ averageDays: 17.3, onTimePercent: 67, invoices: 3 });
  });

  it("leaves out unpaid invoices and payments older than 12 months", () => {
    const speed = computePaySpeed(
      [
        paid("2026-10-01", "2026-10-15", "2026-10-15"),
        paid("2025-09-01", "2025-09-15", "2025-09-20"),
        openInvoice("2026-10-20"),
      ],
      TODAY,
    );
    expect(speed?.invoices).toBe(1);
  });
});

describe("countries", () => {
  it("lists every country once, by name, without India", () => {
    const codes = COUNTRIES.map(({ code }) => code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain("IN");
    expect(codes).toContain("PT");
    expect(COUNTRIES.map(({ name }) => name)).toEqual(
      [...COUNTRIES.map(({ name }) => name)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("names a code and knows the common ones are on the list", () => {
    expect(countryName("PT")).toBe("Portugal");
    expect(countryName("GB")).toBe("United Kingdom");
    expect(countryName("ZZ")).toBeNull();
    expect(countryName(undefined)).toBeNull();
    expect(COMMON_COUNTRY_CODES.every(isCountryCode)).toBe(true);
  });

  it("is checked by the client schema", () => {
    const client = { name: "Casa Verde", email: "a@b.example" };
    expect(clientSchema.safeParse({ ...client, country: "PT" }).success).toBe(true);
    expect(clientSchema.safeParse({ ...client, country: "XX" }).success).toBe(false);
    expect(clientSchema.safeParse(client).success).toBe(true);
  });
});

describe("the country in an extracted draft", () => {
  const chat = "Sofia: We're in Lisbon and need logos. Mail sofia@casaverde.example";
  const contacts = maskContacts(chat);
  const check = (clientCountry: string | null, countryQuote: string | null) =>
    checkModelDraft(modelDraftSchema.parse({ ...haldenGuess, clientCountry, countryQuote }), {
      chat,
      contacts,
      today: TODAY,
    }).draft.client.country;

  it("is kept when its code is on the list and its words are in the chat", () => {
    expect(check("PT", "We're in Lisbon")).toBe("PT");
    expect(check("pt", "we're in lisbon")).toBe("PT");
  });

  it("is dropped when the code is not a country", () => {
    expect(check("XX", "We're in Lisbon")).toBeUndefined();
    expect(check("IN", "We're in Lisbon")).toBeUndefined();
  });

  it("is dropped when the words are not in the chat, or there are none", () => {
    expect(check("PT", "we are in Porto")).toBeUndefined();
    expect(check("PT", "")).toBeUndefined();
    expect(check("PT", null)).toBeUndefined();
    expect(check(null, null)).toBeUndefined();
  });
});

describe("the country on PayPal's invoice", () => {
  const draft = {
    client: { name: "Casa Verde", email: "buyer@personal.example.com", country: "PT" },
    currency: "EUR" as const,
    dueOn: "2026-11-15",
    items: [{ name: "Logo", quantity: 1, unitAmount: "100.00", sac: null }],
    purposeCode: null,
    includeLutNote: false,
  };
  const options = {
    invoiceNumber: "INV-1",
    invoiceDate: TODAY,
    requestId: "r",
    profile: buildDemoProfile(TODAY),
  };

  it("is sent as the recipient's billing address country code, and nothing else of the address", () => {
    const body = toPayPalInvoice(draft, options);
    expect(body.primary_recipients[0].billing_info).toEqual({
      email_address: "buyer@personal.example.com",
      business_name: "Casa Verde",
      address: { country_code: "PT" },
    });
  });

  it("is left out when the client has none", () => {
    const body = toPayPalInvoice(
      { ...draft, client: { name: "Casa Verde", email: "buyer@personal.example.com" } },
      { ...options, profile: EMPTY_PROFILE },
    );
    expect(body.primary_recipients[0].billing_info).not.toHaveProperty("address");
  });

  it("is read back as the summary's client country", () => {
    const invoice: PayPalInvoice = {
      id: "INV2-A",
      status: "SENT",
      detail: { invoice_number: "INV-1", invoice_date: TODAY, currency_code: "EUR" },
      amount: { currency_code: "EUR", value: "100.00" },
      primary_recipients: [
        {
          billing_info: {
            email_address: "buyer@personal.example.com",
            business_name: "Casa Verde",
            address: { country_code: "PT" },
          },
        },
      ],
    };
    expect(toInvoiceSummary(invoice, TODAY, null)?.client.country).toBe("PT");
    invoice.primary_recipients = [{ billing_info: { email_address: "a@b.example" } }];
    expect(toInvoiceSummary(invoice, TODAY, null)?.client).not.toHaveProperty("country");
  });
});

import { describe, expect, it } from "vitest";
import { toInvoiceSummary } from "@/lib/paypal/map";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { ActualPayout } from "@/types";
import paidFixture from "../fixtures/paypal/invoice-paid.json";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const TODAY = "2026-10-17";
const unpaid = unpaidFixture as PayPalInvoice;
const paid = paidFixture as PayPalInvoice;

function dueOn(date: string): PayPalInvoice {
  return {
    ...unpaid,
    detail: {
      ...unpaid.detail,
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: date },
    },
  };
}

function paidOn(date: string): PayPalInvoice {
  return {
    ...paid,
    payments: { transactions: [{ ...paid.payments?.transactions?.[0], payment_date: date }] },
  };
}

describe("toInvoiceSummary", () => {
  it("maps the PayPal fields", () => {
    expect(toInvoiceSummary(unpaid, TODAY, null)).toEqual({
      id: "INV2-TEST-0001-AAAA-BBBB",
      number: "INV-0101",
      client: { name: "Tandem Health", email: "buyer@personal.example.com" },
      work: "Pitch deck design",
      amount: { currency: "USD", value: "900.00" },
      issuedOn: "2026-10-09",
      dueOn: "2026-10-30",
      paidOn: null,
      paypalStatus: "SENT",
      dueState: "on_time",
      daysLate: 0,
      payoutInr: null,
      actualPayout: null,
      purposeCode: "P1099",
      payLink: "https://www.sandbox.paypal.com/invoice/p/#TEST0001",
    });
  });

  it("marks an invoice paid early", () => {
    const summary = toInvoiceSummary(paid, TODAY, null);
    expect(summary).toMatchObject({ dueState: "paid", paidOn: "2026-10-15", daysLate: 0 });
    expect(summary?.client.name).toBe("Mike Halden");
  });

  it("counts the days a paid invoice was late", () => {
    const summary = toInvoiceSummary(paidOn("2026-10-19"), TODAY, null);
    expect(summary).toMatchObject({ dueState: "paid", paidOn: "2026-10-19", daysLate: 3 });
  });

  it("marks an unpaid invoice past its due date overdue", () => {
    const summary = toInvoiceSummary(dueOn("2026-10-12"), TODAY, null);
    expect(summary).toMatchObject({ dueState: "overdue", daysLate: 5 });
  });

  it("marks an invoice due in 2 days as due soon", () => {
    const summary = toInvoiceSummary(dueOn("2026-10-19"), TODAY, null);
    expect(summary).toMatchObject({ dueState: "due_soon", daysLate: 0 });
  });

  it("keeps an invoice due in 10 days on time", () => {
    expect(toInvoiceSummary(dueOn("2026-10-27"), TODAY, null)?.dueState).toBe("on_time");
  });

  it("treats an invoice due today as due soon", () => {
    expect(toInvoiceSummary(dueOn(TODAY), TODAY, null)?.dueState).toBe("due_soon");
  });

  it("uses the invoice date when there is no due date", () => {
    const missing: PayPalInvoice = {
      ...unpaid,
      detail: { ...unpaid.detail, payment_term: undefined },
    };
    const summary = toInvoiceSummary(missing, TODAY, null);
    expect(summary).toMatchObject({ dueOn: "2026-10-09", dueState: "overdue", daysLate: 8 });
  });

  it("drops a reference that is not a known purpose code", () => {
    const unknown: PayPalInvoice = { ...unpaid, detail: { ...unpaid.detail, reference: "P9999" } };
    expect(toInvoiceSummary(unknown, TODAY, null)?.purposeCode).toBeNull();
  });

  it("leaves the pay link empty when PayPal sends none", () => {
    const bare: PayPalInvoice = { ...unpaid, detail: { ...unpaid.detail, metadata: undefined } };
    expect(toInvoiceSummary(bare, TODAY, null)?.payLink).toBe("");
  });

  it("names a client by person when there is no business name", () => {
    const person: PayPalInvoice = {
      ...unpaid,
      primary_recipients: [
        {
          billing_info: {
            email_address: "pat@personal.example.com",
            name: { given_name: "Pat", surname: "Kim" },
          },
        },
      ],
    };
    expect(toInvoiceSummary(person, TODAY, null)?.client.name).toBe("Pat Kim");
  });

  it("keeps the actual payout it is given", () => {
    const payout: ActualPayout = {
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      exchangeRate: null,
      netInr: null,
      source: "invoice_payment",
    };
    expect(toInvoiceSummary(paid, TODAY, payout)?.actualPayout).toBe(payout);
  });

  it("skips an invoice in a currency Dueline does not support", () => {
    const yen: PayPalInvoice = { ...unpaid, amount: { currency_code: "JPY", value: "90000" } };
    expect(toInvoiceSummary(yen, TODAY, null)).toBeNull();
  });
});

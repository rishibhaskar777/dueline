import { describe, expect, it } from "vitest";
import { LUT_NOTE } from "@/lib/paypal/invoice-body";
import { amountDueOf, isUnderLut, toInvoiceSummary } from "@/lib/paypal/map";
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
      riskLevel: null,
    });
  });

  it("marks an invoice paid early", () => {
    const summary = toInvoiceSummary(paid, TODAY, null);
    expect(summary).toMatchObject({ dueState: "paid", paidOn: "2026-10-15", daysLate: 0 });
    expect(summary?.client.name).toBe("Mike Halden");
  });

  it("converts a payment timestamp to the Asia/Kolkata date", () => {
    expect(toInvoiceSummary(paidOn("2026-10-15T20:30:00Z"), TODAY, null)?.paidOn).toBe(
      "2026-10-16",
    );
    expect(toInvoiceSummary(paidOn("2026-10-15 11:42:00 +0000"), TODAY, null)?.paidOn).toBe(
      "2026-10-15",
    );
  });

  it("takes the paid date from the payout's timestamp in India time", () => {
    // Paid at 01:06 IST on 30 Oct. PayPal's own payment_date says 29 Oct.
    const payout: ActualPayout = {
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      exchangeRate: null,
      netInr: null,
      source: "paypal_capture",
      paidAt: "2026-10-29T19:36:37Z",
      transactionId: "5GX12345AB6789012",
    };
    const summary = toInvoiceSummary(paidOn("2026-10-29"), TODAY, payout);
    expect(summary?.paidOn).toBe("2026-10-30");
  });

  it("falls back to PayPal's payment date when the payout has no timestamp", () => {
    const payout: ActualPayout = {
      fee: { currency: "USD", value: "20.10" },
      net: { currency: "USD", value: "429.90" },
      exchangeRate: null,
      netInr: null,
      source: "invoice_payment",
      paidAt: null,
      transactionId: "5GX12345AB6789012",
    };
    expect(toInvoiceSummary(paidOn("2026-10-29"), TODAY, payout)?.paidOn).toBe("2026-10-29");
  });

  it("finds the LUT line in the invoice note", () => {
    const note = `Thank you\n${LUT_NOTE}`;
    expect(isUnderLut({ ...paid, detail: { ...paid.detail, note } })).toBe(true);
    expect(isUnderLut({ ...paid, detail: { ...paid.detail, note: "Thank you" } })).toBe(false);
    expect(isUnderLut(paid)).toBe(false);
  });

  it("works out the amount still due", () => {
    const partly: PayPalInvoice = {
      ...unpaid,
      status: "PARTIALLY_PAID",
      payments: { paid_amount: { currency_code: "USD", value: "400.50" } },
    };
    const amount = { currency: "USD" as const, value: "900.00" };
    expect(amountDueOf(partly, amount)).toEqual({ currency: "USD", value: "499.50" });
    expect(amountDueOf(unpaid, amount)).toEqual(amount);
    expect(
      amountDueOf(
        { ...partly, payments: { paid_amount: { currency_code: "EUR", value: "1.00" } } },
        amount,
      ),
    ).toEqual(amount);
    expect(
      amountDueOf(
        { ...partly, payments: { paid_amount: { currency_code: "USD", value: "950.00" } } },
        amount,
      ).value,
    ).toBe("0.00");
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
      paidAt: null,
      transactionId: "5GX12345AB6789012",
    };
    expect(toInvoiceSummary(paid, TODAY, payout)?.actualPayout).toBe(payout);
  });

  it("skips an invoice in a currency Dueline does not support", () => {
    const yen: PayPalInvoice = { ...unpaid, amount: { currency_code: "JPY", value: "90000" } };
    expect(toInvoiceSummary(yen, TODAY, null)).toBeNull();
  });
});

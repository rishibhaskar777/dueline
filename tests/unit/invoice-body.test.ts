import { beforeEach, describe, expect, it } from "vitest";
import { requestMemo, toPayPalInvoice } from "@/lib/paypal/invoice-body";
import type { CreateInvoiceRequest } from "@/types";
import { stubEnv } from "../support/env";

const requestId = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";

const draft: CreateInvoiceRequest["draft"] = {
  client: { name: "Halden Coffee Co.", email: "mike@haldencoffee.example" },
  currency: "USD",
  dueOn: "2026-11-30",
  items: [
    { name: "Logo design (3 options)", quantity: 3, unitAmount: "120.00" },
    { name: "Revision round", quantity: 2, unitAmount: "45.00", sourceQuote: "$45 a round" },
  ],
  purposeCode: "P1099",
  includeLutNote: false,
};

const options = { invoiceNumber: "0042", invoiceDate: "2026-10-30", requestId };

beforeEach(() => stubEnv());

describe("toPayPalInvoice", () => {
  it("builds a plain invoice from a draft", () => {
    expect(toPayPalInvoice(draft, options)).toEqual({
      detail: {
        invoice_number: "0042",
        reference: "P1099",
        invoice_date: "2026-10-30",
        currency_code: "USD",
        memo: `dueline-request:${requestId}`,
        payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: "2026-11-30" },
      },
      primary_recipients: [
        {
          billing_info: {
            email_address: "mike@haldencoffee.example",
            business_name: "Halden Coffee Co.",
          },
        },
      ],
      items: [
        {
          name: "Logo design (3 options)",
          quantity: "3",
          unit_amount: { currency_code: "USD", value: "120.00" },
        },
        {
          name: "Revision round",
          quantity: "2",
          unit_amount: { currency_code: "USD", value: "45.00" },
        },
      ],
    });
  });

  it("sets a reference only when a purpose code is chosen", () => {
    expect(toPayPalInvoice(draft, options).detail.reference).toBe("P1099");
    const without = toPayPalInvoice({ ...draft, purposeCode: null }, options);
    expect(without.detail).not.toHaveProperty("reference");
  });

  it("puts the note and the LUT line on separate lines", () => {
    const body = toPayPalInvoice(
      { ...draft, note: "Files are in the shared folder.", includeLutNote: true },
      options,
    );
    expect(body.detail.note).toBe(
      "Files are in the shared folder.\nExport of services under LUT, without payment of IGST",
    );
    expect(toPayPalInvoice({ ...draft, includeLutNote: true }, options).detail.note).toBe(
      "Export of services under LUT, without payment of IGST",
    );
  });

  it("carries the request in the memo so the invoice can be found again", () => {
    expect(toPayPalInvoice(draft, options).detail.memo).toBe(requestMemo(requestId));
    expect(requestMemo(requestId)).toBe(`dueline-request:${requestId}`);
  });

  it("applies PayPal's invoice discount, says so in the note and moves the due date earlier", () => {
    const body = toPayPalInvoice(
      { ...draft, includeLutNote: true },
      { ...options, discount: { percent: 2, withinDays: 7 } },
    );
    expect(body.amount).toEqual({
      breakdown: { discount: { invoice_discount: { percent: "2" } } },
    });
    expect(body.detail.note).toBe(
      "Export of services under LUT, without payment of IGST\nIncludes a 2% early-payment discount, valid if paid by 6 Nov 2026",
    );
    expect(body.detail.payment_term.due_date).toBe("2026-11-06");
  });

  it("keeps the user's due date, and says it in the note, when it is sooner than the discount window", () => {
    const body = toPayPalInvoice(
      { ...draft, dueOn: "2026-11-02" },
      { ...options, discount: { percent: 3, withinDays: 14 } },
    );
    expect(body.detail.payment_term.due_date).toBe("2026-11-02");
    expect(body.detail.note).toContain("valid if paid by 2 Nov 2026");
    expect(body.detail.note).not.toContain("13 Nov");
  });

  it("leaves the amount out when there is no discount", () => {
    expect(toPayPalInvoice(draft, options)).not.toHaveProperty("amount");
  });
});

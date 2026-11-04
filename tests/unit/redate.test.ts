import { describe, expect, it } from "vitest";
import { requestMemo } from "@/lib/paypal/invoice-body";
import { needsRedating, redatedForSending } from "@/lib/paypal/redate";
import type { PayPalInvoice } from "@/lib/paypal/types";
import unpaidFixture from "../fixtures/paypal/invoice-unpaid.json";

const id = "3f2b8c1e-6a4d-4e8b-9c1a-2d5e7f9a0b1c";
const base = unpaidFixture as PayPalInvoice;

function balance(
  invoiceDate: string,
  dueDate: string | undefined,
  role = "balance",
): PayPalInvoice {
  return {
    ...base,
    status: "DRAFT",
    detail: {
      ...base.detail,
      invoice_date: invoiceDate,
      memo: requestMemo("req", "P1099", "998391", { role: role as "balance", id }),
      payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueDate },
    },
  };
}

describe("needsRedating", () => {
  it("is true for a balance draft only", () => {
    expect(needsRedating(balance("2026-10-01", "2026-10-15"))).toBe(true);
    expect(needsRedating(balance("2026-10-01", "2026-10-15", "deposit"))).toBe(false);
    expect(needsRedating({ ...balance("2026-10-01", "2026-10-15"), status: "SENT" })).toBe(false);
    expect(needsRedating({ ...base, status: "DRAFT" })).toBe(false);
  });
});

describe("redatedForSending", () => {
  it("keeps the number of days to pay and moves both dates", () => {
    const body = redatedForSending(balance("2026-10-01", "2026-10-15"), "2026-11-04");
    expect(body.detail.invoice_date).toBe("2026-11-04");
    expect(body.detail.payment_term.due_date).toBe("2026-11-18");
  });

  it("keeps the number, memo, items and recipients", () => {
    const saved = balance("2026-10-01", "2026-10-15");
    const body = redatedForSending(saved, "2026-11-04");
    expect(body.detail).toMatchObject({
      invoice_number: saved.detail.invoice_number,
      memo: saved.detail.memo,
      currency_code: saved.detail.currency_code,
    });
    expect(body.items).toEqual(saved.items);
    expect(body.primary_recipients).toEqual(saved.primary_recipients);
  });

  it("works across a month and a year end", () => {
    const body = redatedForSending(balance("2026-12-20", "2027-01-03"), "2027-02-27");
    expect(body.detail.payment_term.due_date).toBe("2027-03-13");
  });

  it("gives a draft that was due on its own date no extra days", () => {
    const body = redatedForSending(balance("2026-10-01", "2026-10-01"), "2026-11-04");
    expect(body.detail.payment_term.due_date).toBe("2026-11-04");
  });

  it("only moves the invoice date when no due date was saved", () => {
    const body = redatedForSending(balance("2026-10-01", undefined), "2026-11-04");
    expect(body.detail.payment_term).toEqual({ term_type: "DUE_ON_DATE_SPECIFIED" });
  });
});

import { describe, expect, it } from "vitest";
import { rupeesFromPayPal, statusLabel } from "@/components/receivables/invoice-status";
import { tandemInvoice } from "@/mocks/fixtures";
import type { InvoiceSummary } from "@/types";

function invoice(overrides: Partial<InvoiceSummary>): InvoiceSummary {
  return { ...tandemInvoice, ...overrides };
}

describe("statusLabel", () => {
  it("names each due state", () => {
    const today = "2026-10-30";
    expect(statusLabel(invoice({ dueState: "paid", dueOn: "2026-10-10" }), today)).toBe("Paid");
    expect(statusLabel(invoice({ dueState: "on_time", dueOn: "2026-11-20" }), today)).toBe(
      "On time",
    );
    expect(statusLabel(invoice({ dueState: "due_soon", dueOn: "2026-11-01" }), today)).toBe(
      "Due soon",
    );
    expect(statusLabel(invoice({ dueState: "overdue", dueOn: "2026-10-20" }), today)).toBe(
      "Overdue",
    );
  });

  it("says Due today for an unpaid invoice due on today's date", () => {
    expect(statusLabel(invoice({ dueState: "due_soon", dueOn: "2026-10-30" }), "2026-10-30")).toBe(
      "Due today",
    );
  });

  it("keeps Paid for an invoice paid on its due date", () => {
    expect(statusLabel(invoice({ dueState: "paid", dueOn: "2026-10-30" }), "2026-10-30")).toBe(
      "Paid",
    );
  });
});

describe("rupeesFromPayPal", () => {
  const payout = { ...tandemInvoice.actualPayout, netInr: 35617 } as NonNullable<
    InvoiceSummary["actualPayout"]
  >;

  it("is true only when PayPal reported the rupees", () => {
    expect(rupeesFromPayPal(invoice({ actualPayout: payout }))).toBe(true);
  });

  it("is false when PayPal gave its net but no rupees, or no figures at all", () => {
    expect(rupeesFromPayPal(invoice({ actualPayout: { ...payout, netInr: null } }))).toBe(false);
    expect(rupeesFromPayPal(invoice({ actualPayout: null }))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { payoutSourceNote, rateNote, statusLabel } from "@/components/receivables/invoice-status";
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

describe("outside PayPal", () => {
  it("names an invoice paid outside PayPal", () => {
    const outside = invoice({ dueState: "paid", payoutSource: "outside_paypal" });
    expect(statusLabel(outside, "2026-10-30")).toBe("Paid outside PayPal");
    expect(payoutSourceNote("outside_paypal")).toBe("outside PayPal");
  });
});

describe("rateNote", () => {
  it("names the day of the ECB rate behind a worked-out figure", () => {
    expect(rateNote(invoice({ rateDate: "2026-10-30" }))).toBe("ECB rate of 30 Oct 2026");
  });

  it("says nothing when PayPal reported the rupees", () => {
    expect(rateNote(invoice({ rateDate: null }))).toBeNull();
  });
});

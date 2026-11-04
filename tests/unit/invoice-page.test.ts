import { describe, expect, it } from "vitest";
import { headerActions } from "@/components/invoice-page/header-actions";
import { payoutPanel } from "@/components/invoice-page/payout-panel";
import { timelineDot } from "@/components/invoice-page/timeline-dot";
import type { InvoiceDetailResponse, InvoiceSummary, TimelineKind } from "@/types";
import { openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

function view(
  invoice: InvoiceSummary,
  remind: boolean,
): Pick<InvoiceDetailResponse, "invoice" | "details"> {
  return {
    invoice,
    details: {
      clientKey: "okafor-reyes",
      clientPaySpeed: null,
      items: [],
      note: "",
      underLut: false,
      hiddenFromDemo: false,
      split: null,
      actions: { remind, recordPayment: false, cancel: false, send: false },
    },
  };
}

describe("the invoice page header", () => {
  it("offers the payer link and a reminder on an overdue invoice", () => {
    expect(headerActions(view(overdueInvoice("2026-10-25", 8), true))).toEqual({
      openPayerLink: true,
      viewOnPayPal: false,
      copyPayerLink: true,
      sendReminder: true,
    });
  });

  it("offers the payer link but no reminder when the server says none is due", () => {
    expect(headerActions(view(openInvoice("2026-12-01"), false))).toEqual({
      openPayerLink: true,
      viewOnPayPal: false,
      copyPayerLink: true,
      sendReminder: false,
    });
  });

  it("offers only a view on PayPal, and no reminder, on a paid invoice", () => {
    expect(headerActions(view(paidInvoice("2026-10-25", "2026-10-20"), false))).toEqual({
      openPayerLink: false,
      viewOnPayPal: true,
      copyPayerLink: false,
      sendReminder: false,
    });
  });

  it("offers nothing to pay on a cancelled invoice", () => {
    const cancelled = { ...openInvoice("2026-12-01"), paypalStatus: "CANCELLED" };
    expect(headerActions(view(cancelled, false))).toEqual({
      openPayerLink: false,
      viewOnPayPal: false,
      copyPayerLink: false,
      sendReminder: false,
    });
  });
});

describe("the history timeline", () => {
  it("colours each kind of event", () => {
    const kinds: Record<TimelineKind, string> = {
      reminder: "blue",
      viewed: "blue",
      overdue: "red",
      due: "amber",
      sent: "foreground",
      created: "muted",
      cancelled: "muted",
      paid: "green",
    };
    for (const [kind, tone] of Object.entries(kinds)) {
      expect(timelineDot(kind as TimelineKind), kind).toBe(tone);
    }
  });
});

describe("the payout panel", () => {
  it("says what reaches the bank, from the rate, for an unpaid invoice", () => {
    const invoice = {
      ...overdueInvoice("2026-10-25", 8),
      payoutInr: 70793,
      payoutSource: "estimate" as const,
      rateDate: "2026-10-30",
    };
    expect(payoutPanel(invoice)).toEqual({
      label: "Reaches your bank, about",
      rupees: 70793,
      note: "ECB rate of 30 Oct 2026, after PayPal's fee",
    });
  });

  it("says what reached the bank on a paid invoice, in PayPal's own words", () => {
    const invoice = {
      ...paidInvoice("2026-10-25", "2026-10-20"),
      payoutInr: 60000,
      payoutSource: "paypal" as const,
    };
    expect(payoutPanel(invoice)).toEqual({
      label: "Reached your bank",
      rupees: 60000,
      note: "PayPal's own figure",
    });
  });

  it("has no panel without a figure or for a cancelled invoice", () => {
    expect(payoutPanel(openInvoice("2026-12-01"))).toBeNull();
    expect(
      payoutPanel({ ...openInvoice("2026-12-01"), payoutInr: 1000, paypalStatus: "CANCELLED" }),
    ).toBeNull();
  });
});

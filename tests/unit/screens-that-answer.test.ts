import { describe, expect, it, vi } from "vitest";
import { digestLines } from "@/components/dashboard/digest-lines";
import { isNothingDue } from "@/components/dashboard/ForecastWidget";
import { dueSentence, lutSentence } from "@/components/invoice-page/invoice-facts";
import {
  publishOverdueCount,
  readOverdueCount,
  subscribeToOverdueCount,
} from "@/components/layout/overdue-count";
import { previewEmail } from "@/components/nudges/nudge-email";
import { mergeSentence } from "@/components/clients/merge-text";
import { buildChecklist } from "@/lib/checklist/checklist";
import { haldenLabelsInvoice, okaforInvoice, tandemInvoice } from "@/mocks/fixtures";
import type { DailyDigest } from "@/types";

describe("dueSentence", () => {
  it("says how late an overdue invoice is", () => {
    const overdue = {
      ...okaforInvoice,
      dueState: "overdue",
      dueOn: "2026-10-10",
      daysLate: 7,
    } as const;
    expect(dueSentence(overdue, "2026-10-17")).toBe("10 Oct 2026 · 7 days late");
  });

  it("says how long is left for an invoice that is not due yet", () => {
    const open = {
      ...tandemInvoice,
      dueState: "on_time",
      paidOn: null,
      dueOn: "2026-10-21",
    } as const;
    expect(dueSentence(open, "2026-10-17")).toBe("21 Oct 2026 · due in 4 days");
    expect(dueSentence({ ...open, dueOn: "2026-10-17" }, "2026-10-17")).toBe(
      "17 Oct 2026 · due today",
    );
  });

  it("gives the paid date once paid", () => {
    expect(dueSentence(haldenLabelsInvoice, "2026-10-30")).toContain("paid");
  });
});

describe("lutSentence", () => {
  it("names the ARN printed in the invoice note", () => {
    const note =
      "SUPPLY MEANT FOR EXPORT UNDER LETTER OF UNDERTAKING\nLUT ARN: AD290326000123Z\nPlace of supply: outside India";
    expect(lutSentence(true, note)).toBe("Under LUT · ARN AD290326000123Z");
  });

  it("says so when there is no ARN on the invoice, and when there is no LUT", () => {
    expect(lutSentence(true, "Export under LUT")).toBe("Under LUT · no ARN on this invoice");
    expect(lutSentence(false, "")).toBe("Not under LUT");
  });
});

describe("buildChecklist", () => {
  const done = {
    profile: { yourName: "Riya", businessName: "Riya Designs", lutArn: "AD290326000123Z" },
    prepareReminders: true,
    anyInvoiceSent: true,
    exportDownloaded: true,
    dismissed: false,
  };

  it("ticks every item from the data and links each to where it is done", () => {
    const { items } = buildChecklist(done);
    expect(items.map(({ id, done: ticked }) => [id, ticked])).toEqual([
      ["profile", true],
      ["lut", true],
      ["first_invoice", true],
      ["morning_reminders", true],
      ["first_export", true],
    ]);
    expect(items.map(({ href }) => href)).toEqual([
      "/profile",
      "/profile",
      "/invoices/new",
      "/settings",
      "/export",
    ]);
  });

  it("leaves an item open until its data is there", () => {
    const { items } = buildChecklist({
      profile: { yourName: "Riya", businessName: " ", lutArn: null },
      prepareReminders: false,
      anyInvoiceSent: false,
      exportDownloaded: false,
      dismissed: false,
    });
    expect(items.every((item) => !item.done)).toBe(true);
  });

  it("carries the dismissal", () => {
    expect(buildChecklist({ ...done, dismissed: true }).dismissed).toBe(true);
  });
});

describe("previewEmail", () => {
  it("puts the Pay here line before the sign-off, as the email will", () => {
    const preview = previewEmail(
      "sam@client.example",
      "Invoice INV-1 is overdue",
      "Hi Sam,\n\nInvoice INV-1 is overdue.\n\nThank you,\nRiya",
      "https://www.sandbox.paypal.com/invoice/p/#ABC",
    );
    expect(preview).toEqual({
      to: "sam@client.example",
      subject: "Invoice INV-1 is overdue",
      paragraphs: [
        "Hi Sam,",
        "Invoice INV-1 is overdue.",
        "Pay here: https://www.sandbox.paypal.com/invoice/p/#ABC",
        "Thank you,\nRiya",
      ],
    });
  });

  it("adds no Pay here line when the invoice has no link", () => {
    expect(previewEmail("a@b.example", "s", "One\n\nTwo", "").paragraphs).toEqual(["One", "Two"]);
  });
});

describe("isNothingDue", () => {
  it("is true only for a window with no rupees and no invoices", () => {
    expect(isNothingDue({ label: "x", expectedInr: 0, bestCaseInr: 0, invoices: 0 })).toBe(true);
    expect(isNothingDue({ label: "x", expectedInr: 0, bestCaseInr: 100, invoices: 1 })).toBe(false);
    expect(isNothingDue({ label: "x", expectedInr: 80, bestCaseInr: 100, invoices: 1 })).toBe(
      false,
    );
  });
});

describe("digestLines", () => {
  const digest: DailyDigest = {
    day: "2026-11-01",
    paidSinceYesterday: [],
    newlyOverdue: [
      {
        invoiceId: "a",
        invoiceNumber: "0015",
        clientName: "Northpine Studio",
        amount: { currency: "CAD", value: "380.00" },
      },
    ],
    dueSoon: [],
    preparedDrafts: 0,
    rateAlerts: [],
  };

  it("names an invoice as Invoice number, client and amount", () => {
    expect(digestLines(digest)[0].text).toBe("Invoice 0015 · Northpine Studio (CA$380.00)");
  });
});

describe("mergeSentence", () => {
  it("says what the merge does and that PayPal is untouched", () => {
    expect(
      mergeSentence({ name: "Maya Studio", email: "maya@new.example" }, { name: "Okafor & Reyes" }),
    ).toBe(
      "Invoices from Maya Studio (maya@new.example) will count as Okafor & Reyes for risk, totals and reminders. PayPal invoices are not changed.",
    );
  });
});

describe("the overdue count", () => {
  it("tells subscribers when the Receivables poll publishes a new count", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOverdueCount(listener);

    publishOverdueCount(3);
    expect(readOverdueCount()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(1);

    publishOverdueCount(3);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    publishOverdueCount(0);
    expect(readOverdueCount()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

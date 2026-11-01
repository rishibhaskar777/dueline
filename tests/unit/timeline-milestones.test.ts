import { describe, expect, it } from "vitest";
import { describeTimelineEvent } from "@/components/invoice-page/timeline-text";
import { buildTimeline } from "@/lib/invoices/timeline";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { InvoiceSummary } from "@/types";
import { openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

function raw(
  status: PayPalInvoice["status"],
  memo?: string,
  metadata: PayPalInvoice["detail"]["metadata"] = {},
): PayPalInvoice {
  return {
    id: "INV2-TEST",
    status,
    detail: {
      invoice_number: "INV-0001",
      invoice_date: "2026-08-01",
      currency_code: "EUR",
      ...(memo ? { memo } : {}),
      metadata,
    },
  };
}

function build(
  invoice: PayPalInvoice,
  summary: InvoiceSummary,
  today: string,
): { kind: string; at: string }[] {
  return buildTimeline({ invoice, summary, reminders: [], activity: [], today }).map(
    ({ kind, at }) => ({ kind, at }),
  );
}

const sentAndCreated = {
  create_time: "2026-08-01T05:00:00Z",
  first_sent_time: "2026-08-01T05:02:00Z",
};

describe("the due and overdue milestones", () => {
  it("adds the due date and the day after it to an unpaid invoice that has gone past due", () => {
    const events = build(
      raw("SENT", undefined, sentAndCreated),
      overdueInvoice("2026-08-15", 5),
      "2026-08-20",
    );

    expect(events).toEqual([
      { kind: "overdue", at: "2026-08-16" },
      { kind: "due", at: "2026-08-15" },
      { kind: "sent", at: "2026-08-01T05:02:00Z" },
      { kind: "created", at: "2026-08-01T05:00:00Z" },
    ]);
  });

  it("shows nothing before the due date, and only the due date on the day itself", () => {
    const summary = openInvoice("2026-08-15");
    expect(build(raw("SENT"), summary, "2026-08-14").map(({ kind }) => kind)).toEqual([
      "sent",
      "created",
    ]);
    expect(build(raw("SENT"), summary, "2026-08-15").map(({ kind }) => kind)).toEqual([
      "due",
      "sent",
      "created",
    ]);
  });

  it("adds the due date but no overdue day to an invoice paid before it fell due", () => {
    const kinds = build(raw("PAID"), paidInvoice("2026-08-15", "2026-08-10"), "2026-08-20").map(
      ({ kind }) => kind,
    );
    expect(kinds).toEqual(["due", "paid", "sent", "created"]);
  });

  it("adds no overdue day to an invoice paid on the due date", () => {
    const kinds = build(raw("PAID"), paidInvoice("2026-08-15", "2026-08-15"), "2026-08-20").map(
      ({ kind }) => kind,
    );
    expect(kinds).not.toContain("overdue");
  });

  it("adds the overdue day to an invoice that was paid late", () => {
    const events = build(raw("PAID"), paidInvoice("2026-08-15", "2026-08-20"), "2026-08-25");
    expect(events.map(({ kind }) => kind)).toEqual(["paid", "overdue", "due", "sent", "created"]);
    expect(events.find(({ kind }) => kind === "overdue")?.at).toBe("2026-08-16");
  });

  it("adds the overdue day to a cancelled invoice only if it was cancelled after the due date", () => {
    const summary = { ...overdueInvoice("2026-08-15", 5), paypalStatus: "CANCELLED" };
    const before = raw("CANCELLED", undefined, { last_update_time: "2026-08-10T05:00:00Z" });
    const after = raw("CANCELLED", undefined, { last_update_time: "2026-08-18T05:00:00Z" });

    expect(build(before, summary, "2026-08-20").map(({ kind }) => kind)).toEqual([
      "due",
      "cancelled",
      "sent",
      "created",
    ]);
    expect(build(after, summary, "2026-08-20").map(({ kind }) => kind)).toEqual([
      "cancelled",
      "overdue",
      "due",
      "sent",
      "created",
    ]);
  });

  it("leaves a draft without milestones", () => {
    const events = build(raw("DRAFT"), openInvoice("2026-08-15"), "2026-08-20");
    expect(events.map(({ kind }) => kind)).toEqual(["created"]);
  });

  it("describes both milestones in plain words", () => {
    expect(describeTimelineEvent({ id: "due", kind: "due", at: "2026-08-15" })).toBe("Payment due");
    expect(describeTimelineEvent({ id: "overdue", kind: "overdue", at: "2026-08-16" })).toBe(
      "Became overdue",
    );
  });
});

describe("a demo-story invoice's timeline", () => {
  const memo = "dueline-demo:2:okafor-website-copy P1099 sac:998391";
  const realTimes = {
    create_time: "2026-11-01T09:12:00Z",
    first_sent_time: "2026-11-01T09:13:00Z",
  };
  const summary: InvoiceSummary = {
    ...paidInvoice("2026-09-30", "2026-10-16"),
    paypalStatus: "MARKED_AS_PAID",
    issuedOn: "2026-09-16",
  };

  it("dates created and sent by the issue date at 09:00 India time, and paid by the story's paid date", () => {
    const events = build(raw("MARKED_AS_PAID", memo, realTimes), summary, "2026-11-01");

    expect(events.find(({ kind }) => kind === "created")?.at).toBe("2026-09-16T03:30:00.000Z");
    expect(events.find(({ kind }) => kind === "sent")?.at).toBe("2026-09-16T03:30:00.000Z");
    expect(events.find(({ kind }) => kind === "paid")?.at).toBe("2026-10-16");
    expect(events.map(({ kind }) => kind)).toEqual(["paid", "overdue", "due", "sent", "created"]);
  });

  it("keeps PayPal's own times for an invoice that is not part of the story", () => {
    const events = build(
      raw("MARKED_AS_PAID", "dueline-request:abc", realTimes),
      summary,
      "2026-11-01",
    );

    expect(events.find(({ kind }) => kind === "created")?.at).toBe(realTimes.create_time);
    expect(events.find(({ kind }) => kind === "sent")?.at).toBe(realTimes.first_sent_time);
  });
});

import { describe, expect, it } from "vitest";
import { describeTimelineEvent, timelineWhen } from "@/components/invoice-page/timeline-text";
import { formFromInvoice } from "@/components/invoices/invoice-form";
import { buildTimeline } from "@/lib/invoices/timeline";
import type { PayPalInvoice } from "@/lib/paypal/types";
import type { ActivityEvent, InvoiceDetails, InvoiceSummary } from "@/types";
import { OKAFOR, overdueInvoice, paidInvoice } from "../support/summaries";

function raw(status: PayPalInvoice["status"], metadata: PayPalInvoice["detail"]["metadata"] = {}) {
  return {
    id: "INV2-TEST",
    status,
    detail: {
      invoice_number: "INV-0001",
      invoice_date: "2026-08-01",
      currency_code: "EUR",
      metadata,
    },
  } satisfies PayPalInvoice;
}

const viewed = (id: string, at: string): ActivityEvent => ({
  id,
  kind: "viewed",
  invoiceId: "INV2-TEST",
  invoiceNumber: "INV-0001",
  clientName: "Okafor & Reyes",
  at,
});

describe("buildTimeline", () => {
  it("lists created, sent, reminders and views newest first", () => {
    const events = buildTimeline({
      today: "2026-08-01",
      invoice: raw("SENT", {
        create_time: "2026-08-01T05:00:00Z",
        first_sent_time: "2026-08-01T05:02:00Z",
      }),
      summary: overdueInvoice("2026-08-15", 20),
      reminders: [
        { tone: "gentle", sentAt: "2026-08-20T04:00:00Z", channel: "paypal" },
        { tone: "firm", sentAt: "2026-08-28T04:00:00Z", channel: "paypal" },
      ],
      activity: [viewed("v1", "2026-08-02T09:00:00Z")],
    });

    expect(events.map(({ kind }) => kind)).toEqual([
      "reminder",
      "reminder",
      "viewed",
      "sent",
      "created",
    ]);
    expect(events[0]).toMatchObject({ tone: "firm", at: "2026-08-28T04:00:00Z" });
  });

  it("tells a payment through PayPal from one made outside it", () => {
    const through = buildTimeline({
      today: "2026-08-01",
      invoice: raw("PAID"),
      summary: paidInvoice("2026-08-15", "2026-08-20"),
      reminders: [],
      activity: [],
    });
    expect(through[0]).toMatchObject({ kind: "paid", via: "paypal", at: "2026-08-20" });

    const outside = buildTimeline({
      today: "2026-08-01",
      invoice: raw("MARKED_AS_PAID"),
      summary: { ...paidInvoice("2026-08-15", "2026-08-20"), paypalStatus: "MARKED_AS_PAID" },
      reminders: [],
      activity: [],
    });
    expect(outside[0]).toMatchObject({ kind: "paid", via: "outside_paypal" });
  });

  it("uses the payment's own time when PayPal gave one", () => {
    const summary: InvoiceSummary = {
      ...paidInvoice("2026-08-15", "2026-08-20"),
      actualPayout: {
        fee: { currency: "EUR", value: "1.00" },
        net: { currency: "EUR", value: "719.00" },
        exchangeRate: null,
        netInr: 70_000,
        source: "paypal_capture",
        paidAt: "2026-08-20T03:30:00Z",
        transactionId: "CAP-1",
      },
    };
    const [paid] = buildTimeline({
      today: "2026-08-01",
      invoice: raw("PAID"),
      summary,
      reminders: [],
      activity: [],
    });
    expect(paid.at).toBe("2026-08-20T03:30:00Z");
  });

  it("marks a cancelled invoice and leaves a draft unsent", () => {
    const cancelled = buildTimeline({
      today: "2026-08-01",
      invoice: raw("CANCELLED", { last_update_time: "2026-09-01T10:00:00Z" }),
      summary: overdueInvoice("2026-08-15", 20),
      reminders: [],
      activity: [],
    });
    expect(cancelled[0]).toMatchObject({ kind: "cancelled", at: "2026-09-01T10:00:00Z" });

    const draft = buildTimeline({
      today: "2026-08-01",
      invoice: raw("DRAFT"),
      summary: overdueInvoice("2026-08-15", 20),
      reminders: [],
      activity: [],
    });
    expect(draft.map(({ kind }) => kind)).toEqual(["created"]);
  });

  it("falls back to the issue date when PayPal gives no sent time", () => {
    const events = buildTimeline({
      today: "2026-08-01",
      invoice: raw("SENT"),
      summary: overdueInvoice("2026-08-15", 20),
      reminders: [],
      activity: [],
    });
    expect(events.find(({ kind }) => kind === "sent")?.at).toBe("2026-08-01");
  });
});

describe("timeline text", () => {
  it("describes each event in plain words", () => {
    expect(
      describeTimelineEvent({
        id: "a",
        kind: "reminder",
        at: "x",
        tone: "firm",
        channel: "paypal",
      }),
    ).toBe("Reminder sent through PayPal (firm tone)");
    expect(
      describeTimelineEvent({
        id: "a",
        kind: "reminder",
        at: "x",
        tone: "gentle",
        channel: "email",
      }),
    ).toBe("Message sent from your email (gentle tone)");
    expect(describeTimelineEvent({ id: "a", kind: "paid", at: "x", via: "outside_paypal" })).toBe(
      "Paid outside PayPal",
    );
    expect(describeTimelineEvent({ id: "a", kind: "paid", at: "x", via: "paypal" })).toBe(
      "Paid through PayPal",
    );
  });

  it("shows a date alone when there is no time", () => {
    expect(timelineWhen("2026-08-20")).toBe("20 Aug 2026");
    expect(timelineWhen("2026-08-20T03:30:00Z")).toContain("9:00");
  });
});

describe("formFromInvoice", () => {
  const details: InvoiceDetails = {
    clientKey: "okafor-reyes",
    items: [
      {
        name: "Logo",
        quantity: 2,
        unitAmount: { currency: "EUR", value: "300.00" },
        sac: "998391",
      },
      { name: "Copy", quantity: 1, unitAmount: { currency: "EUR", value: "120.00" }, sac: null },
    ],
    note: "SUPPLY MEANT FOR EXPORT",
    underLut: true,
    hiddenFromDemo: false,
    actions: { remind: false, recordPayment: false, cancel: false },
  };

  it("keeps the client and items and starts the rest afresh", () => {
    const form = formFromInvoice({ invoice: overdueInvoice("2026-08-15", 5), details }, "998314");

    expect(form).toMatchObject({
      clientName: OKAFOR.name,
      clientEmail: OKAFOR.email,
      currency: "EUR",
      dueOn: "",
      note: "",
      purposeCode: "P1099",
      includeLutNote: true,
      discountOn: false,
    });
    expect(
      form.items.map(({ name, quantity, unitAmount, sac }) => [name, quantity, unitAmount, sac]),
    ).toEqual([
      ["Logo", "2", "300.00", "998391"],
      ["Copy", "1", "120.00", "998314"],
    ]);
  });

  it("gives every copied item its own key", () => {
    const form = formFromInvoice({ invoice: overdueInvoice("2026-08-15", 5), details });
    expect(new Set(form.items.map(({ key }) => key)).size).toBe(2);
  });
});

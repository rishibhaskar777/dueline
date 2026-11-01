import { describe, expect, it } from "vitest";
import { storyActivityId, storyEventAt, storyMoment } from "@/lib/demo/story-events";
import { openInvoice, paidInvoice } from "../support/summaries";

describe("storyMoment", () => {
  it("is 09:00 India time on the date", () => {
    expect(storyMoment("2026-08-03")).toBe("2026-08-03T03:30:00.000Z");
  });
});

describe("storyEventAt", () => {
  const seededNow = "2026-11-01T10:00:00.000Z";

  it("places a sent event on the invoice's issue date", () => {
    const invoice = { ...openInvoice("2026-12-01"), issuedOn: "2026-10-20" };

    expect(storyEventAt("sent", invoice, seededNow)).toBe(storyMoment("2026-10-20"));
  });

  it("places a payment recorded outside PayPal on its paid date", () => {
    const invoice = {
      ...paidInvoice("2026-11-01", "2026-10-25"),
      paypalStatus: "MARKED_AS_PAID",
      paidOn: "2026-10-25",
    };

    expect(storyEventAt("paid", invoice, seededNow)).toBe(storyMoment("2026-10-25"));
  });

  it("keeps the reported time for a payment made through PayPal", () => {
    const invoice = {
      ...paidInvoice("2026-11-01", "2026-10-25"),
      paypalStatus: "PAID",
      paidOn: "2026-10-25",
    };

    expect(storyEventAt("paid", invoice, seededNow)).toBe(seededNow);
  });

  it("never places an event in the future", () => {
    const invoice = { ...openInvoice("2026-12-01"), issuedOn: "2026-11-05" };

    expect(storyEventAt("sent", invoice, seededNow)).toBe(seededNow);
  });
});

describe("storyActivityId", () => {
  it("is the same for the same generation, key and kind", () => {
    expect(storyActivityId(2, "halden-1", "paid")).toBe("demo:2:halden-1:paid");
    expect(storyActivityId(2, "halden-1", "sent")).not.toBe(storyActivityId(2, "halden-1", "paid"));
  });
});

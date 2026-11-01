import { describe, expect, it } from "vitest";
import { findNewMessages } from "@/components/notifications/new-notifications";
import type { ActivityEvent, TriggeredRateAlert } from "@/types";

const alert: TriggeredRateAlert = {
  currency: "USD",
  direction: "above",
  threshold: 96,
  rate: 96.4,
};
const paid: ActivityEvent = {
  id: "paid:1",
  kind: "paid",
  invoiceId: "INV2-1",
  invoiceNumber: "INV-0046",
  clientName: "Halden Coffee Co.",
  at: "2026-11-05T10:00:00Z",
  amount: { currency: "USD", value: "280.00" },
};
const viewed: ActivityEvent = { ...paid, id: "viewed:1", kind: "viewed" };

describe("findNewMessages", () => {
  it("only records what is already there on the first reading", () => {
    const { seen, messages } = findNewMessages(null, [alert], [paid]);
    expect(messages).toEqual([]);
    expect(seen).toEqual({ alerts: ["USD:above:96"], events: ["paid:1"] });
  });

  it("announces a rate alert that has just been triggered, once", () => {
    const first = findNewMessages(null, [], []);
    const second = findNewMessages(first.seen, [alert], []);
    expect(second.messages).toEqual([
      { id: "USD:above:96", title: "Rate alert", body: "USD above ₹96: now ₹96.40" },
    ]);
    expect(findNewMessages(second.seen, [alert], []).messages).toEqual([]);
  });

  it("announces a payment that has just arrived, but not other activity", () => {
    const first = findNewMessages(null, [], []);
    const { messages } = findNewMessages(first.seen, [], [paid, viewed]);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ title: "Payment received" });
    expect(messages[0].body).toContain("Halden Coffee Co. paid INV-0046");
  });

  it("announces an alert again after it clears and fires again", () => {
    const first = findNewMessages(null, [alert], []);
    const cleared = findNewMessages(first.seen, [], []);
    expect(findNewMessages(cleared.seen, [alert], []).messages).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { currentQueueItem } from "@/components/nudges/queue-line";
import type { Nudge } from "@/components/nudges/use-nudges";
import { reminderQueueItem } from "@/lib/automation/queue-items";
import type { ReminderDraft } from "@/types";
import { BRIGHTWELL, overdueInvoice } from "../support/summaries";

const invoice = {
  ...overdueInvoice("2026-10-28", 5, BRIGHTWELL),
  amount: { currency: "GBP" as const, value: "600.00" },
};
const REASON = "Suggested firm: 5 days late.";
const stored = reminderQueueItem({ ...invoice, daysLate: 4 }, "Suggested firm: 4 days late.");
const nudge = {
  invoice,
  draft: { invoiceId: invoice.id, reason: REASON } as ReminderDraft,
} as Nudge;

describe("currentQueueItem", () => {
  it("rebuilds a reminder's line from the invoice as it is today", () => {
    const line = currentQueueItem({ ...stored, invoiceId: invoice.id }, [nudge]);
    expect(line.detail).toContain("£600.00, 5 days late.");
    expect(line.detail).not.toContain("4 days");
    expect(line.title).toBe(`Remind ${BRIGHTWELL.name} about ${invoice.number}`);
  });

  it("keeps the stored text when the invoice is not among the nudges", () => {
    const item = { ...stored, invoiceId: "INV2-OTHER" };
    expect(currentQueueItem(item, [nudge])).toBe(item);
  });

  it("leaves a repeat invoice alone", () => {
    const repeat = { ...stored, kind: "repeat" as const, invoiceId: null, repeatId: "r1" };
    expect(currentQueueItem(repeat, [nudge])).toBe(repeat);
  });
});

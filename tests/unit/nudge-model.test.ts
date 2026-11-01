import { describe, expect, it } from "vitest";
import {
  daysLateLabel,
  hasEdits,
  historyLabel,
  replaceEditsQuestion,
  sentMessage,
  sourceNote,
  toneReason,
  wasSentToday,
} from "@/components/nudges/nudge-model";
import { tandemInvoice } from "@/mocks/fixtures";
import type { InvoiceSummary, ReminderDraft, Tone } from "@/types";

describe("nudge model", () => {
  it("labels days late", () => {
    expect(daysLateLabel(1)).toBe("1 day late");
    expect(daysLateLabel(11)).toBe("11 days late");
  });

  it("labels a sent reminder with its tone and its India date", () => {
    expect(historyLabel({ tone: "gentle", sentAt: "2026-10-31T06:00:00Z" })).toBe(
      "Gentle reminder sent 31 Oct",
    );
    // 20:00 UTC on 30 Oct is already 31 Oct in India.
    expect(historyLabel({ tone: "final", sentAt: "2026-10-30T20:00:00Z" })).toBe(
      "Final reminder sent 31 Oct",
    );
  });

  it("tells whether a reminder went out today in India", () => {
    const now = new Date("2026-10-31T09:00:00Z");
    expect(wasSentToday([{ tone: "gentle", sentAt: "2026-10-31T03:00:00Z" }], now)).toBe(true);
    expect(wasSentToday([{ tone: "gentle", sentAt: "2026-10-30T03:00:00Z" }], now)).toBe(false);
    expect(wasSentToday([], now)).toBe(false);
  });

  it("reports the time of sending in India time", () => {
    expect(sentMessage("2026-10-31T15:12:00Z")).toBe(
      "Sent at 8:42 pm. PayPal emailed the client with a Pay now link.",
    );
  });

  it("says whether the AI or a template wrote the draft", () => {
    expect(sourceNote("ai")).toBe("Drafted by Dueline AI. Read and edit before sending.");
    expect(sourceNote("template")).toBe("Template draft (AI unavailable).");
  });

  describe("edits to a draft", () => {
    const drafted = { subject: "A quick reminder", message: "Hello, please pay. Thank you" };

    it("sees no edits in an untouched draft", () => {
      expect(hasEdits(drafted, { ...drafted })).toBe(false);
    });

    it("sees an edit to the subject or to the message", () => {
      expect(hasEdits(drafted, { ...drafted, subject: "Reminder" })).toBe(true);
      expect(hasEdits(drafted, { ...drafted, message: `${drafted.message}!` })).toBe(true);
    });

    it("counts a trailing space as an edit, so nothing the user typed is dropped silently", () => {
      expect(hasEdits(drafted, { ...drafted, subject: `${drafted.subject} ` })).toBe(true);
    });

    it("asks before replacing the edits with the chosen tone", () => {
      expect(replaceEditsQuestion("firm")).toBe("Replace your edits with a Firm draft?");
      expect(replaceEditsQuestion("gentle")).toBe("Replace your edits with a Gentle draft?");
    });

    it("names the language when the new draft is not in English", () => {
      expect(replaceEditsQuestion("firm", "de")).toBe(
        "Replace your edits with a Firm draft in German?",
      );
    });
  });
});

describe("toneReason", () => {
  const lateInvoice = { ...tandemInvoice, daysLate: 3, riskLevel: "late_payer" } as InvoiceSummary;
  const draft = (suggestedTone: Tone): ReminderDraft => ({
    invoiceId: lateInvoice.id,
    tone: suggestedTone,
    suggestedTone,
    language: "en",
    subject: "A quick reminder",
    message: "Please pay when you can.",
    source: "template",
    pending: false,
    history: [],
  });

  it("says the client's record made the suggestion firmer", () => {
    expect(toneReason(lateInvoice, draft("firm"))).toBe(
      `Suggested firm because ${lateInvoice.client.name} is a late payer.`,
    );
  });

  it("says nothing when the days alone give the same tone, or the client is not a late payer", () => {
    expect(toneReason({ ...lateInvoice, daysLate: 25 }, draft("final"))).toBeNull();
    expect(toneReason({ ...lateInvoice, riskLevel: "watch" }, draft("gentle"))).toBeNull();
    expect(toneReason({ ...lateInvoice, riskLevel: null }, draft("gentle"))).toBeNull();
  });
});

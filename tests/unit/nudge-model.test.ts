import { describe, expect, it } from "vitest";
import {
  daysLateLabel,
  hasEdits,
  historyLabel,
  replaceEditsQuestion,
  sentMessage,
  sourceNote,
  sentTodayVia,
} from "@/components/nudges/nudge-model";

describe("nudge model", () => {
  it("labels days late", () => {
    expect(daysLateLabel(1)).toBe("1 day late");
    expect(daysLateLabel(11)).toBe("11 days late");
  });

  it("labels a sent reminder with its tone and its India date", () => {
    expect(
      historyLabel({ tone: "gentle", sentAt: "2026-10-31T06:00:00Z", channel: "paypal" }),
    ).toBe("Gentle reminder sent through PayPal 31 Oct");
    // 20:00 UTC on 30 Oct is already 31 Oct in India.
    expect(historyLabel({ tone: "final", sentAt: "2026-10-30T20:00:00Z", channel: "paypal" })).toBe(
      "Final reminder sent through PayPal 31 Oct",
    );
  });

  it("tells whether a reminder went out today in India, channel by channel", () => {
    const now = new Date("2026-10-31T09:00:00Z");
    const today = [
      { tone: "gentle" as const, sentAt: "2026-10-31T03:00:00Z", channel: "paypal" as const },
    ];
    expect(sentTodayVia(today, "paypal", now)).toBe(true);
    expect(sentTodayVia(today, "email", now)).toBe(false);
    expect(sentTodayVia([{ ...today[0], sentAt: "2026-10-30T03:00:00Z" }], "paypal", now)).toBe(
      false,
    );
    expect(sentTodayVia([], "paypal", now)).toBe(false);
  });

  it("reports the time of sending in India time", () => {
    expect(sentMessage("2026-10-31T15:12:00Z", "paypal")).toBe(
      "Sent at 8:42 pm. PayPal emailed the client its standard reminder with a Pay now button.",
    );
    expect(sentMessage("2026-10-31T15:12:00Z", "email")).toBe(
      "Recorded at 8:42 pm: you sent your message from your own email.",
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

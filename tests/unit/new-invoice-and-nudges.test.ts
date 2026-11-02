import { describe, expect, it } from "vitest";
import { noticePills } from "@/components/invoices/notice-pills";
import { stepHeader } from "@/components/invoices/step-header";
import {
  payTimeLine,
  paypalSentNote,
  sendStates,
  toneOptionLabel,
} from "@/components/nudges/nudge-model";

describe("the new invoice header", () => {
  it("asks for the chat on the first step, with the reassurance", () => {
    expect(stepHeader("paste")).toMatchObject({
      current: 1,
      heading: "Paste what your client wrote.",
    });
    expect(stepHeader("paste")?.intro).toContain(
      "Nothing is sent until you click Create and send.",
    );
  });

  it("asks to check the draft on the second step, with no intro", () => {
    expect(stepHeader("review")).toEqual({ current: 2, heading: "Check the draft", intro: null });
  });

  it("leaves the heading to the result once the invoice is sent", () => {
    expect(stepHeader("sent")).toBeNull();
  });
});

describe("the notices above the draft", () => {
  it("shows what was hidden in green and every warning in amber", () => {
    expect(
      noticePills("We hid 1 email before the AI read the chat", ["Check the due date"]),
    ).toEqual([
      { text: "We hid 1 email before the AI read the chat", tone: "green" },
      { text: "Check the due date", tone: "amber" },
    ]);
  });

  it("shows nothing when there is nothing to say", () => {
    expect(noticePills(null, [])).toEqual([]);
  });
});

describe("a nudge's send panels", () => {
  const NOW = new Date("2026-11-02T09:00:00Z");

  it("names the tone of the PayPal reminder sent today", () => {
    const history = [
      { tone: "gentle" as const, sentAt: "2026-10-30T09:00:00Z", channel: "paypal" as const },
      { tone: "firm" as const, sentAt: "2026-11-02T07:33:00Z", channel: "paypal" as const },
      { tone: "final" as const, sentAt: "2026-11-02T08:00:00Z", channel: "email" as const },
    ];
    expect(paypalSentNote(history, NOW)).toBe("✓ Firm reminder sent through PayPal, 2 Nov");
    expect(paypalSentNote(history.slice(0, 1), NOW)).toBeNull();
    expect(paypalSentNote([], NOW)).toBeNull();
  });

  it("offers each way out until its reminder has gone today", () => {
    expect(sendStates({ paypal: false, email: false })).toEqual({ paypal: "send", email: "send" });
    expect(sendStates({ paypal: true, email: false })).toEqual({ paypal: "sent", email: "send" });
    expect(sendStates({ paypal: false, email: true })).toEqual({ paypal: "send", email: "sent" });
    expect(sendStates({ paypal: true, email: true })).toEqual({ paypal: "sent", email: "sent" });
  });

  it("marks the suggested tone in its label", () => {
    expect(toneOptionLabel("firm", "firm")).toBe("Firm · suggested");
    expect(toneOptionLabel("gentle", "firm")).toBe("Gentle");
  });

  it("says how long the client takes to pay", () => {
    expect(payTimeLine("Okafor & Reyes", { averageDays: 28, onTimePercent: 0, invoices: 3 })).toBe(
      "Okafor & Reyes takes 28 days to pay on average, 0% on time.",
    );
  });
});

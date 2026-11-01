import { describe, expect, it } from "vitest";
import { isCronAuthorised } from "@/lib/automation/cron-auth";
import { buildDigest } from "@/lib/automation/digest";
import { evaluateRateAlerts, describeAlert, describeTriggered } from "@/lib/automation/rate-alerts";
import { nextRepeatDate } from "@/lib/automation/repeat-dates";
import { digestLines } from "@/components/dashboard/digest-lines";
import { BRIGHTWELL, OKAFOR, openInvoice, overdueInvoice, paidInvoice } from "../support/summaries";

describe("nextRepeatDate", () => {
  it("is this month when the day has not come yet", () => {
    expect(nextRepeatDate(15, "2026-11-01")).toBe("2026-11-15");
  });

  it("is next month when the day is today or has passed", () => {
    expect(nextRepeatDate(15, "2026-11-15")).toBe("2026-12-15");
    expect(nextRepeatDate(1, "2026-11-01")).toBe("2026-12-01");
    expect(nextRepeatDate(10, "2026-11-30")).toBe("2026-12-10");
  });

  it("rolls over the end of the year", () => {
    expect(nextRepeatDate(5, "2026-12-28")).toBe("2027-01-05");
    expect(nextRepeatDate(28, "2026-12-28")).toBe("2027-01-28");
  });

  it("handles short months, February and leap years", () => {
    expect(nextRepeatDate(28, "2026-01-31")).toBe("2026-02-28");
    expect(nextRepeatDate(28, "2026-02-28")).toBe("2026-03-28");
    expect(nextRepeatDate(28, "2028-02-10")).toBe("2028-02-28");
    expect(nextRepeatDate(1, "2028-02-29")).toBe("2028-03-01");
  });
});

describe("evaluateRateAlerts", () => {
  const rates = { USD: 96.5, EUR: 99.2, GBP: 126, CAD: 68, AUD: 66 };

  it("triggers an alert whose rate is beyond the line, with the rate that did it", () => {
    const alerts = [
      { currency: "USD", direction: "above", threshold: 96 },
      { currency: "EUR", direction: "below", threshold: 100 },
    ] as const;
    expect(evaluateRateAlerts(alerts, rates)).toEqual([
      { currency: "USD", direction: "above", threshold: 96, rate: 96.5 },
      { currency: "EUR", direction: "below", threshold: 100, rate: 99.2 },
    ]);
  });

  it("leaves out an alert on the wrong side of the line, or exactly on it", () => {
    const alerts = [
      { currency: "USD", direction: "below", threshold: 96 },
      { currency: "GBP", direction: "above", threshold: 126 },
      { currency: "CAD", direction: "below", threshold: 68 },
    ] as const;
    expect(evaluateRateAlerts(alerts, rates)).toEqual([]);
  });

  it("describes alerts in words", () => {
    const alert = { currency: "USD", direction: "above", threshold: 96, rate: 96.5 } as const;
    expect(describeAlert(alert)).toBe("USD above ₹96");
    expect(describeTriggered(alert)).toBe("USD above ₹96: now ₹96.50");
  });
});

describe("isCronAuthorised", () => {
  const secret = "0123456789abcdef0123";

  it("accepts the bearer secret", () => {
    expect(isCronAuthorised(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("refuses a missing, wrong, shorter or longer secret", () => {
    expect(isCronAuthorised(null, secret)).toBe(false);
    expect(isCronAuthorised("Bearer nope", secret)).toBe(false);
    expect(isCronAuthorised(`Bearer ${secret.slice(1)}`, secret)).toBe(false);
    expect(isCronAuthorised(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isCronAuthorised(secret, secret)).toBe(false);
  });

  it("accepts nothing when no secret is configured", () => {
    expect(isCronAuthorised("Bearer ", undefined)).toBe(false);
    expect(isCronAuthorised("Bearer anything", undefined)).toBe(false);
    expect(isCronAuthorised("Bearer ", "")).toBe(false);
  });
});

describe("buildDigest", () => {
  const day = "2026-11-01";
  const justPaid = paidInvoice("2026-10-25", "2026-10-31");
  const longPaid = paidInvoice("2026-09-01", "2026-09-05", BRIGHTWELL);
  const newlyLate = overdueInvoice("2026-10-29", 3);
  const longLate = overdueInvoice("2026-09-20", 42, BRIGHTWELL);
  const dueSoon = { ...openInvoice("2026-11-03"), dueState: "due_soon" as const };
  const later = openInvoice("2026-11-30");

  const digest = buildDigest({
    day,
    invoices: [justPaid, longPaid, newlyLate, longLate, dueSoon, later],
    preparedDrafts: 2,
    rateAlerts: [{ currency: "USD", direction: "above", threshold: 96, rate: 96.4 }],
  });

  it("lists what was paid since yesterday, and nothing older", () => {
    expect(digest.paidSinceYesterday.map(({ invoiceId }) => invoiceId)).toEqual([justPaid.id]);
  });

  it("lists invoices that have just become overdue, not the long overdue ones", () => {
    expect(digest.newlyOverdue.map(({ invoiceId }) => invoiceId)).toEqual([newlyLate.id]);
  });

  it("lists invoices due in the next 3 days", () => {
    expect(digest.dueSoon.map(({ invoiceId }) => invoiceId)).toEqual([dueSoon.id]);
  });

  it("carries the number of drafts and the rate alerts", () => {
    expect(digest.preparedDrafts).toBe(2);
    expect(digest.rateAlerts).toHaveLength(1);
    expect(digest.day).toBe(day);
  });

  it("has empty lists when nothing happened", () => {
    const quiet = buildDigest({ day, invoices: [later], preparedDrafts: 0, rateAlerts: [] });
    expect(quiet).toEqual({
      day,
      paidSinceYesterday: [],
      newlyOverdue: [],
      dueSoon: [],
      preparedDrafts: 0,
      rateAlerts: [],
    });
  });
});

describe("digestLines", () => {
  it("has a line for each thing that happened and none for the rest", () => {
    const digest = buildDigest({
      day: "2026-11-01",
      invoices: [overdueInvoice("2026-10-29", 3, OKAFOR)],
      preparedDrafts: 1,
      rateAlerts: [],
    });
    const lines = digestLines(digest);
    expect(lines.map(({ key }) => key)).toEqual(["overdue", "drafts"]);
    expect(lines[0].text).toContain("Okafor & Reyes");
    expect(lines[1].href).toBe("/nudges");
  });

  it("shortens a long list", () => {
    const many = Array.from({ length: 5 }, () => overdueInvoice("2026-10-30", 2));
    const [line] = digestLines(
      buildDigest({ day: "2026-11-01", invoices: many, preparedDrafts: 0, rateAlerts: [] }),
    );
    expect(line.text.endsWith("and 2 more")).toBe(true);
  });

  it("has no lines on a quiet morning", () => {
    const quiet = buildDigest({
      day: "2026-11-01",
      invoices: [],
      preparedDrafts: 0,
      rateAlerts: [],
    });
    expect(digestLines(quiet)).toEqual([]);
  });
});

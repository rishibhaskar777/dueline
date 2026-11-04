import { describe, expect, it } from "vitest";
import { dueSoonLabel, headsUpSentNote, historyLabel } from "@/components/nudges/nudge-model";
import { layoutDueLine } from "@/components/receivables/due-line-layout";
import { promisedLine } from "@/components/receivables/invoice-status";
import { toForm, validateProfile } from "@/components/profile/profile-form";
import { collapsedLine, promiseDateError, promiseStatus } from "@/components/shared/promise-model";
import { EMPTY_PROFILE, type PaymentPromise } from "@/types";
import { OKAFOR, overdueInvoice, paidInvoice } from "../support/summaries";

const TODAY = "2026-11-04";
const promise = (promisedOn: string, note = ""): PaymentPromise => ({
  promisedOn,
  note,
  createdAt: "2026-11-03T05:00:00.000Z",
});

describe("the collapsed Nudges card", () => {
  it("is one line while the promised date has not passed, today included", () => {
    expect(collapsedLine(promise("2026-11-10"), TODAY)).toBe("Promised for 10 Nov");
    expect(collapsedLine(promise(TODAY), TODAY)).toBe("Promised for 4 Nov");
  });

  it("is a normal card again the day after, and with no promise", () => {
    expect(collapsedLine(promise("2026-11-03"), TODAY)).toBeNull();
    expect(collapsedLine(undefined, TODAY)).toBeNull();
  });

  it("says a missed date is still unpaid", () => {
    expect(promiseStatus(promise("2026-11-03"), TODAY)).toBe("Promised 3 Nov, still unpaid");
  });
});

describe("the promise form", () => {
  it.each([
    ["", "Pick the date the client promised."],
    ["2026-11-03", "Pick a date from today to 60 days ahead."],
    ["2027-01-03", null],
    ["2027-01-04", "Pick a date from today to 60 days ahead."],
    [TODAY, null],
  ])("answers %s with %s", (date, expected) => {
    expect(promiseDateError(date, TODAY)).toBe(expected);
  });
});

describe("a promised date on Home", () => {
  it("is the second line of an unpaid invoice's status", () => {
    const invoice = { ...overdueInvoice("2026-11-01", 3, OKAFOR), promise: promise("2026-11-10") };
    expect(promisedLine(invoice)).toBe("Promised 10 Nov");
    expect(promisedLine(overdueInvoice("2026-11-01", 3, OKAFOR))).toBeNull();
    expect(
      promisedLine({ ...paidInvoice("2026-11-01", "2026-11-03"), promise: promise("2026-11-10") }),
    ).toBeNull();
  });

  it("puts a marker on the due line at the promised date, inside the axis", () => {
    const invoice = { ...overdueInvoice("2026-11-01", 3, OKAFOR), promise: promise("2026-11-10") };
    const [row] = layoutDueLine([invoice], TODAY, false).rows;
    expect(row.promised).not.toBeNull();
    expect(row.promised).toBeGreaterThan(layoutDueLine([invoice], TODAY, false).today);
    expect(row.accessibleName).toContain("promised 10 Nov");
  });

  it("has no marker without a promise, or once the invoice is paid", () => {
    const [plain] = layoutDueLine([overdueInvoice("2026-11-01", 3, OKAFOR)], TODAY, false).rows;
    expect(plain.promised).toBeNull();
    const paid = { ...paidInvoice("2026-11-01", "2026-11-03"), promise: promise("2026-11-10") };
    expect(layoutDueLine([paid], TODAY, false).rows[0].promised).toBeNull();
  });
});

describe("the heads-up on a Nudges card", () => {
  it("says when the invoice is due", () => {
    expect(dueSoonLabel("2026-11-04", TODAY)).toBe("Due today");
    expect(dueSoonLabel("2026-11-05", TODAY)).toBe("Due tomorrow");
    expect(dueSoonLabel("2026-11-07", TODAY)).toBe("Due in 3 days");
  });

  it("says Heads-up sent with the day, in the history and on the card", () => {
    const history = [
      { tone: "heads_up" as const, sentAt: "2026-11-04T06:00:00Z", channel: "email" as const },
    ];
    expect(headsUpSentNote(history)).toBe("Heads-up sent, 4 Nov");
    expect(headsUpSentNote([])).toBeNull();
    expect(historyLabel(history[0])).toBe("Heads-up sent 4 Nov");
  });
});

describe("the heads-up settings of the profile form", () => {
  it("round-trips the switch and the days", () => {
    const form = { ...toForm(EMPTY_PROFILE), sendHeadsUp: false, headsUpDays: "5" };
    expect(validateProfile(form)).toEqual({
      ok: true,
      profile: { ...EMPTY_PROFILE, sendHeadsUp: false, headsUpDays: 5 },
    });
  });

  it.each(["0", "8", "2.5", "", "abc"])("refuses %s days before", (days) => {
    const result = validateProfile({ ...toForm(EMPTY_PROFILE), headsUpDays: days });
    expect(result).toMatchObject({
      ok: false,
      errors: { headsUpDays: "Use a whole number from 1 to 7" },
    });
  });

  it("starts on, three days before", () => {
    expect(EMPTY_PROFILE).toMatchObject({ sendHeadsUp: true, headsUpDays: 3 });
  });
});

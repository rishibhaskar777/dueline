import { describe, expect, it } from "vitest";
import { describeEvent, findNewEvents, relativeTime } from "@/components/receivables/activity-text";
import { activity } from "@/mocks/fixtures";
import type { ActivityEvent } from "@/types";

const NOW = Date.parse("2026-10-30T10:00:00Z");
const TODAY = "2026-10-30";

describe("relativeTime", () => {
  it("counts minutes, hours and days back from now", () => {
    expect(relativeTime("2026-10-30T09:45:00Z", TODAY, NOW)).toBe("15 minutes ago");
    expect(relativeTime("2026-10-30T08:00:00Z", TODAY, NOW)).toBe("2 hours ago");
    expect(relativeTime("2026-10-27T10:00:00Z", TODAY, NOW)).toBe("3 days ago");
    expect(relativeTime("2026-10-29T09:00:00Z", TODAY, NOW)).toBe("yesterday");
  });

  it("says just now for the last minute and for timestamps in the future", () => {
    expect(relativeTime("2026-10-30T09:59:40Z", TODAY, NOW)).toBe("just now");
    expect(relativeTime("2026-10-30T11:00:00Z", TODAY, NOW)).toBe("just now");
  });

  it("counts from the end of the demo date when the clock is not real", () => {
    expect(relativeTime("2026-10-15T11:42:00Z", "2026-10-17", NOW)).toBe("2 days ago");
  });

  it("returns nothing for a timestamp it cannot read", () => {
    expect(relativeTime("not a date", TODAY, NOW)).toBe("");
  });
});

describe("describeEvent", () => {
  it("writes one plain sentence per kind", () => {
    const [paid, viewed, overdue, reminder] = activity;
    expect(describeEvent(paid)).toBe("Halden Coffee Co. paid $450.00");
    expect(describeEvent(viewed)).toBe("Tandem Health viewed invoice INV-0046");
    expect(describeEvent(overdue)).toBe("Invoice INV-0043 to Brightwell Labs is overdue");
    expect(describeEvent(reminder)).toBe("Reminder for invoice INV-0044 sent to Okafor & Reyes");
    expect(describeEvent({ ...paid, kind: "sent" })).toBe(
      "Invoice INV-0042 sent to Halden Coffee Co.",
    );
  });

  it("copes with a payment that has no amount", () => {
    const event: ActivityEvent = { ...activity[0], amount: undefined };
    expect(describeEvent(event)).toBe("Halden Coffee Co. paid");
  });
});

describe("findNewEvents", () => {
  it("returns only events whose id was not seen before", () => {
    expect(findNewEvents(activity.slice(1), activity).map((e) => e.id)).toEqual(["evt-1004"]);
    expect(findNewEvents(activity, activity)).toEqual([]);
  });
});
